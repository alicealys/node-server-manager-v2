const fs        = require('fs')
const path      = require('path')
const sqlite3   = require('sqlite3').verbose()
const Sequelize = require('sequelize')
const instance  = {}

const loadSqliteDatabase = (path) => {
    return new Promise((resolve, reject) => {
        new sqlite3.Database(path, (err) => {
            if (err) {
                reject(err)
                return
            }

            resolve()
        })
    })
}

instance.connect = (config) => {
    return new Promise(async (resolve, reject) => {
        if (!config.database) {
            reject(new Error('Database not set in config'))
            return
        }

        if (!config.database.dialect) {
            reject(new Error('Database dialect not set in config'))
            return
        }

        var sequelize = null

        switch (config.database.dialect.toLowerCase()) {
            case 'sqlite':
                var dbPath = config.database.path
                if (!dbPath) {
                    reject(new Error('Database path not set in config'))
                    return
                }

                dbPath = dbPath || 'database/database.db'
                dbPath = path.join(__dirname, '../../../', dbPath)
                fs.mkdirSync(path.dirname(dbPath), {recursive: true})
                await loadSqliteDatabase(config.database.path)

                sequelize = new Sequelize({
                    host: 'localhost',
                    dialect: 'sqlite',
                    pool: {
                       max: 5,
                       min: 0,
                       idle: 10000
                    },
                    logging: false,
                    storage: config.database.path
                })

                break
            case 'mysql':
            case 'mariadb':
            case 'postgres':
            case 'mssql':
                if (!config.database.name) {
                    reject(new Error('Database name not set in config'))
                    return
                }

                if (!config.database.host) {
                    reject(new Error('Database host not set in config'))
                    return
                }

                if (!config.database.username) {
                    reject(new Error('Database username not set in config'))
                    return
                }

                if (!config.database.password) {
                    reject(new Error('Database password not set in config'))
                    return
                }
            
                sequelize = new Sequelize(
                    config.database.name, 
                    config.database.username, 
                    config.database.password, 
                    {
                        host: config.database.host,
                        dialect: config.database.dialect,
                        pool: {
                            max: 5,
                            min: 0,
                            idle: 10000
                         },
                        logging: false,
                    }
                )

                break
            default:
                reject(new Error('Invalid database dialect'))
                return
        }

        sequelize.authenticate()
        .then(async () => {
            instance.sequelize = sequelize
            instance.models = {}
        
            const names = ['clients', 'connections', 'clientMeta', 'penalties']

            names.forEach(name => {
                instance.models[name] = require(`./models/${name}`)(sequelize, Sequelize)
            })

            await instance.initialize()

            resolve(instance)
        })
        .catch(err => {
            reject(new Error('Database authentication failed: ' + err))
        })
    })
}

instance.initialize = async () => {
    var result = await instance.models.clients.find('__console__')
    if (result) {
        instance.consoleId = result.clientId
        return
    }

    result = await instance.models.clients.add('__console__', ['role_console'])
    await instance.models.connections.add({
        clientId: result.clientId,
        uniqueId: '__console__',
        name: 'Console',
        address: '0.0.0.0'
    })

    instance.consoleId = result.clientId
}

instance.getClient = async (accessor) => {
    if (!accessor || accessor.length == 0) {
        return null
    }

    if (accessor[0] == '@') {
        const clientId = parseInt(accessor.substr(1))
        const result = await instance.models.clients.get(clientId)
        if (result) {
            const connection = await instance.models.connections.getLatest(clientId)
            return {...connection, ...result}
        }

        return result
    } else {
        const result = await instance.models.connections.findByName(accessor, 1)
        if (!result.length) {
            return null
        }

        const client = await instance.models.clients.get(result[0].clientId)
        return {...result[0], ...client}
    }
}

module.exports = instance
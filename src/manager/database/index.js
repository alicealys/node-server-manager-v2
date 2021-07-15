const fs        = require('fs')
const path      = require('path')
const sqlite3   = require('sqlite3').verbose()
const directory = path.join(__dirname, './models')
const Sequelize = require('sequelize')
const instance  = {}

instance.connect = () => {
    return new Promise((resolve, reject) => {
        new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
            var sequelize = new Sequelize({
                host: 'localhost',
                dialect: 'sqlite',
                pool: {
                   max: 5,
                   min: 0,
                   idle: 10000
                },
                logging: false,
                storage: path.join(__dirname, 'database.db')
            })
        
            instance.sequelize = sequelize
            instance.models = {}
        
            fs.readdir(directory, async (err, files) => {
                if (err) {
                    reject(new Error('Unable to scan directory'))
                    return
                }
        
                files.forEach(file => {
                    file = path.join(__dirname, `./models/${file}`)
        
                    const model = require(file)(sequelize, Sequelize)
                    const name = path.basename(file, path.extname(file))
                    instance.models[name] = model
                })

                await instance.initialize()

                resolve(instance)
            })
        })
    })
}

instance.initialize = async () => {
    var result = await instance.models.clients.find('__console__')
    if (result) {
        instance.consoleId = result.consoleId
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
    if (accessor[0] == '@') {
        const clientId = parseInt(accessor.substr(1))
        const result = await instance.models.clients.get(clientId)
        return result
    } else {
        const result = await instance.models.connections.findByName(accessor, 1)
        if (!result.length) {
            return null
        }

        return await instance.models.clients.get(result[0].clientId)
    }
}

module.exports = instance
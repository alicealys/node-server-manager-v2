require('./config-maker')
.then(config => {
    const Server        = require('./server/server')
    const PluginLoader  = require('./server/plugin-loader')
    const Loader        = require('./loader')
    const io            = require('../utils/io')
    const database      = require('./database')
    const fs            = require('fs')
    const path          = require('path')
    const EventEmitter  = require('events')
    
    process.env.locale = config.locale || 'en'
    if (process.env.NODE_ENV != 'production' && process.env.NODE_ENV != 'development') {
        process.env.NODE_ENV = 'production'
    }
    
    const globalConfig = {}
    Object.assign(globalConfig, config)
    delete globalConfig.servers
    
    const servers = []

    if (!fs.existsSync(path.join(__dirname, '../../logs/'))) {
        fs.mkdirSync(path.join(__dirname, '../../logs/'))
    }

    const date = new Date().toISOString()
    const logPath = `./logs/${date.substr(0, date.indexOf('T'))}.log`

    fs.appendFileSync(logPath, '')

    process.on('uncaughtException', (err) => {
        fs.appendFileSync(logPath, '\n')
        fs.appendFileSync(logPath, err.stack.toString())
        fs.appendFileSync(logPath, '\n')

        if (process.env.NODE_ENV == 'development') {
            console.log(`Caught unhandled exception: ${err.stack}`)
        }
    })
    
    console.log('Checking for updates...')
    
    const hash = require('child_process').execSync('git rev-parse HEAD').toString().trim().substr(0, 8)
    const version = '0.1.1'
    const credits = `node-server-manager-v2 v${version} (${hash}) • fed`
    
    const commitId = require('child_process').execSync('git rev-parse HEAD').toString().trim()
    const lastCommitId = require('child_process').execSync('git ls-remote https://github.com/fedddddd/node-server-manager-v2.git HEAD').toString().split(/\s+/g)[0].trim()
    
    io.print(commitId == lastCommitId 
        ? '^2node-server-manager-v2 is up to date^7' 
        : `^3An update is available, run ^4\'git pull\'^3 to update^7`)
    
    io.print(`Running ^4${credits}^7...\n`)
    
    const handleConnectError = (cfg, e) => {
        io.print(`Connection to '^3${cfg.game}^7' server at ^3${cfg.host}:${cfg.port}^7 failed: ^1${e}`)
    }

    const handleError = (cfg, e) => {
        io.print(`Failed to initialize '^3${cfg.game}^7' server at ^3${cfg.host}:${cfg.port}^7: ^1${e}`)
    }
    
    const manager = new EventEmitter()
    manager.config = config
    manager.servers = servers
    manager.database = database
    manager.commands = []
    manager.version = {
        hash,
        version,
        commitId,
        lastCommitId
    }
    Object.defineProperty(manager, 'clients', {
        get: () => {
            const clients = []
            
            for (const server of servers) {
                for (const client of server.clients) {
                    clients.push(client)
                } 
            }
    
            return clients
        }
    })
    manager.getClient = async (accessor) => {
        if (!accessor || accessor.length == 0) {
            return null
        }

        const byId = accessor[0] == '@'
        const clientId = parseInt(accessor.substr(1))

        for (const client of manager.clients) {
            if ((byId && clientId == client.clientId) || (!byId && client.name.match(accessor))) {
                return client
            }
        }

        return await database.getClient(accessor)
    }
    
    const loadServer = (cfg, context) => {
        return new Promise((resolve, reject) => {
            try {
                const server = new Server({...globalConfig, ...cfg}, context)
                servers.push(server)
                resolve()

                const loader = new PluginLoader(server)

                server.connect()
                .then(async () => {
                    await server.start()
                    loader.onLoad()
                    server.loaded = true
                    server.emit('loaded')
                    io.print(`^2Now watching^7 '^3${cfg.game}^7' server (^5${server.hostname}^7) at ^3${cfg.host}:${cfg.port}`)
                })
                .catch((e) => {
                    handleConnectError(cfg, e)
                })
            }
            catch (e) {
                handleError(cfg, e)
            }
        })
    }
    
    (async () => {
        console.log('Connecting to database...')
        database.connect(globalConfig)
        .then(async () => {
            const loader = new Loader(manager)
            loader.onInit()

            process.on('exit', () => {
                loader.onUnload()
            })

            for (const cfg of config.servers) {
                await loadServer(cfg, {database, manager})
            }
        
            loader.onLoad(manager)
        })
        .catch((err) => {
            console.log(`Failed to connect to database: ${err}`)
            console.log('Exiting...')
            process.exit(0)
        })
    })();
})
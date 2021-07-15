const config        = require('../../config/config.json')
const Server        = require('./server/server')
const PluginLoader  = require('./server/plugin-loader')
const Loader        = require('./loader')
const io            = require('../utils/io')
const database      = require('./database')

process.env.locale = config.locale || 'en'

const globalConfig = {}
Object.assign(globalConfig, config)
delete globalConfig.servers

const servers = []

process.on('uncaughtException', (err) => {
    console.log(`Caught unhandled exception: ${err.stack}`)
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

const manager = {
    config,
    servers,
    version: {
        hash,
        version,
        commitId,
        lastCommitId
    },
    get clients() {
        const clients = []
        
        for (const server of servers) {
            for (const client of server.clients) {
                clients.push(client)
            } 
        }

        return clients
    },
}

const loader = new Loader(manager)
loader.onInit()

process.on('exit', () => {
    loader.onUnload()
})

const loadServer = (cfg, context) => {
    return new Promise((resolve, reject) => {
        const server = new Server({...globalConfig, ...cfg}, context)
        servers.push(server)
        
        const loader = new PluginLoader(server)
    
        server.connect()
        .then(() => {
            server.start()
            loader.onLoad()
            io.print(`^2Connected^7 to '^3${cfg.game}^7' server at ^3${cfg.host}:${cfg.port}`)
            resolve()
        })
        .catch((e) => {
            handleConnectError(cfg, e)
            resolve()
        })
    })
}

(async () => {
    await database.connect()

    for (const cfg of config.servers) {
        await loadServer(cfg, {database, manager})
    }

    loader.onLoad(manager)
})();
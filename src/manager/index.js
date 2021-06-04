const config = require('../../config/config.json')
const Server = require('./server/server')
const Loader = require('./loader')

const globalConfig = {}
Object.assign(globalConfig, config)
delete globalConfig.servers

const servers = []

const handleConnectError = (cfg, e) => {
    console.log(`Connection to '${cfg.game}' server at ${cfg.ip}:${cfg.port} failed: ${e}`)
}

config.servers.forEach(async cfg => {
    const server = new Server({...globalConfig, ...cfg})
    servers.push(server)
    
    const loader = new Loader(server)

    var error = null

    server.connect()
    .catch((e) => {
        error = e
        handleConnectError(cfg, e)
    })
    .then(() => {
        if (error) {
            return
        }

        server.start()
        loader.onLoad()
        console.log(`Connected to '${cfg.game}' server at ${cfg.ip}:${cfg.port}`)
    })
})
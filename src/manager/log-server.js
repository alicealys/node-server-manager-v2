require('./config-maker')
.then(async (config) => {
    process.env.locale = 'en'

    const fetch = require('node-fetch')
    const ws    = require('ws')
    const fs    = require('fs')
    const https = require('https')
    const http  = require('http')
    const io    = require('../utils/io')
    
    if (!config.logServer) {
        throw new Error('Log server not set in config')
    }
    
    if (!config.logServer.port) {
        throw new Error('Log server port not set in config')
    }
    
    if (!config.logServer.password) {
        throw new Error('Log server password not set in config')
    }
    
    const password = config.logServer.password
    const port = parseInt(config.logServer.port)
    
    if (config.logServer.ssl) {
        if (!config.logServer.ssl.key) {
            throw new Error('Log server ssl.key set in config')
        }
    
        if (!config.logServer.ssl.cert) {
            throw new Error('Log server ssl.cert set in config')
        }
    
        try {
            var ssl = {
                key: fs.readFileSync(config.logServer.ssl.key),
                cert: fs.readFileSync(config.logServer.ssl.cert),
            }
        }
        catch (e) {
            console.log('Failed to load ssl key & certificate, fallback to http')
        }
    }
    
    const server = ssl
        ? https.createServer(ssl)
        : http.createServer()
    server.listen(port)

    const socket = new ws.Server({server})
    const clients = []
    
    const getParams = (url) => {
        const query = {}

        url.substr(1).split('&').forEach((item) => {
            query[item.split('=')[0]] = item.split('=')[1]
        })

        return query
    }

    socket.on('connection', (conn, req) => {
        const params = getParams(req.url.substr(1))

        if (params.password != password) {
            console.log(`Rejecting connection from ${req.socket.remoteAddress}`)
            conn.close()
            return
        }

        console.log(`Accepting connection from ${req.socket.remoteAddress}`)
        clients.push({
            conn,
            server: params.server
        })
    })

    var externalAddress = null
    const getExternalAddress = async () => {
        if (externalAddress) {
            return externalAddress
        }

        const result = await (await fetch('https://extreme-ip-lookup.com/json')).json()
        externalAddress = result.query
        return externalAddress
    }

    await getExternalAddress()
    
    for (const server of config.servers) {
        const serverName = `${server.host}:${server.port}`
        
        try {
            if (!server.logPath) {
                throw '^1Log path not defined'
            }
    
            if (!fs.existsSync(server.logPath)) {
                throw `Log path '^3${server.logPath}^1' does not exist`
            }

            const log = new (require(`./games/${server.game}/log`))({}, server)

            log.callback = (data) => {
                for (const client of clients) {
                    if (client.server == serverName) {
                        client.conn.send(data)
                    }
                }
            }
    
            io.print(`Url for ^5${serverName}^7: ^3${ssl ? 'wss' : 'ws'}://${externalAddress}:${port}/?password=${password}&server=${serverName}`)
        }
        catch (e) {
            io.print(`Could not start load log server for ^5${serverName}^7: ^1${e}`)
        }
    }

    console.log('')
})
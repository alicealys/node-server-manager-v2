const ws            = require('ws')
const delay         = require('delay')
const EventEmitter  = require('events')
const string        = require('../../../../utils/string')
const io            = require('../../../../utils/io')
const Client        = require('../../../server/client')

class Rcon extends EventEmitter {
    constructor(server, config) {
        super()

        this.server = server
        this.config = config
        this.parser = require(`./parser`)

        this.identifierId = 0
        this.url = `ws://${config.host}:${config.rconPort}/${config.rconPassword}`
        this.connected = false
        this.on('close', this.onDisconnect.bind(this))
        this.on('message', this.onMessage.bind(this))
    }

    async onDisconnect() {
        if (!this.connected) {
            return
        }

        this.connected = false
        this.emit('disconnect')

        io.print(`^1Lost connection^7 to '^3${this.config.game}^7' server (^5${this.server.hostname}^7) at ^3${this.config.host}:${this.config.port}^7, attempting to reconnect...`)
        const tryConnect = () => {
            return new Promise((resolve, reject) => {
                this.connect()
                .then(async () => {
                    const result = await this.command(this.parser.commandTemplates.status)
                    if (!result || !result.match(this.parser.statusHeaderRegex)) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                })
                .catch(() => {
                    resolve(true)
                })
            })
        }

        await delay(5000)
        while (await tryConnect()) {
            await delay(5000)
        }

        this.emit('reconnect')
        io.print(`^2Reconnected^7 to '^3${this.config.game}^7' server (^5${this.server.hostname}^7) at ^3${this.config.host}:${this.config.port}^7`)
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new ws(this.url)

            const onOpen = () => {
                this.removeListener('error', onError)
                this.removeListener('message', onMessage)
                this.socket.onerror = () => {}
                this.connected = true
                resolve()
            }
    
            const onMessage = (msg) => {
                this.emit('message', msg)
            }
    
            const onError = (e) => {
                reject(e)
                this.removeListener('open', onOpen)
                this.removeListener('message', onMessage)
            }

            const onClose = () => {
                this.emit('close')
            }
    
            this.socket.once('error', onError)
            this.socket.once('open', onOpen)
            this.socket.once('close', onClose)
            this.socket.on('message', onMessage)
        })
    }

    async dispatchEvent(event) {
        if (!event || !event.type) {
            return
        }

        switch (event.type) {
            case 'join':
                {
                    const name = event.args[0]
                    const uniqueId = event.args[1]
                    const address = event.args[2].split(':')
    
                    const exists = this.server.clients.find(client => client.uniqueId == uniqueId)
                    if (exists) {
                        return
                    }
    
                    const client = new Client({
                        uniqueId: uniqueId,
                        name: name,
                        slot: uniqueId,
                        server: this.server,
                        address: address[0]
                    })
                    await client.build()
    
                    this.server.clients.push(client)
                    this.server.emit('connect', client)
                }
                break
            case 'disconnect':
                {
                    const uniqueId = event.args[1]
                    const client = this.server.clients.find(client => client.uniqueId == uniqueId)

                    if (!client) {
                        return
                    }

                    client.emit('disconnect')
                    this.server.emit('disconnect', client)
    
                    for (var i = 0; i < this.server.clients.length; i++) {
                        if (this.server.clients[i].id == client.id) {
                            this.server.clients.splice(i, 1)
                        }
                    }
                }
                break
            case 'kick':
                const name = event.args[0]
                const client = this.server.clients.find(client => client.name == name)

                if (!client) {
                    return
                }

                client.emit('disconnect')
                this.server.emit('disconnect', client)

                for (var i = 0; i < this.server.clients.length; i++) {
                    if (this.server.clients[i].id == client.id) {
                        this.server.clients.splice(i, 1)
                    }
                }
                break
        }
    }

    parseEvent(event) {
        for (const eventType in this.parser.eventsRegex) {
            this.parser.eventsRegex[eventType].lastIndex = 0
            const match = this.parser.eventsRegex[eventType].exec(event)

            if (match) {
                this.dispatchEvent({
                    type: eventType,
                    args: match.slice(1)
                })
            }
        }
    }

    onMessage(msg) {
        try {
            msg = JSON.parse(msg)

            switch (msg.Type) {
                case 'Chat':
                    {
                        const message = JSON.parse(msg.Message)
                        const client = this.server.clients.find(client => client.uniqueId == message.UserId)

                        if (!client) {
                            return
                        }
    
                        client.emit('message', message.Message)
                        this.server.emit('message', client, message.Message)
                    }
                    break
                case 'Generic':
                    this.parseEvent(msg.Message)
                    break
            }
        }
        catch (e) {
        }
    }

    async getDvar(name, ignoreOverride = false) {
        name = name.toLowerCase()

        const override = this.parser.dvarOverrides[name]
        if (!ignoreOverride && override) {
            if (!override.get) {
                return
            }

            if (override.get.type == 'function') {
                return await override.get.callback(this)
            } else {
                name = override.get.name
            }
        }

        this.parser.dvarRegex.lastIndex = 0
        const result = await this.command(string.format(this.parser.commandTemplates.getDvar, name))
        const match = this.parser.dvarRegex.exec(result)

        if (result && match) {
            return match[2]
        }

        return false
    }

    async setDvar(name, value) {
        name = name.toLowerCase()

        const override = this.parser.dvarOverrides[name]
        if (!ignoreOverride && override) {
            if (!override.set) {
                return
            }

            if (override.set.type == 'function') {
                return await override.set.callback(this)
            } else {
                name = override.set.name
            }
        }

        const command = string.format(this.parser.commandTemplates.setDvar, name, value)
        return await this.command(command)
    }

    async playerList() {
        const status = await this.command(this.parser.commandTemplates.status)
        const lines = status.split('\n')
        const players = []

        lines.forEach(line => {
            line = line.trim()

            this.parser.statusRegex.lastIndex = 0
            const match = this.parser.statusRegex.exec(line)

            if (match) {
                players.push(this.parser.parseStatus(match))
            }
        })

        return players
    }

    async command(command) {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState != ws.OPEN) {
                resolve(false)
            }

            const timeout = setTimeout(() => {
                resolve(false)
            }, 2000)

            const identifier = this.identifierId++

            const onMessage = (msg) => {
                clearTimeout(timeout)

                try {
                    msg = JSON.parse(msg)

                    if (msg.Identifier == identifier) {
                        this.socket.removeListener('message', onMessage)
                    }
    
                    resolve(msg.Message)
                }
                catch (e) {
                    resolve(false)
                }
            }

            this.socket.on('message', onMessage)
            this.socket.send(JSON.stringify({
                Identifier: identifier,
                Message: command,
                Name: 'command'
            }))
        })
    }
}

module.exports = Rcon
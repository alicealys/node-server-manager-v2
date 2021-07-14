const Client = require('./client')
const EventEmitter = require('events')

class Server extends EventEmitter {
    constructor(config, context) {
        super()
        this.config = config

        this.dvars = {}
        this.commands = []
        this.clients = []
        this.dvars = {}

        this.rcon = new (require(`../games/${config.game}/rcon`))(config)
        this.log = new (require(`../games/${config.game}/log`))(this, config)

        const keys = Object.keys(context)
        keys.forEach(key => {
            this[key] = context[key]
        })
    }

    emit(event, ...args) {
        super.emit('*', event, args)
        super.emit(event, ...args)
    }

    connect() {
        return this.rcon.connect()
    }

    async start() {
        const players = await this.rcon.playerList()

        for (var i = 0; i < players.length; i++) {
            const player = players[i]

            this.clients[i] = new Client(player.id, player.name, player.slot, this)
            await this.clients[i].build()
            this.clients[i].emit('preconnect')
            this.emit('preconnect', this.clients[i])
        }
    }

    broadcast(message) {
        const command = this.rcon.commandTemplates.broadcast(message)
        this.rcon.command(command)
    }
}

module.exports = Server
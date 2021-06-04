const Client = require('./client')
const EventEmitter = require('events')

class Server extends EventEmitter {
    constructor(config) {
        super()
        this.config = config
        this.clients = []
        this.rcon = new (require(`../rcon/${config.game}`))(config)
        this.log = new (require(`../log/${config.game}`))(this, config)
    }

    connect() {
        return this.rcon.connect()
    }

    async start() {
        const players = await this.rcon.playerList()
    
        for (var i = 0; i < players.length; i++) {
            const player = players[i]

            this.clients[i] = new Client(player.id, player.name, player.slot, this)
            this.clients[i].emit('preconnect')
            this.emit('preconnect', this.clients[i])
        }
    }

    broadcast(message) {
        const command = this.rcon.commandTemplates.broadcast(message)
        this.rcon.executeCommand(command)
    }
}

module.exports = Server
const EventEmitter = require('events')

class Client extends EventEmitter {
    constructor(id, name, slot, server) {
        super()
        this.id = id 
        this.name = name
        this.slot = slot
        this.server = server
    }

    tell(message) {
        const command = this.server.rcon.parser.commandTemplates.tell(this, message)
        this.server.rcon.command(command)
    }
}

module.exports = Client
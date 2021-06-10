const EventEmitter = require('events')
const string = require('../../utils/string')

class Client extends EventEmitter {
    constructor(id, name, slot, server) {
        super()
        this.id = id 
        this.name = name
        this.slot = slot
        this.server = server
    }

    tell(message) {
        const command = string.format(this.server.rcon.parser.commandTemplates.tell, this.slot, message)
        this.server.rcon.command(command)
    }
}

module.exports = Client
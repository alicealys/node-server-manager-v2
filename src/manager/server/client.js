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
        if (this.server.rcon.parser.colors) {
            message = this.server.rcon.parser.colors.default + message
            message = message.replace(/\<(.+?)\>/g, (match, index) => {
                match = match.toLowerCase().slice(1, -1)

                return this.server.rcon.parser.colors[match]
                    ? this.server.rcon.parser.colors[match]
                    : ''
            })
        }

        const command = string.format(this.server.rcon.parser.commandTemplates.tell, this.slot, message)
        this.server.rcon.command(command)
    }
}

module.exports = Client
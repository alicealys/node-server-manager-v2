const EventEmitter = require('events')
const string = require('../../utils/string')

class Client extends EventEmitter {
    constructor(fields) {
        super()

        const keys = Object.keys(fields)
        keys.forEach(key => {
            this[key] = fields[key]
        })
    }

    tell(message, ...args) {
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

    async build() {
        const result = await this.server.database.models.clients.add(this.uniqueId)
        const keys = Object.keys(result)
        keys.forEach(key => {
            this[key] = result[key]
        })
        this.roles = JSON.parse(this.roles)
    }
}

module.exports = Client
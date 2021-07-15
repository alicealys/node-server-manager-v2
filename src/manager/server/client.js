const EventEmitter = require('events')
const string = require('../../utils/string')

class Client extends EventEmitter {
    constructor(fields) {
        super()

        this.inGame = true

        const keys = Object.keys(fields)
        keys.forEach(key => {
            this[key] = fields[key]
        })

        this.meta = new Proxy({}, {
            get: (target, name) => {
                return new Promise(async (resolve, reject) => {
                    const result = await this.get(name)
                    resolve(result)
                })
            },
            set: (target, name, value) => {
                return new Promise(async (resolve, reject) => {
                    const result = await this.set(name, value)
                    resolve(result)
                })
            }
        })
    }

    async get(key) {
        const result = await this.server.database.models.clientMeta.get(this.clientId, key)
        return result
    }

    async set(key, value) {
        const result = await this.server.database.models.clientMeta.set(this.clientId, key, value)
        return result
    }

    async tell(message, ...args) {
        if (this.server.rcon.parser.colors) {
            message = this.server.rcon.parser.colors.default + message
            message = message.replace(/\<(.+?)\>/g, (match, index) => {
                const original = match
                match = match.toLowerCase().slice(1, -1)

                return this.server.rcon.parser.colors[match]
                    ? this.server.rcon.parser.colors[match]
                    : original
            })
        }

        const command = string.format(this.server.rcon.parser.commandTemplates.tell, this.slot, message)
        await this.server.rcon.command(command)
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
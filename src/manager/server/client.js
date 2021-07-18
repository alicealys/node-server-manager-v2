const EventEmitter = require('events')
const moment       = require('moment')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')
const penaltyTypes = require('../database/penaltyTypes')

class Client extends EventEmitter {
    constructor(fields) {
        super()

        this.inGame = true
        this.connected = new Date()

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

    async tempBan(originId, reason, duration) {
        this.server.database.models.penalties.add({
            originId: originId,
            targetId: this.clientId,
            type: penaltyTypes.TEMPBAN,
            reason: reason,
            end: Math.floor(new Date() / 1000) + duration
        })

        const durationString = moment.duration(duration * 1000).humanize()
        const message = string.parseColors(this.server.rcon.parser.colors, 
            string.format(
                localization['PENALTIES_TEMPBAN_MSG'],
                reason,
                durationString
            )
        )

        const command = string.format(
            this.server.rcon.parser.commandTemplates.kick, 
            this.slot,
            message
        )

        this.server.emit('penalty', {
            type: penaltyTypes.TEMPBAN, 
            originId: originId, 
            targetId: this.clientId,
            reason, 
            duration
        })

        this.server.manager.emit('penalty', {
            type: penaltyTypes.TEMPBAN,
            originId: originId,
            targetId: this.clientId,
            reason,
            duration
        })

        await this.server.rcon.command(command)
    }

    async ban(originId, reason) {
        this.server.database.models.penalties.add({
            originId: originId,
            targetId: this.clientId,
            type: penaltyTypes.BAN,
            reason: reason
        })

        const message = string.parseColors(
            this.server.rcon.parser.colors, 
            string.format(
                localization['PENALTIES_BAN_MSG'],
                reason
            )
        )

        const command = string.format(
            this.server.rcon.parser.commandTemplates.kick,
            this.slot,
            message
        )

        this.server.emit('penalty', {
            type: penaltyTypes.BAN, 
            originId: originId,
            targetId: this.clientId, 
            reason
        })

        this.server.manager.emit('penalty', {
            type: penaltyTypes.BAN, 
            originId: originId,
            targetId: this.clientId, 
            reason
        })
        
        await this.server.rcon.command(command)
    }

    async kick(originId, reason, raw = false) {
        this.server.database.models.penalties.add({
            originId: originId,
            targetId: this.clientId,
            type: penaltyTypes.KICK,
            reason: reason,
            active: 0
        })

        const message = string.parseColors(
            this.server.rcon.parser.colors,
            raw 
                ? reason
                : string.format(
                    localization['PENALTIES_KICK_MSG'],
                    reason
                )
        )

        const command = string.format(
            this.server.rcon.parser.commandTemplates.kick,
            this.slot,
            message
        )

        this.server.emit('penalty', {
            type: penaltyTypes.KICK, 
            originId: originId,
            targetId: this.clientId, 
            reason
        })

        this.server.manager.emit('penalty', {
            type: penaltyTypes.KICK, 
            originId: originId,
            targetId: this.clientId, 
            reason
        })

        await this.server.rcon.command(command)
    }

    async tell(message) {
        message = string.parseColors(this.server.rcon.parser.colors, message)
        const command = string.format(this.server.rcon.parser.commandTemplates.tell, this.slot, message)
        await this.server.rcon.command(command)
    }

    async build() {
        const result = await this.server.database.models.clients.add(this.uniqueId)
        const keys = Object.keys(result)
        keys.forEach(key => {
            this[key] = result[key]
        })
    }
}

module.exports = Client
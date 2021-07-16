const Client       = require('./client')
const EventEmitter = require('events')
const fs           = require('fs')
const string       = require('../../utils/string')

class Server extends EventEmitter {
    constructor(config, context) {
        super()
        this.config = config
        this.loaded = false

        this.commands = []
        this.clients = []
        this.dvars = {}

        if (!fs.existsSync(config.logPath)) {
            throw new Error('Log path does not exist')
        }

        this.rcon = new (require(`../games/${config.game}/rcon`))(this, config)
        this.log = new (require(`../games/${config.game}/log`))(this, config)

        const keys = Object.keys(context)
        keys.forEach(key => {
            this[key] = context[key]
        })
    }

    addCommand(command) {
        for (var i = 0; i < this.commands.length; i++) {
            if (this.commands[i].name == command.name) {
                this.commands.splice(i, 1)
            }
        }

        for (var i = 0; i < this.manager.commands.length; i++) {
            if (this.manager.commands[i].name == command.name) {
                this.manager.commands.splice(i, 1)
            }
        }

        this.commands.push(command)
        this.manager.commands.push(command)

        this.emit('updated_commands')
        this.manager.emit('updated_commands')
    }

    emit(event, ...args) {
        super.emit('*', event, args)
        super.emit(event, ...args)
    }

    connect() {
        return this.rcon.connect()
    }

    async start() {
        this.dvars['sv_hostname'] = await this.rcon.getDvar('sv_hostname')
        this.dvars['sv_maxclients'] = parseInt(await this.rcon.getDvar('sv_maxclients'))
        this.dvars['mapname'] = await this.rcon.getDvar('mapname')
        this.dvars['g_gametype'] = await this.rcon.getDvar('g_gametype')
        this.dvars['version'] = await this.rcon.getDvar('version')

        this.hostname = this.dvars['sv_hostname']
        this.maxClients = this.dvars['sv_maxclients']
        this.mapname = this.dvars['mapname']

        if (!this.hostname) {
            throw new Error('Unable to get server dvars')
        }

        const players = await this.rcon.playerList()

        for (var i = 0; i < players.length; i++) {
            const player = players[i]

            this.clients[i] = new Client({...player, ...{server: this}})
            await this.clients[i].build()

            this.clients[i].emit('preconnect')
            this.emit('preconnect', this.clients[i])
        }
    }

    broadcast(message) {
        this.rcon.command(string.format(this.rcon.parser.commandTemplates.say, message))
    }
}

module.exports = Server
const path         = require('path')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')
const rl           = require('serverline')

const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

rl.init({
    prompt: '\x1b[34m[nsm²] > \x1b[0m'
})

var manager = null

const consoleCommands = {
    'quit': () => {
        process.exit(0)
    },
    'clear': () => {
        process.stdout.write('\u001B[2J\u001B[0;0f')
    },
    'status': () => {
        for (const server of manager.servers.filter(server => server.loaded)) {
            io.print(string.format(localization['CMD_STATUS_FORMAT'],
                server.hostname,
                server.config.game,
                server.config.host,
                server.config.port,
                server.clients.length,
                server.maxClients,
                server.mapname || 'none'
            ))
        }
    },
    'list': () => {
        const servers = manager.servers.filter(server => server.loaded)
        const totalClients = manager.clients.length
        const totalServers = servers.length
        const totalMaxClients = servers.reduce((total, server) => total + server.maxClients, 0)

        io.print(string.format(localization['CMD_LIST_TOTAL'],totalServers, totalClients, totalMaxClients))

        var o = 0
        for (const server of servers) {
            const serverBranch = o < servers.length - 1 ? '├───' : '└───'
            io.print(string.format(localization['CMD_LIST_SERVER'], serverBranch, server.hostname))

            var i = 0
            for (const client of server.clients) {
                const branch = i++ < server.clients.length - 1 ? '├───' : '└───'
                const mainBranch = o < servers.length - 1 ? '│' : ' '
                const time = new Date(new Date() - client.connected).toISOString().substr(11, 8)

                io.print(string.format(localization['CMD_LIST_PLAYER'], mainBranch, branch, client.name, client.clientId, time, client.uniqueId))
            }

            o++
        }
    }
}

var commands = {...consoleCommands}

rl.setCompletion(Object.keys(consoleCommands))

rl.on('line', (cmd) => {
    if (cmd.length == 0) {
        return
    }

    if (cmd.startsWith(config.commandPrefix)) {
        cmd = cmd.substr(config.commandPrefix.length)
    }

    const args = cmd.trim().split(/\s+/g)
    const name = args[0]

    args.join = (index) => {
        var buffer = ""
        for (var i = index; i < args.length; i++) {
            buffer += args[i]
            if (i < args.length - 1) {
                buffer += " "
            }
        }

        return buffer
    }

    if (!commands[name]) {
        io.print(parseColors(string.format(localization['CMD_COMMAND_NOT_FOUND'], `${config.commandPrefix}help`)))
        return
    }
    
    commands[name](args)
    return
})

const colors = {
    'white': '^7',
    'red': '^1',
    'green': '^2',
    'yellow': '^3',
    'blue': '^5',
    'purple': '^6',
    'default': '^7',
}

const parseColors = (message) => {
    message = colors.default + message + colors.default
    return message.replace(/\<(.+?)\>/g, (match, index) => {
        const original = match
        match = match.toLowerCase().slice(1, -1)

        return colors[match]
            ? colors[match]
            : original
    })
}

const addServerCommands = (server) => {
    for (const cmd of server.commands) {
        if (cmd.inGame) {
            continue
        }

        const callback = async (args) => {
            const client = {
                clientId: server.database.consoleId,
                roles: ['role_console'],
                server: server,
                inGame: false,
                tell: (msg) => {
                    io.print(parseColors(msg.trim()))
                }
            }

            await cmd.execute(client, args)
        }

        commands[cmd.name] = callback
        if (cmd.alias) {
            commands[cmd.alias] = callback
        }

        commands = {...commands, ...consoleCommands}
        
        rl.setCompletion(Object.keys(commands))
    }
}

module.exports = {
    onLoad: (_manager) => {
        manager = _manager

        addServerCommands(manager)
        manager.on('updated_commands', () => {
            addServerCommands(manager)
        })
    }
}
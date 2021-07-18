const path         = require('path')
const humanize     = require('humanize-duration')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')
const rl           = require('serverline')
const commanUtils  = require('../server/command')
const asciichart   = require('asciichart')

const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

rl.init({
    prompt: '\x1b[34m[nsm²] > \x1b[0m'
})

function chunkArray(arr, len) {
    var chunks = []
    var i = 0
    var n = arr.length

    while (i < n) {
        chunks.push(arr.slice(i, i += len))
    }

    return chunks
}

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
    'graph': (args) => {
        const selector = args.join(1)
        const servers = manager.servers.filter(server => server.loaded)
        var server = null

        if (Number.isInteger(parseInt(selector))) {
            server = servers[parseInt(selector)]
        } else {
            server = servers.find(server => server.hostname.toLowerCase().match(selector.toLowerCase()))
        }

        if (!server) {
            console.log(localization['CMD_SERVER_NOT_FOUND'])
            return
        }

        const count = Math.max(10, Math.min(200, (parseInt(args[2]) || 60)))

        const players = new Array(count).fill(0)
        const uptime = new Array(count).fill(0)

        for (const snapshot of server.snapshots) {
            players.shift()
            uptime.shift()
            players.push(snapshot.clients.length)
            uptime.push(snapshot.uptime)
        } 

        const snapshotInterval = (config.snapshotInterval * 1000 || 5 * 60 * 1000) * count
        const humanizedInterval = humanize(snapshotInterval, {language: process.env.locale})

        io.print(string.format(localization['CMD_GRAPH_PLAYER_HISTORY'], server.hostname, humanizedInterval))
        console.log(asciichart.plot(players, {
            offset:  4,
            colors: [asciichart.blue],
            padding: '   ',
            max: server.maxClients,
            min: 0,
            height:  10,
            format: (x, i) => { 
                return ('   ' + x.toFixed(0)).slice(-3) 
            }
        }), '\n')

        const currentUptime = server.getUptime()
        var color = null
        if (server.online && currentUptime >= 80) {
            color = asciichart.green
        } else if (server.online && currentUptime < 80 && currentUptime >= 60) {
            color = asciichart.yellow
        } else {
            color = asciichart.red
        }

        io.print(string.format(localization['CMD_GRAPH_UPTIME_HISTORY'], server.hostname, humanizedInterval))
        console.log(asciichart.plot(uptime, {
            offset:  4,
            colors: [color],
            padding: '   ',
            max: 100,
            min: 0,
            height:  10,
            format: (x, i) => { 
                return ('   ' + x.toFixed(0)).slice(-3) 
            }
        }))
    },
    'tree': () => {
        const servers = manager.servers.filter(server => server.loaded)
        const offlineServers = servers.filter(server => !server.online)
        const totalClients = manager.clients.length
        const totalServers = servers.length
        const totalMaxClients = servers.reduce((total, server) => total + server.maxClients, 0)

        io.print(string.format(localization['CMD_LIST_TOTAL'], totalServers, offlineServers.length, totalClients, totalMaxClients))

        var o = 0
        for (const server of servers) {
            const serverBranch = o < servers.length - 1 ? '├───' : '└───'
            const status = server.online ? localization['CMD_LIST_SERVER_ONLINE'] : localization['CMD_LIST_SERVER_OFFLINE']
            var uptime = server.getUptime().toFixed(2)
            if (uptime >= 80) {
                uptime = '^2' + uptime
            } else if (uptime < 80 && uptime >= 60) {
                uptime = '^3' + uptime
            } else {
                uptime = '^1' + uptime
            }

            io.print(string.format(localization['CMD_LIST_SERVER'], serverBranch, server.hostname, status, uptime, server.clients.length, server.maxClients))

            var i = 0
            for (const client of server.clients) {
                const branch = i++ < server.clients.length - 1 ? '├───' : '└───'
                const mainBranch = o < servers.length - 1 ? '│' : ' '
                const time = new Date(new Date() - client.connected).toISOString().substr(11, 8)
                const role = commanUtils.getRole(client.roles)
                const roleName = parseColors(role.color ? `<${role.color}>${role.name}<default>` : role.name)

                io.print(string.format(localization['CMD_LIST_PLAYER'], mainBranch, branch, client.name, client.clientId, roleName, time, client.uniqueId))
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
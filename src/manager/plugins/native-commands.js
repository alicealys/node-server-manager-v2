const commandUtils = require('../server/command')
const delay        = require('delay')
const localization = require('../../utils/localization')
const string       = require('../../utils/string')
const array        = require('../../utils/array')

const plugin = {
    onMessage: (client, message) => {
    },
    onConnect: (client) => {
    },
    onPreconnect: (client) => {
    },
    onDisconnect: (client) => {
    },
    onEvent: (event, args) => {
    },
    onLoad: (server) => {
        const database = server.database

        server.addCommand(
            new commandUtils.CommandBuilder()
            .setName('find')
            .setMinArgs(1)
            .setPermission('query.findclient')
            .setCallback(async (client, args) => {
                const name = args.join(1)
                const result = await database.models.connections.findByName(name, 10)
                
                for (var i = 0; i < result.length; i++) {
                    await client.tell(string.format(localization['CMD_FIND_RESULT'], result[i].name, result[i].clientId, result[i].date))
                    await delay(500)
                }
            })
        )

        server.addCommand(
            new commandUtils.CommandBuilder()
            .setName('help')
            .setPermission('user.help')
            .setCallback(async (client, args) => {
                const role = commandUtils.getRole(client.roles)
                const commands = server.commands.filter(command => {
                    return commandUtils.hasPermission(role, command.permission)
                })

                const chunks = array.chunk(commands, 4)
                var page = 0
                if (args.length > 1 && !Number.isInteger(parseInt(args[1]))) {
                    const commandName = args[1].toLowerCase()
                    const command = commands.find(command => command.name.startsWith(commandName))
                    if (!command) {
                        client.tell(string.format(localization['CMD_COMMAND_NOT_FOUND']))
                        return
                    }

                    client.tell(string.format(localization['CMD_COMMAND_DESCRIPTION'], command.getDescription(), command.getUsage()))

                    return
                } else if (args.length > 1) {
                    page = Math.max(0, Math.min(parseInt(args[1]) - 1, chunks.length - 1))
                }

                await client.tell(string.format(localization['CMD_HELP_PAGE_FORMAT'], page + 1, chunks.length))
                for (var i = 0; i < chunks[page].length; i++) {
                    client.tell(string.format(localization['CMD_COMMAND_DESCRIPTION'], chunks[page][i].getDescription(), chunks[page][i].getUsage()))
                    await delay(500)
                }
            })
        )
    }
}

module.exports = plugin
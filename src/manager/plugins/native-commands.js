const commandUtils = require('../server/command')
const delay        = require('delay')
const localization = require('../../utils/localization')
const string       = require('../../utils/string')
const array        = require('../../utils/array')
const io           = require('../../utils/io')
const path         = require('path')

const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

const plugin = {
    onLoad: async (server) => {
        const database = server.database

        server.addCommand(
            new commandUtils.CommandBuilder()
            .setName('find')
            .setAlias('f')
            .setMinArgs(1)
            .setPermission('query.findclient')
            .setCallback(async (client, args, command) => {
                const name = args.join(1).replace(new RegExp('%', 'g'), '')
                if (!name.length) {
                    command.missingArguments(client)
                    return
                }

                const result = await database.models.connections.findByName(name, client.inGame ? 50 : 10)
                
                if (!result.length) {
                    client.tell(localization['CMD_FIND_NO_RESULTS'])
                }

                for (var i = 0; i < result.length; i++) {
                    const resultClient = await database.models.clients.get(result[i].clientId)
                    const role = commandUtils.getRole(JSON.parse(resultClient.roles))
                    const roleName = role.color ? `<${role.color}>${role.name}<default>` : role.name

                    await client.tell(string.format(localization['CMD_FIND_RESULT'], result[i].name, result[i].clientId, roleName, result[i].date))
                    client.inGame && await delay(500)
                }
            })
        )

        server.addCommand(
            new commandUtils.CommandBuilder()
            .setName('help')
            .setAlias('h')
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
                        client.tell(string.format(localization['CMD_COMMAND_NOT_FOUND'], `${config.commandPrefix}help`))
                        return
                    }

                    client.tell(string.format(localization['CMD_COMMAND_DESCRIPTION'], 
                        command.name,
                        command.alias ? ` (${command.alias})` : '',
                        command.getDescription(),
                        command.getUsage()
                    ))

                    return
                } else if (args.length > 1) {
                    page = Math.max(0, Math.min(parseInt(args[1]) - 1, chunks.length - 1))
                }

                await client.tell(string.format(localization['CMD_HELP_PAGE_FORMAT'], page + 1, chunks.length))
                for (var i = 0; i < chunks[page].length; i++) {
                    client.tell(string.format(
                        localization['CMD_COMMAND_DESCRIPTION'], 
                        chunks[page][i].name,
                        chunks[page][i].alias ? ` (${chunks[page][i].alias})` : '',
                        chunks[page][i].getDescription(),
                        chunks[page][i].getUsage()
                    ))

                    client.inGame && await delay(500)
                }
            })
        )

        server.addCommand(
            new commandUtils.CommandBuilder()
            .setName('addrole')
            .setAlias('ar')
            .setPermission('managment.addrole')
            .setMinArgs(2)
            .setCallback(async (client, args) => {
                const roleName = args[1].toLowerCase()
                const accessor = args.join(2)

                const found = await database.getClient(accessor)
                if (!found) {
                    client.tell(localization['CMD_FIND_NO_RESULTS'])
                    return
                }

                found.roles = JSON.parse(found.roles)

                const roles = commandUtils.getRoles()
                const role = roles.find(role => role.id.toLowerCase() == roleName || role.name.toLowerCase() == roleName)

                const currentRole = commandUtils.getRole(client.roles)

                const target = server.manager.clients.find(client => client.clientId == found.clientId)
                if (target) {
                    target.roles.push(role.id)
                }

                if (currentRole.index >= role.index) {
                    client.tell(localization['CMD_ADDROLE_HIERARCHY_ERROR'])
                    return
                }

                if (!role) {
                    client.tell(localization['CMD_ADDROLE_NOT_FOUND'])
                    return
                }

                if (found.roles.find(_role => _role.toLowerCase() == role.id.toLowerCase() || _role.toLowerCase() == role.name.toLowerCase())) {
                    client.tell(localization['CMD_ADDROLE_ALREADY_SET'])
                    return
                }

                database.models.clients.addRole(found.clientId, role.id)
            })
        )
    }
}

module.exports = plugin
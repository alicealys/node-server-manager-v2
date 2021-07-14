const commandUtils = require('../server/command')
const delay        = require('delay')

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

        server.commands.push(
            new commandUtils.CommandBuilder()
            .setName('find')
            .setPermission('query.findclient')
            .setCallback(async (client, args) => {
                const result = await database.models.connections.findByName(args.join(1))
                console.log(result)

            })
        )
    }
}

module.exports = plugin
const path = require('path')
const io   = require('../../utils/io')

const config = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

const component = {}

component.onInit = (server) => {
    server.commands.push({
        name: 'test',
        execute: (client, args) => {
            client.tell('Hello world!')
        }
    })

    server.on('message', (client, message) => {
        const prefix = config.current.commandPrefix

        if (!config.current.commandPrefix || !message.startsWith(prefix)) {
            return
        }

        const args = message.substr(prefix.length).split(/\s+/g)
        const name = args[0].toLowerCase()
        const command = server.commands.find(command => command.name == name || command.alias == name)
        if (command) {
            command.execute(client, args)
        }
    })
}

module.exports = component
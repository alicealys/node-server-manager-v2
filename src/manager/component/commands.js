const path         = require('path')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')
const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

module.exports = {
    onLoad: (manager) => {
        manager.servers.forEach(server => {
            server.on('message', (client, message) => {
                console.log(message)

                const prefix = config.current.commandPrefix
        
                if (!config.current.commandPrefix || !message.startsWith(prefix)) {
                    return
                }
        
                const args = message.substr(prefix.length).split(/\s+/g)
                const name = args[0].toLowerCase()
                const command = server.commands.find(command => command.name == name || command.alias == name)
                if (!command) {
                    client.tell(string.format(localization['CMD_COMMAND_NOT_FOUND'], `${prefix}help`))
                    return
                }

                command.execute(client, args)
            })
        })
    }
}
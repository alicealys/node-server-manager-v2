const string = require('../../../../utils/string')

module.exports = {
    commandTemplates: {
        status: 'status',
        tell: 'say [{0}] {1}',
        say: 'say {0}',
        kick: 'kick {0} "{1}"',
        setDvar: '{0} "{1}"',
        getDvar: '{0}'
    },
    dvarOverrides: {
        'sv_maxclients': {
            get: {
                name: 'server.maxplayers'
            },
            set: {
                name: 'server.maxplayers'
            }
        },
        'mapname': {
            get: {
                name: 'server.level'
            },
            set: {
                name: 'server.level'
            }
        },
        'sv_hostname': {
            get: {
                name: 'server.hostname'
            },
            set: {
                name: 'server.hostname'
            }
        },
        'g_gametype': {
            get: {
                name: 'server.level'
            },
            set: {
                name: 'server.level'
            }
        },
        'version': {
            get: {
                type: 'function',
                callback: async (rcon) => {
                    const result = await rcon.command(string.format(rcon.parser.commandTemplates.getDvar, 'version'))
                    return result
                }
            }
        },
    },
    colors: {
        'white': '<color=white>',
        'red': '<color=#ff3131>',
        'green': '<color=#86c000>',
        'yellow': '<color=#ffad22>',
        'blue': '<color=#20c5ff>',
        'purple': '<color=#9750dd>',
        'default': '<color=white>',
    },
    statusRegex: /^(\d+) +"(.+)" +(\d+) +(.+s) +(\d+\.\d+.\d+.\d+:\d+) +(\d+\.\d+) +(\d+)$/g,
    dvarRegex: /(.+)\: +"(.+)"/g,
    statusHeaderRegex: /id +name +ping +connected +addr +owner +violation +kicks/g,
    eventsRegex: {
        'join': /^(.+) with steamid (\d+) joined from ip +(\d+\.\d+.\d+.\d+:\d+)$/g,
        'kick': /^Kicked: (.+)$/g,
        'disconnect': /^(\d+\.\d+.\d+.\d+:\d+)\/(\d+)\/(.+) disconnecting: (.+)$/g
    },
    parseStatus: (match) => {
        const address = match[5].split(':')

        return {
            name: match[2],
            uniqueId: match[1],
            time: match[4],
            ping: parseInt(match[3]),
            address: address[0],
            port: address[1],
            slot: match[1]
        }
    }
}
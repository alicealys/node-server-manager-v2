const string     = require('../../../../utils/string')
const steamUtils = require('../../../../utils/steam')

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
        'g_gametype': {
            get: {
                name: 'game_type'
            },
            set: {
                name: 'game_type'
            }
        },
        'sv_hostname': {
            get: {
                name: 'hostname'
            },
            set: {
                name: 'hostname'
            }
        },
        'sv_maxclients': {
            get: {
                type: 'function',
                callback: async (rcon) => {
                    const status = await rcon.command(rcon.parser.commandTemplates.status)
                    const split = status.split('\n')

                    for (const line of split) {
                        const match = rcon.parser.playersRegex.exec(line)
                        if (match) {
                            return match[3]
                        }
                    }
                }
            }
        },
        'mapname': {
            get: {
                type: 'function',
                callback: async (rcon) => {
                    const result = await rcon.command(string.format(rcon.parser.commandTemplates.getDvar, 'mapname'))
                    const match = rcon.parser.dvarRegex.exec(result)

                    if (result && match) {
                        return match[2].split('.')[0]
                    }
            
                    return false
                }
            }
        }
    },
    colors: {
        'white': '\x01',
        'red': '\x07',
        'green': '\x06',
        'yellow': '\x10',
        'blue': '\x0B',
        'purple': '\x0D',
        'default': '\x01',
    },
    statusRegex: /^# +(\d+)(?: +|)(\d+|) +"(.+)" +(\S+) +(\d+:\d+) +(\d+) +(\d+) +(\S+)(?: +|)(\d+|) +(\d+\.\d+.\d+.\d+:\d+)$/g,
    statusRegexBot: /^# +(\d+) +"(.+)" +(\S+) +(\S+)(?: +|)(\d+|)$/g,
    dvarRegex: /"(.+)" = "(.+)" (?:\( def. "(.*)" \))?(?: |\w|\\n|\n|) +- (.+)/g,
    playersRegex: /players *: +(\d)+ humans, (\d)+ bots \((\d+).+/g,
    parseBotStatus: (match) => {
        return {
            name: match[2],
            uniqueId: match[2],
            slot: parseInt(match[1]),
            address: '0.0.0.0'
        }
    },
    parseStatus: (match) => {
        const address = match[10].split(':')

        return {
            name: match[3],
            uniqueId: steamUtils.toSteamID64(match[4]),
            time: match[5],
            ping: parseInt(match[6]),
            address: address[0],
            port: address[1],
            slot: parseInt(match[1])
        }
    }
}
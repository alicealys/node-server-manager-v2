const path     = require('path')
const fs       = require('fs')
const io       = require('../utils/io')

if (fs.existsSync(path.join(__dirname, '../../config/config.json'))) {
    module.exports = new Promise((resolve, reject) => {
        resolve(require('../../config/config.json'))
    })
    return
}

const dialects  = ['sqlite', 'mariadb', 'postgres', 'mysql', 'mssql']
const gamenames = fs.readdirSync(path.join(__dirname, '/games/call-of-duty/rcon/parsers')).map(x => x.split('.')[0])
const games     = fs.readdirSync(path.join(__dirname, '/games/'))

const config    = {database: {}, servers: []}

var configFinished = false
var serverIndex = -1

const questions = [
    {
        text: `Database ^6dialect^7 ([^3${dialects.join(', ')}^7] default: ^5sqlite^7): `,
        callback: (value) => {
            value = value || 'sqlite'
            value = value.toLowerCase()

            if (!dialects.includes(value)) {
                console.log('Dialect not supported')
                return false
            }

            config.database.dialect = value
            return true
        }
    },
    {
        text: `Database ^6path^7 (default: ^5'database/database.db'^7): `,
        show: () => {
            return config.database.dialect == 'sqlite'
        },
        callback: (value) => {
            value = value || 'database/database.db'
            config.database.path = value
            return true
        }
    },
    {
        text: `Database ^6host^7: `,
        show: () => {
            return config.database.dialect != 'sqlite'
        },
        callback: (value) => {
            if (!value) {
                return false
            }
        
            config.database.host = value
            return true
        }
    },
    {
        text: `Database ^6username^7: `,
        show: () => {
            return config.database.dialect != 'sqlite'
        },
        callback: (value) => {
            if (!value) {
                return false
            }

            config.database.username = value
            return true
        }
    },
    {
        text: `Database ^6password^7: `,
        hidden: true,
        show: () => {
            return config.database.dialect != 'sqlite'
        },
        callback: (value) => {
            if (!value) {
                return false
            }

            config.database.password = value
            return true
        }
    },
    {
        text: `Database ^6name^7: `,
        show: () => {
            return config.database.dialect != 'sqlite'
        },
        callback: (value) => {
            if (!value) {
                return false
            }

            config.database.name = value
            return true
        }
    },
    {
        text: '^6Command prefix^7 (default: ^5!^7): ',
        callback: (value) => {
            value = value || '!'
            config.commandPrefix = '!'
            return true
        }
    },
    {
        text: 'Server ^6host^7 (default: ^5localhost^7): ',
        callback: (value) => {
            serverIndex++
            config.servers.push({})

            value = value || 'localhost'
            config.servers[serverIndex].host = value
            return true
        }
    },
    {
        text: 'Server ^6port^7 (^3[0-65536]^7): ',
        callback: (value) => {
            if (!value) {
                return false
            }

            value = parseInt(value)
            if (!Number.isInteger(value) || value < 0 || value > 65536) {
                console.log('Invalid port value')
                return false
            }

            config.servers[serverIndex].port = parseInt(value)
            return true
        }
    },
    {
        text: 'Server ^6rcon port^7 (default: ^5[server port]^7): ',
        callback: (value) => {
            if (value) {
                value = parseInt(value)
                if (!Number.isInteger(value) || value < 0 || value > 65536) {
                    console.log('Invalid port value')
                    return false
                }
            }

            value = value || config.servers[serverIndex].port
            config.servers[serverIndex].rconPort = parseInt(value)
            return true
        }
    },
    {
        text: 'Server ^6rcon password^7: ',
        hidden: true,
        callback: (value) => {
            if (!value) {
                return false
            }

            config.servers[serverIndex].rconPassword = value
            return true
        }
    },
    {
        text: 'Server ^6log path^7 (^2folder path for source games^7): ',
        callback: (value) => {
            if (!value) {
                return false
            }

            config.servers[serverIndex].logPath = value
            return true
        }
    },
    {
        text: `Server ^6game^7 ([^3${games.join(', ')}^7]): `,
        callback: (value) => {
            if (!value) {
                return false
            }

            value = value.toLowerCase()

            if (!games.includes(value)) {
                console.log('Invalid game')
                return false
            }

            config.servers[serverIndex].game = value
            return true
        }
    },
    {
        text: `Server ^6gamename^7 ([^3${gamenames.join(', ')}^7]): `,
        show: () => {
            return config.servers[serverIndex].game == 'call-of-duty'
        },
        callback: (value) => {
            if (!value) {
                return false
            }

            if (!gamenames.includes(value.toUpperCase())) {
                console.log('Invalid gamename')
                return false
            }

            value = value.toUpperCase()

            config.servers[serverIndex].gamename = value
            return true
        }
    },
    {
        text: `Add another server? [^2y^7/^1n^7]: `,
        callback: (value, next) => {
            if (!value) {
                return false
            }

            value = value.toLowerCase()
            const yes = value.startsWith('y')
            const no = value.startsWith('n')
            if (!yes && !no) {
                return false
            }

            configFinished = !yes

            if (yes) {
                next(1)
            }

            return true
        }
    }
]

module.exports = new Promise((resolve, reject) => {
    const readline = require('readline')

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    rl._writeToOutput = (string) => {
        if (string.includes('\r')) {
            rl.muted = false
        }

        rl.output.write(rl.muted ? '*' : string)
    }

    const askQuestion = (index) => {
        var question = questions[index]

        if (question.show != undefined && !question.show()) {
            askQuestion(index + 1)
            return
        }

        rl.question(io.formatColors(question.text), (string) => {
            string = string.trim().length > 0 ? string : null

            var nextIndex = index + 1
            const next = (_index) => {
                nextIndex = _index
            }

            const result = question.callback(string, next)
            if (result && nextIndex >= questions.length) {
                rl.close()
                return
            }
            
            result
                ? askQuestion(nextIndex)
                : askQuestion(index)
        })

        if (question.hidden) {
            rl.muted = true
        }
    }

    askQuestion(0)

    rl.on('close', () => {
        if (!configFinished) {
            console.log('\nConfiguration aborted, exiting')
            process.exit(0)
        }

        fs.writeFile(path.join(__dirname, '../../config/config.json'), JSON.stringify(config, null, 4), () => {
            console.log('Configuration saved')
            resolve(config)
        })
    })
})
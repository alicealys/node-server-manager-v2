const path         = require('path')
const fs           = require('fs')

if (fs.existsSync(path.join(__dirname, '../../config/config.json'))) {
    module.exports = new Promise((resolve, reject) => {
        resolve(require('../../config/config.json'))
    })
    return
}

var configFinished = false
var serverIndex = -1

const games = ['source', 'minecraft', 'call-of-duty']
const config = {servers: []}

const questions = [
    {
        text: 'Command prefix (default: !): ',
        callback: (value) => {
            value = value || '!'
            config.commandPrefix = '!'
            return true
        }
    },
    {
        text: 'Server host (default: localhost): ',
        callback: (value) => {
            serverIndex++
            config.servers.push({})

            value = value || 'localhost'
            config.servers[serverIndex].host = value
            return true
        }
    },
    {
        text: 'Server port [0-65536]: ',
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
        text: 'Server rcon port (default: [server port]): ',
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
        text: 'Server rcon password: ',
        callback: (value) => {
            if (!value) {
                return false
            }

            config.servers[serverIndex].rconPassword = value
            return true
        }
    },
    {
        text: 'Server log path (folder path for source games): ',
        callback: (value) => {
            if (!value) {
                return false
            }

            config.servers[serverIndex].logPath = value
            return true
        }
    },
    {
        text: `Server game (${games.toString()}): `,
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
        text: `Server gamename (call-of-duty only, ex. IW5, IW4, ecc): `,
        show: () => {
            return config.servers[serverIndex].game == 'call-of-duty'
        },
        callback: (value) => {
            if (!value) {
                return false
            }

            value = value.toUpperCase()

            config.servers[serverIndex].gamename = value
            return true
        }
    },
    {
        text: `Add another server? [y/n]: `,
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

    const askQuestion = (index) => {
        var question = questions[index]

        if (question.show != undefined && !question.show()) {
            index++
            question = questions[index]
        }

        rl.question(question.text, (string) => {
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
    }

    askQuestion(0)

    rl.on('close', () => {
        if (!configFinished) {
            console.log('Configuration aborted, exiting')
            process.exit(0)
        }

        fs.writeFile(path.join(__dirname, '../../config/config.json'), JSON.stringify(config, null, 4), () => {
            console.log('Configuration saved')
            resolve(config)
        })
    })
})
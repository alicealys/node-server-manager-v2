const Mutex     = require('../../../utils/mutex')
const dgram     = require('dgram')
const string    = require('../../../utils/string')
const delay     = require('delay')

const parser = {
    commandTemplates: {
        status: () => {
            return 'status'
        },
        tellraw: (client, message) => {
            return `tell ${client.slot} \"${message}\"`
        },
        broadcast: (message) => {
            return `say \"${message}\"`
        },
    },
    rconCommandFormat: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
    parseStatus: (match) => {
        const address = match[7].split(':')

        return {
            slot: parseInt(match[1]),
            score: parseInt(match[2]),
            bot: match[3] == '1',
            ping: parseInt(match[4]),
            id: parseInt(match[5].substr(8), 16).toString(),
            name: match[6].replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``),
            ip: address[0],
            port: parseInt(address[1])
        }
    },
    statusRegex: /^ +([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +((?:[A-Za-z0-9]){8,32}|(?:[A-Za-z0-9]){8,32}|bot[0-9]+|(?:[[A-Za-z0-9]+)) *(.{0,32}) +(\d+\.\d+\.\d+.\d+\:-*\d{1,5}|0+.0+:-*\d{1,5}|loopback|unknown|bot) +([0-9]+) *$/g
}

class Rcon {
    constructor(config) {
        this.config = config
        this.parser = parser
        this.mutex = new Mutex()
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            const result = await this.executeCommand(this.parser.commandTemplates.status())

            if (!result) {
                reject(new Error('Rcon connection failed'))
                return
            }

            resolve()
        })
    }

    playerList() {
        return new Promise(async (resolve, reject) => {
            const status = await this.executeCommand(this.parser.commandTemplates.status)
            if (!status) {
                return false
            }

            const lines = status.split('\n').slice(1, -1)
            const players = []
    
            lines.forEach(line => {
                if (!line.match(this.parser.statusRegex)) {
                    return
                }

                const match = this.parser.statusRegex.exec(line).map(x => x.trim())
                players.push(this.parser.parseStatus(match))
            })

            resolve(players)
        })
    }

    executeCommand(command) {
        return new Promise(async (_resolve, _reject) => {
            const sync = this.parser.commandDelay
            if (sync) {
                await this.mutex.lock()
            }

            const resolve = async (value) => {
                _resolve(value)

                if (sync) {
                    await delay(sync)
                    this.mutex.unlock()
                }
            }

            const socket = dgram.createSocket('udp4')
            const message = Buffer.from(string.format(this.parser.rconCommandFormat, {
                password: this.config.rconPassword,
                command
            }), 'binary')

            const end = () => {
                socket.close()
                socket.removeAllListeners()
            }

            const timeout = setTimeout(() => {
                end()
                resolve(false)
            }, 5000)

            socket.once('listening', () => {
                socket.send(message, 0, message.length, this.config.port, this.config.host, (err) => {
                    if (err) {
                        end()
                        clearTimeout(timeout)
                        resolve(false)
                        return
                    }
                })
            })

            socket.once('message', (data) => {
                end()
                clearTimeout(timeout)

                resolve(data.toString())
            })

            socket.bind()
        })
    }
}

module.exports = Rcon
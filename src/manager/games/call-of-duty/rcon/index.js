const dgram  = require('dgram')
const delay  = require('delay')
const Mutex  = require('../../../../utils/mutex')
const string = require('../../../../utils/string')
const fs     = require('fs')
const path   = require('path')

class Rcon {
    constructor(config) {
        this.config = config

        if (!config.gamename) {
            throw new Error('Gamename not defined')
        }
        
        if (!fs.existsSync(path.join(__dirname, `./parsers/${config.gamename.toUpperCase()}.js`))) {
            throw new Error('Game not supported')
        }

        this.parser = require(`./parsers/${config.gamename.toUpperCase()}`)
        this.mutex = new Mutex()
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            const result = await this.command(this.parser.commandTemplates.status)

            if (!result) {
                reject(new Error('Rcon connection failed'))
                return
            }

            resolve()
        })
    }

    playerList() {
        return new Promise(async (resolve, reject) => {
            const status = await this.command(this.parser.commandTemplates.status)
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

    command(command) {
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
            const message = Buffer.from(string.format(this.parser.rconCommandFormat, 
                this.config.rconPassword,
                command
            ), 'binary')

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
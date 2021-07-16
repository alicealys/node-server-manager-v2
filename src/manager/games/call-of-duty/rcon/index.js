const dgram  = require('dgram')
const delay  = require('delay')
const Mutex  = require('../../../../utils/mutex')
const string = require('../../../../utils/string')
const fs     = require('fs')
const path   = require('path')

class Rcon {
    constructor(server, config) {
        this.server = server
        this.config = config

        this.commandRetries = 5

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
            if (!result.match(this.parser.statusHeader)) {
                reject(new Error(`Invalid status header: ${result}`))
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

            const lines = status.trim().split('\n')
            const players = []
            
            lines.forEach(line => {
                this.parser.statusRegex.lastIndex = 0
                var match = this.parser.statusRegex.exec(line)
                if (!match) {
                    return
                }

                match = match.map(x => x.trim())
                players.push(this.parser.parseStatus(match))
            })

            resolve(players)
        })
    }

    async getDvar(name) {
        this.parser.dvarRegex.lastIndex = 0

        const result = await this.command(string.format(this.parser.commandTemplates.getDvar, name))
        const match = this.parser.dvarRegex.exec(result)

        if (result && match) {
            return match[3]
        }

        return false
    }

    async setDvar(name, value) {
        return await this.command(string.format(this.parser.commandTemplates.setDvar, name, value))
    }

    async command(command) {
        const commandName = command.split(/\s+/g)[0]
        if (this.parser.ignoreCommandResponses && this.parser.ignoreCommandResponses.includes(commandName)) {
            this.commandInternal(command)
            return
        }

        for (var i = 0; i < this.commandRetries; i++) {
            const result = await this.commandInternal(command)
            if (result !== false) {
                return result
            }

            await delay(100)
        }
    }

    commandInternal(command) {
        return new Promise(async (_resolve, _reject) => {
            const sync = this.parser.commandDelay
            if (sync != undefined) {
                await this.mutex.lock()
            }

            const resolve = async (value) => {
                _resolve(value)

                if (sync != undefined) {
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
                this.parser.responseHeader.lastIndex = 0

                const string = data.toString('binary')
                .replace(this.parser.responseHeader, '').trim()
                clearTimeout(timeout)
                resolve(string)
                end()
            })

            socket.bind()
        })
    }
}

module.exports = Rcon
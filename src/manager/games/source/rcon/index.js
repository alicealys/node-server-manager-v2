const net    = require('net')
const fs     = require('fs')
const path   = require('path')
const Mutex  = require('../../../../utils/mutex')
const string = require('../../../../utils/string')

const PacketTypes = {
    Auth: 3,
    AuthResponse: 2,
    Command: 2,
    CommandResponse: 0
}

const encodePacket = (packet) => {
    const size = Buffer.byteLength(packet.payload) + 14
    const buffer = Buffer.alloc(size)

    buffer.writeInt32LE(size - 4, 0)
    buffer.writeInt32LE(packet.id, 4)
    buffer.writeInt32LE(packet.type, 8)
    buffer.write(packet.payload, 12, size - 2, 'ascii')
    buffer.writeInt16LE(0, size - 2)

    return buffer
}

const decodePacket = (buffer) => {
    const length = buffer.readInt32LE(0)
    const id = buffer.readInt32LE(4)
    const type = buffer.readInt32LE(8)
    const payload = buffer.slice(12, length + 2)

    return {id, type, payload}
}

class Rcon {
    constructor(server, config) {
        this.server = server
        this.config = config
        this.parser = require(`./parser`)

        this.packetId = 0

        this.mutex = new Mutex()
        this.socket = net.Socket()
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            await this.mutex.lock()
            const id = this.packetId++

            const onData = (data) => {
                this.socket.removeListener('error', onError)
                const response = decodePacket(data)

                if (response.type != PacketTypes.Command) {
                    return
                }

                this.socket.removeListener('data', onData)
                this.mutex.unlock()

                if (response.id == id) {
                    this.socket.removeListener('error', onError)
                    resolve()
                    return
                }

                reject('Authentication failed')
            }

            const onError = (err) => {
                this.socket.removeListener('data', onData)
                this.mutex.unlock()
                reject(err)
            }

            this.socket.once('error', onError)

            this.socket.connect(this.config.rconPort, this.config.host, () => {
                const packet = encodePacket({
                    id, 
                    type: PacketTypes.Auth, 
                    payload: this.config.rconPassword
                })

                this.socket.write(packet)
                this.socket.on('data', onData)
            })
        })
    }

    writePacket(type, payload) {
        return new Promise(async (resolve, reject) => {
            await this.mutex.lock()

            const id = this.packetId++
            const packet = encodePacket({
                id,
                type: type,
                payload: payload
            })

            const timeout = setTimeout(() => {
                this.socket.removeListener('error', onError)
                this.socket.removeListener('data', onData)
            }, 1000)

            const onError = (err) => {
                clearTimeout(timeout)
                this.socket.removeListener('data', onData)
                this.mutex.unlock()
                reject(err)
            }

            const onData = (data) => {
                this.socket.removeListener('error', onError)

                const packet = decodePacket(data)
                if (packet.type == PacketTypes.CommandResponse) {
                    clearTimeout(timeout)
                    this.socket.removeListener('data', onData)
                    this.mutex.unlock()
                    resolve(packet)
                }
            }

            this.socket.once('error', onError)
            this.socket.on('data', onData)
            this.socket.write(packet)
        })
    }

    async playerList() {
        const status = await this.command(this.parser.commandTemplates.status)
        const lines = status.split('\n')
        const players = []

        lines.forEach(line => {
            line = line.trim()

            this.parser.statusRegexBot.lastIndex = 0
            this.parser.statusRegex.lastIndex = 0

            if (line.match(botRegex)) {
                const match = this.parser.statusRegexBot.exec(line)
                players.push(this.parser.parseBotStatus(match))
            }
            else if (line.match(playerRegex)) {
                const match = this.parser.statusRegex.exec(line)
                players.push(this.parser.parseStatus(match))
            }
        })

        return players
    }

    async getDvar(name, ignoreOverride = false) {
        name = name.toLowerCase()

        const override = this.parser.dvarOverrides[name]
        if (!ignoreOverride && override) {
            if (!override.get) {
                return
            }

            if (override.get.type == 'function') {
                return await override.get.callback(this)
            } else {
                name = override.get.name
            }
        }

        this.parser.dvarRegex.lastIndex = 0
        const result = await this.command(string.format(this.parser.commandTemplates.getDvar, name))
        const match = this.parser.dvarRegex.exec(result)

        if (result && match) {
            return match[2]
        }

        return false
    }

    async setDvar(name, value, ignoreOverride = false) {
        name = name.toLowerCase()

        const override = this.parser.dvarOverrides[name]
        if (!ignoreOverride && override) {
            if (!override.set) {
                return
            }

            if (override.set.type == 'function') {
                return await override.set.callback(this)
            } else {
                name = override.set.name
            }
        }

        return await this.command(string.format(this.parser.commandTemplates.setDvar, name, value))
    }

    command(command) {
        return new Promise(async (resolve, reject) => {
            this.writePacket(PacketTypes.Command, command)
            .then((result) => {
                resolve(result.payload.toString().trim())
            })
            .catch((err) => {
                resolve(false)
            })
        })
    }
}

module.exports = Rcon
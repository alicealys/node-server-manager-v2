const net           = require('net')
const EventListener = require('events')
const varint        = require('varint')
const Mutex         = require('../../../../utils/mutex')
const io            = require('../../../../utils/io')
const delay         = require('delay')

const PacketTypes = {
    Auth: 3,
    AuthResponse: 2,
    Command: 2,
    CommandResponse: 0
}

const encodePacket = (packet) => {
    const buffer = Buffer.alloc(packet.payload.length + 14)

    buffer.writeInt32LE(packet.payload.length + 10, 0)
    buffer.writeInt32LE(packet.id, 4)
    buffer.writeInt32LE(packet.type, 8)

    packet.payload.copy(buffer, 12)

    return buffer
}

const decodePacket = (buffer) => {
    const length = buffer.readInt32LE(0)
    const id = buffer.readInt32LE(4)
    const type = buffer.readInt32LE(8)
    const payload = buffer.slice(12, length + 2)

    return {id, type, payload}
}

const createPacket = (packetId, data) => {
    return Buffer.concat([
        Buffer.from(varint.encode(varint.encodingLength(packetId) + data.length)),
        Buffer.from(varint.encode(packetId)),
        data
    ])
}

// https://github.com/dennisbruner/node-minecraft-pinger/blob/master/lib/packet.js

const decodeHandshakePacket = (buffer) => {
    return new Promise((resolve, reject) => {
        const packetLength = varint.decode(buffer, 0)
        if (packetLength === undefined) {
          return reject(new Error('Could not decode packetLength'))
        }
    
        if (buffer.length < varint.encodingLength(packetLength) + packetLength) {
          return reject(new Error('Packet is not complete'))
        }
    
        const packetId = varint.decode(buffer, varint.encodingLength(packetLength))
        if (packetId === undefined) {
          return reject(new Error('Could not decode packetId'))
        }
    
        const data = buffer.slice(varint.encodingLength(packetLength) + varint.encodingLength(packetId))
    
        resolve({
            id: packetId,
            bytes: varint.encodingLength(packetLength) + packetLength,
            data
        })
    })
}

function decodeHandshakeResponse (packet) {
    return new Promise((resolve, reject) => {
        const responseLength = varint.decode(packet.data, 0)
        const response = packet.data.slice(
            varint.encodingLength(responseLength),
            varint.encodingLength(responseLength) + responseLength
        )

        resolve(JSON.parse(response))
    })
}

const createHandshakePacket = (host, port) => {
    const portBuffer = Buffer.allocUnsafe(2)
    portBuffer.writeUInt16BE(port, 0)
  
    return Buffer.concat([
        createPacket(0, Buffer.concat([
            Buffer.from(varint.encode(-1)),
            Buffer.from(varint.encode(host.length)),
            Buffer.from(host, 'utf8'),
            portBuffer,
            Buffer.from(varint.encode(1))
        ])),
        createPacket(0, Buffer.alloc(0))
    ])
}

const parser = {
    commandTemplates: {
        tell: 'tellraw {0} "{1}"',
        say: 'tellraw @a "{0}"',
        kick: 'kick {0} {1}',
    },
    colors: {
        'white': '§f',
        'red': '§c',
        'green': '§a',
        'yellow': '§e',
        'blue': '§b',
        'purple': '§d',
        'default': '§f',
    },
    dvarOverrides: {

    }
}

class Rcon extends EventListener {
    constructor(server, config) {
        super()
        
        this.server = server
        this.config = config
        this.parser = parser

        this.mutex = new Mutex()
        this.socket = net.Socket()
        this.socket.on('close', this.onDisconnect.bind(this))

        this.connected = false
        this.packetId = 0
    }

    async onDisconnect() {
        if (!this.connected) {
            return
        }

        this.connected = false
        this.emit('disconnect')

        io.print(`^1Lost connection^7 to '^3${this.config.game}^7' server (^5${this.server.hostname}^7) at ^3${this.config.host}:${this.config.port}^7, attempting to reconnect...`)
        const tryConnect = () => {
            return new Promise((resolve, reject) => {
                this.connect()
                .then(() => {
                    resolve(false)
                })
                .catch(() => {
                    resolve(true)
                })
            })
        }

        await delay(5000)
        while (await tryConnect()) {
            await delay(5000)
        }

        this.emit('reconnect')
        io.print(`^2Reconnected^7 to '^3${this.config.game}^7' server (^5${this.server.hostname}^7) at ^3${this.config.host}:${this.config.port}^7`)
    }

    connect() {
        return new Promise(async (resolve, reject) => {
            await this.mutex.lock()
            this.packetId = 0
            const id = this.packetId++

            const onData = (data) => {
                this.socket.removeListener('error', onError)
                this.mutex.unlock()
            
                const response = decodePacket(data)
                if (response.id != id) {
                    reject('Authentication failed')
                    return
                }

                this.connected = true
                resolve()
            }
            
            const onError = (err) => {
                this.socket.removeListener('data', onData)
                this.socket.removeListener('connect', onConnect)
                this.mutex.unlock()
                reject(err)
            }

            const onConnect = () => {
                const packet = encodePacket({
                    id, 
                    type: PacketTypes.Auth, 
                    payload: Buffer.from(this.config.rconPassword)
                })

                this.socket.write(packet)
                this.socket.once('data', onData)
            }

            this.socket.once('error', onError)
            this.socket.once('connect', onConnect)

            this.socket.connect(this.config.rconPort, this.config.host)
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

            const onError = (err) => {
                this.socket.removeListener('data', onData)
                reject(err)
                this.mutex.unlock()
            }

            const onData = (data) => {
                this.socket.removeListener('error', onError)
                resolve(decodePacket(data))
                this.mutex.unlock()
            }

            this.socket.once('error', onError)
            this.socket.once('data', onData)

            this.socket.write(packet)
        })
    }

    ping() {
        return new Promise(async (resolve, reject) => {
            await this.mutex.lock()

            const connection = net.createConnection(this.config.port, this.config.host, async () => {
                connection.write(createHandshakePacket(this.config.host, this.config.port))
    
                connection.once('data', async (data) => {
                    const packet = await decodeHandshakeResponse(await decodeHandshakePacket(data))
                    resolve(packet)
                    this.mutex.unlock()

                    connection.end()
                })
            })
        })
    }

    async playerList() {
        const status = await this.ping()
        const _players = status.players.sample ? status.players.sample : []
        const players = []

        for (var i = 0; i < _players.length; i++) {
            players.push({
                slot: _players[i].name,
                name: _players[i].name,
                uniqueId: _players[i].id,
            })
        }

        return players
    }

    async getDvar(name) {
        name = name.toLowerCase()
        const ping = await this.ping()
        switch (name) {
            case 'sv_hostname':
                return ping.description.text
            case 'sv_maxclients':
                return ping.players.max
            case 'version':
                return ping.version.name
        }
    }

    async setDvar() {
        
    }

    command(command) {
        command = '/' + command

        return new Promise(async (resolve, reject) => {
            var error = null

            this.writePacket(PacketTypes.Command, Buffer.from(command))
            .catch((err) => {
                error = err
                resolve(false)
            })
            .then((result) => {
                if (error) {
                    return
                }

                resolve(result.payload.toString())
            })
        })
    }
}

module.exports = Rcon
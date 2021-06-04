const net    = require('net')
const Mutex  = require('../../../../utils/mutex')

const PacketTypes = {
    Auth: 3,
    AuthResponse: 2,
    Command: 2,
    CommandResponse: 0
}

const encodePacket = (packet) => {
    const buffer = new Buffer.alloc(packet.payload.length + 14)
    buffer.writeInt32LE(buffer.length - 4, 0)
    buffer.writeInt32LE(packet.id, 4)
    buffer.writeInt32LE(packet.type, 8)

    packet.payload.copy(buffer, 12)
    
    buffer.writeInt16LE(0, buffer.length - 2)

    return buffer
}

const decodePacket = (buffer) => {
    const length = buffer.readInt32LE(0)
    const id = buffer.readInt32LE(4)
    const type = buffer.readInt32LE(8)
    const payload = buffer.slice(12, length + 2)

    return {id, type, payload}
}

const parser = {
    commandTemplates: {
        tellraw: (client, message) => {
            return `say ${message}`
        },
        broadcast: (message) => {
            return `say ${message}`
        }
    }
}

class Rcon {
    constructor(config) {
        this.config = config

        this.parser = parser

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
                reject(err)
                this.mutex.unlock()
            }

            this.socket.once('error', onError)

            this.socket.connect(this.config.rconPort, this.config.host, () => {
                const packet = encodePacket({
                    id, 
                    type: PacketTypes.Auth, 
                    payload: Buffer.from(this.config.rconPassword)
                })

                this.socket.write(packet)
                this.socket.once('data', onData)
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

    async playerList() {
        return []
    }

    executeCommand(command) {
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
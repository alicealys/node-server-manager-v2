const net    = require('net')
const Mutex  = require('../../../../utils/mutex')

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

const parser = {
    commandTemplates: {
        status: 'status',
        tell: 'say [{0}] {1}',
        broadcast: 'say {0}'
    },
    statusRegex: /# +(\d+) +(\d+) +"(.+)" (\S+) +(\d+:\d+) +(\d+) +(\d+) +(\S+) +(\d+) +(\d+\.\d+.\d+.\d+:\d+)/g
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
                    payload: this.config.rconPassword
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
                this.mutex.unlock()
                reject(err)
            }

            const onData = (data) => {
                this.socket.removeListener('error', onError)

                const packet = decodePacket(data)
                if (packet.type == PacketTypes.CommandResponse) {
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
            const match = this.parser.statusRegex.exec(line)
            if (match) {
                players.push({
                    name: match[3],
                    id: match[4],
                    slot: parseInt(match[1])
                })
            }
        })

        return players
    }

    command(command) {
        return new Promise(async (resolve, reject) => {
            this.writePacket(PacketTypes.Command, command)
            .catch((err) => {
                reject(err)
            })
            .then((result) => {
                resolve(result.payload.toString().trim())
            })
        })
    }
}

module.exports = Rcon
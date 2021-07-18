const ws           = require('ws')
const EventEmitter = require('events')
const delay        = require('delay')
const io           = require('../utils/io')

class LogClient extends EventEmitter{
    constructor(url) {
        super()

        this.url = url
        this.connected = false
        this.on('close', this.onDisconnect.bind(this))
    }

    async onDisconnect() {
        if (!this.connected) {
            return
        }

        console.log('here')

        this.connected = false

        io.print(`^1Lost connection^7 to log server ^5${this.url}^7`)
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

        io.print(`^2Reconnected^7 to log server ^5${this.url}^7`)
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new ws(this.url)

            const onOpen = () => {
                this.removeListener('error', onError)
                this.removeListener('message', onMessage)
                this.socket.onerror = () => {}
                this.connected = true
                resolve()
            }
    
            const onMessage = (data) => {
                this.emit('data', data)
            }
    
            const onError = (e) => {
                reject(new Error(`Failed to connect to log server: ${e}`))
                this.removeListener('open', onOpen)
                this.removeListener('message', onMessage)
            }

            const onClose = () => {
                this.emit('close')
            }
    
            this.socket.once('error', onError)
            this.socket.once('open', onOpen)
            this.socket.once('close', onClose)
            this.socket.on('message', onMessage)
        })
    }

    pipe(callback) {
        this.on('data', callback)
    }
}

module.exports = LogClient
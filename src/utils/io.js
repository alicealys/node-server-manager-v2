const EventEmitter = require('events')
const Tail         = require('tail').Tail
const fs           = require('fs')
const spawn        = require('child_process').spawn

const isNix = () => {
    return process.platform != 'win32'
}

module.exports = {
    print: (string) => {
        string += '^7'

        const formatted = string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), `\x1b[3$1m`)
        console.log(formatted)
    },
    ConfigWatcher: class {
        constructor(path) {
            var current = JSON.parse(fs.readFileSync(path).toString())
            fs.watch(path, (eventType, filename) => {
                try {
                    const json = JSON.parse(fs.readFileSync(path).toString())
                    current = json
                }
                catch (e) {}
            })

            return new Proxy({}, {
                get: (target, name) => {
                    if (name == 'current') {
                        return current
                    }

                    return current[name]
                }
            })
        }
    },
    FileWatcher: class extends EventEmitter {
        constructor(path) {
            super()

            if (!fs.existsSync(path)) {
                console.log('FileWatcher: Invalid path')
                return
            }

            const callback = (data) => {
                this.emit('data', data)
            }

            if (!isNix()) {
                var tail = spawn(`powershell`, ['-command', 'get-content', '-wait', '-Tail 0', `"${path}"`])
                tail.stdout.on('data', callback)

                this.destroy = () => {
                    this.removeAllListeners()
                    tail.stdout.removeAllListeners()
                    tail.kill(0)
                }
                return
            }

            var tail = new Tail(path)
            tail.watch()
            tail.on('line', callback)

            this.destroy = () => {
                this.removeAllListeners()
                tail.removeAllListeners()
                tail.unwatch()
            }
        }
        pipe(callback) {
            this.on('data', (data) => {
                callback(data.toString().trim())
            })
        }
    }
}
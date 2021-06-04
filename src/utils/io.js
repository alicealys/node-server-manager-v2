const EventEmitter = require('events')
const Tail         = require('tail').Tail
const fs           = require('fs')
const spawn        = require('child_process').spawn

const isNix = () => {
    return process.platform != 'win32'
}

module.exports = {
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
                return
            }

            var tail = new Tail(path)
            tail.watch()
            tail.on('line', callback)
        }
        pipe(callback) {
            this.on('data', (data) => {
                callback(data.toString())
            })
        }
    }
}
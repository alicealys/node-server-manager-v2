const io         = require('../../../../utils/io')
const Parser     = require('./parser')
const Dispatcher = require('./dispatcher')
const fs         = require('fs')
const path       = require('path')

class Log {
    constructor(server, config, watcher = null) {
        this.server = server
        this.config = config

        const parser = new Parser()
        const dispatcher = new Dispatcher(server)

        this.callback = (data) => {
            const event = parser.parse(data)

            if (event.valid) {
                dispatcher.dispatch(event)
            }
        }

        if (watcher) {
            watcher.pipe((data) => {
                this.callback(data)
            })
            return
        }

        if (!fs.lstatSync(config.logPath).isDirectory()) {
            throw new Error('Log path must be a folder')
        }

        if (!fs.existsSync(config.logPath)) {
            throw new Error('Log path does not exist')
        }

        var currentFile = null

        fs.readdir(config.logPath, (err, files) => {
            files = files.map((name) => {
                return {
                    name,
                    creationTime: fs.statSync(path.join(config.logPath, name)).mtime.getTime()
                }
            })
            .sort((a, b) => {
                return b.creationTime - a.creationTime
            })

            currentFile = files[0].name

            this.watcher = new io.FileWatcher(path.join(config.logPath, currentFile))
            this.watcher.pipe((data) => {
                this.callback(data)
            })

            fs.watch(config.logPath, (eventType, filename) => {
                if (currentFile != filename) {
                    if (this.watcher && typeof this.watcher.destroy == 'function') {
                        this.watcher.destroy()
                        this.watcher = null
                    }
                    
                    this.watcher = new io.FileWatcher(path.join(config.logPath, filename))
                    this.watcher.pipe((data) => {
                        this.callback(data)
                    })
                }
    
                currentFile = filename
            })
        })
    }
}

module.exports = Log
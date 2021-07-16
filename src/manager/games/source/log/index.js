const io         = require('../../../../utils/io')
const Parser     = require('./parser')
const Dispatcher = require('./dispatcher')
const fs         = require('fs')
const path       = require('path')

class Log {
    constructor(server, config) {
        this.server = server
        this.config = config

        const parser = new Parser()
        const dispatcher = new Dispatcher(server)

        const pipe = (data) => {
            const event = parser.parse(data)

            if (event.valid) {
                dispatcher.dispatch(event)
            }
        }

        if (!fs.lstatSync(config.logPath).isDirectory()) {
            throw new Error('Log path must be a folder')
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
                return b.time - a.time
            })

            this.watcher = new io.FileWatcher(path.join(config.logPath, files[0].name))
            this.watcher.pipe(pipe)

            fs.watch(config.logPath, (eventType, filename) => {
                if (currentFile != filename) {
                    if (this.watcher && typeof this.watcher.destroy == 'function') {
                        this.watcher.destroy()
                        this.watcher = null
                    }
    
                    this.watcher = new io.FileWatcher(path.join(config.logPath, filename))
                    this.watcher.pipe(pipe)
                }
    
                currentFile = filename
            })
        })
    }
}

module.exports = Log
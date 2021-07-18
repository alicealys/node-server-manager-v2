const io         = require('../../../../utils/io')
const Parser     = require('./parser')
const Dispatcher = require('./dispatcher')

class Log {
    constructor(server, config, watcher = null) {
        this.server = server
        this.config = config
        this.watcher = watcher || new io.FileWatcher(config.logPath)
        this.parser = new Parser()
        this.dispatcher = new Dispatcher(server)

        this.callback = (data) => {
            const event = this.parser.parse(data)

            if (event.valid) {
                this.dispatcher.dispatch(event)
            }
        }

        this.watcher.pipe((data) => {
            this.callback(data)
        })
    }
}

module.exports = Log
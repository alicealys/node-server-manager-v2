const io         = require('../../../../utils/io')
const Parser     = require('./parser')
const Dispatcher = require('./dispatcher')

class Log {
    constructor(server, config) {
        this.server = server
        this.config = config
        this.watcher = new io.FileWatcher(config.logPath)
        this.parser = new Parser()
        this.dispatcher = new Dispatcher(server)

        this.watcher.pipe((data) => {
            const event = this.parser.parse(data)

            if (event.valid) {
                this.dispatcher.dispatch(event)
            }
        })
    }
}

module.exports = Log
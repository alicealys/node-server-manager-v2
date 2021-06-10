const Client = require('../../../server/client')

class Dispatcher {
    constructor(server) { 
        this.server = server
    }

    async dispatch(event) {
        if (!event || !event.type || !event.args) {
            return
        }

        console.log(event.type, event.args)

        switch (event.type) {
            case 'server_cvar':
            case 'cvar':
                {
                    const name = event.args[0]
                    const value = event.args[1]

                    const number = !isNaN(parseInt(value))

                    this.server.dvars[name] = number
                        ? parseInt(value)
                        : value
                }
                break
            case 'connect':
                {
                }
                break
            case 'disconnect':
                {
                }
                break
        }
    }
}

module.exports = Dispatcher
const Client = require('../../../server/client')

class Dispatcher {
    constructor(server) { 
        this.server = server
    }

    async dispatch(event) {
        if (!event || !event.type || !event.args) {
            return
        }

        switch (event.type) {

        }
    }
}

module.exports = Dispatcher
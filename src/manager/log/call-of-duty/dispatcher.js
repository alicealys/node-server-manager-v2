const Client = require('../../server/client')

class Dispatcher {
    constructor(server) { 
        this.server = server
    }

    async dispatch(event) {
        if (!event || !event.type || !event.args) {
            return
        }

        switch (event.type) {
            case 'join':
                {
                    const id = event.args[2]
                    const slot = parseInt(event.args[3])
                    const name = event.args[4]

                    {
                        const client = this.server.clients.find(client => client.slot == slot)

                        if (client) {
                            this.server.emit('preconnect', client)
                            client.emit('preconnect')

                            return
                        }
                    }

                    const client = new Client(id, name, slot, this.server)
                    this.server.clients.push(client)

                    this.server.emit('connect', client)
                    break
                }
            case 'quit':
                {
                    const slot = event.args[3]
                    const client = this.server.clients.find(client => client.slot == slot)

                    if (!client) {
                        return
                    }

                    this.server.emit('disconnect', client)
                    client.emit('disconnect')
    
                    for (var i = 0; i < this.server.clients.length; i++) {
                        if (this.server.clients[i].slot == client.slot) {
                            this.server.clients.splice(i, 1)
                        }
                    }

                    break
                }
            case 'say':
                {
                    const slot = parseInt(event.args[3])
                    const client = this.server.clients.find(client => client.slot == slot)
                    const message = event.args[5].trim()
    
                    if (!client) {
                        return
                    }
    
                    client.emit('message', message)
                    this.server.emit('message', client, message)

                    break
                }
        }
    }
}

module.exports = Dispatcher
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
            case 'connect':
                {
                    const name = event.args[0]
                    const address = event.args[1].split(':')
                    const list = await this.server.rcon.playerList()
                    const player = list.find(player => player.name == name)
                    const exists = this.server.clients.find(client => client.uniqueId == player.uniqueId)
                    if (exists) {
                        return
                    }
    
                    if (!player) {
                        return
                    }
    
                    const client = new Client({
                        uniqueId: player.uniqueId, 
                        name: player.name,
                        slot: player.name,
                        server: this.server,
                        address: address[0]
                    })
                    await client.build()

                    this.server.clients.push(client)
                    this.server.emit('connect', client)
                    break
                }
            case 'disconnect':
                {
                    const client = this.server.clients.find(client => client.name == event.args[0])
                    const reason = event.args[1].trim()
    
                    if (!client) {
                        return
                    }
    
                    client.emit('disconnect', reason)
                    this.server.emit('disconnect', client, reason)
    
                    for (var i = 0; i < this.server.clients.length; i++) {
                        if (this.server.clients[i].id == client.id) {
                            this.server.clients.splice(i, 1)
                        }
                    }

                    break
                }
            case 'message':
                {
                    const client = this.server.clients.find(client => client.name == event.args[0])
                    const message = event.args[1].trim()
    
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
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
                    const name = event.args[0]
                    const slot = parseInt(event.args[1])
                    const uniqueId = event.args[2]

                    const list = await this.server.rcon.playerList()
                    const player = list.find(player => player.slot == slot)

                    const client = new Client({
                        uniqueId: uniqueId,
                        name: name,
                        slot: slot,
                        server: this.server,
                        address: player.address
                    })
                    await client.build()

                    this.server.clients.push(client)
                    this.server.emit('connect', client)
                }
                break
            case 'disconnect':
                {
                    const slot = parseInt(event.args[1])
                    const reason = event.args[4]
                    const client = this.server.clients.find(client => client.slot == slot)

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
                }
                break
            case 'say':
                {
                    const slot = parseInt(event.args[1])
                    const message = event.args[4]
                    const client = this.server.clients.find(client => client.slot == slot)

                    if (!client) {
                        return
                    }

                    client.emit('message', message)
                    this.server.emit('message', client, message)
                }
                break
        }
    }
}

module.exports = Dispatcher
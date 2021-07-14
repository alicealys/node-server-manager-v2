const plugin = {
    onConnect: (client) => {
        const database = client.server.database
        database.models.connections.add({
            uniqueId: client.uniqueId,
            clientId: client.clientId,
            address: client.address,
            name: client.name
        })
    }
}

module.exports = plugin
module.exports = {
    onLoad: (server) => {
        server.on('connect', (client) => {
            client.tell(`Welcome back ${client.name}`)
        })
    }
}
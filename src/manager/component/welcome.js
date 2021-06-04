const component = {}

const onConnect = (client) => {
    client.tell(`Welcome back ${client.name}!`)

    client.on('message', (message) => {
        client.tell(`You said: ${message}`)
    })
}

component.onInit = (server) => {
    server.on('preconnect', onConnect)
    server.on('connect', onConnect)
}

module.exports = component
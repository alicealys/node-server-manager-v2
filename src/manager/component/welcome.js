const component = {}
var server = null

const onConnect = (client) => {
    console.log(`${client.name} connected`)
}

const onMessage = (client, message) => {
    client.tell(`You said: ${message}`)
}

const onPreconnect = (client) => {
    console.log(`${client.name} is already connected`)
}

const onDisconnect = (client) => {
    console.log(`${client.name} disconnected`)
    console.log(server.clients)
}

component.onInit = (_server) => {
    server = _server

    _server.on('message', onMessage)
    _server.on('preconnect', onPreconnect)
    _server.on('connect', onConnect)
    _server.on('disconnect', onDisconnect)
}

module.exports = component
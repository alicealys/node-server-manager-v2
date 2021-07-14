const plugin = {
    onMessage: (client, message) => {
    },
    onConnect: (client) => {
        client.tell(`Welcome back <blue>${client.name}<default>!`)
    },
    onPreconnect: (client) => {
    },
    onDisconnect: (client) => {
    },
    onEvent: (event, args) => {
    },
    onLoad: (server) => {
    }
}

module.exports = plugin
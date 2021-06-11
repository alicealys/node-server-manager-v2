const plugin = {
    onMessage: (client, message) => {
    },
    onConnect: (client) => {
    },
    onPreconnect: (client) => {
    },
    onDisconnect: (client) => {
    },
    onEvent: (event, args) => {
    },
    onLoad: (server) => {
        console.log('Loaded test plugin')
    }
}

module.exports = plugin
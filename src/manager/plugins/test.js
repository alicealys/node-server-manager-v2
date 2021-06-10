const plugin = {}

plugin.onMessage = (server, message) => {
    console.log('here')
}

plugin.onEvent = (event, args) => {
    console.log(event, args)
}

plugin.onLoad = (server) => {
    plugin.onInterval(() => {
        //console.log('here')
    }, 100)
}

module.exports = plugin
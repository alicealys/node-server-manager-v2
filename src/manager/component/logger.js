const path         = require('path')
const io           = require('../../utils/io')
const string       = require('../../utils/string')

const localization = require('../../../config/localization-en.json')
const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

var database = null

const onConnect = (client) => {
    database.models.connections.add({
        uniqueId: client.uniqueId,
        clientId: client.clientId,
        address: client.address,
        name: client.name
    })
}

module.exports = {
    onLoad: (manager) => {
        database = manager.database

        manager.servers.forEach(server => {
            server.on('connect', onConnect)
            server.on('preconnect', onConnect)
        })
    }
}
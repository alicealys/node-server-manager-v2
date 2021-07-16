const path         = require('path')
const geoip        = require('geoip-lite')
const fetch        = require('node-fetch')
const io           = require('../../utils/io')
const string       = require('../../utils/string')

const localization = require('../../../config/localization-en.json')
const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

var database = null

var externalAddress = null
const getExternalAddress = async () => {
    if (externalAddress) {
        return externalAddress
    }

    const result = await (await fetch('https://extreme-ip-lookup.com/json')).json()
    return result.query
}

function isPrivateIP(ip) {
    const locals = ['localhost', '0.0.0.0', '127.0.0.1']
    const parts = ip.split('.')

    return locals.includes(ip) || parts[0] === '10' || 
       (parts[0] === '172' && (parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31)) || 
       (parts[0] === '192' && parts[1] === '168')
 }

const onConnect = async (client) => {
    database.models.connections.add({
        uniqueId: client.uniqueId,
        clientId: client.clientId,
        address: client.address,
        name: client.name
    })

    client.geoip = client.address && !isPrivateIP(client.address)
        ? geoip.lookup(client.address)
        : geoip.lookup(await getExternalAddress())
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
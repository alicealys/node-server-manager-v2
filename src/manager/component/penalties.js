const path         = require('path')
const moment       = require('moment')
const geoip        = require('geoip-lite')
const fetch        = require('node-fetch')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')

const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

var database = null

const penaltyTypes = require('../database/penaltyTypes')

const onConnect = async (client) => {
    const result = await database.models.penalties.getBan(client.clientId)
    if (!result) {
        return
    }

    switch (result.type) {
        case (penaltyTypes.BAN):
            {
                const message = string.format(localization['PENALTIES_BAN_MSG'], result.reason)
                client.kick(database.consoleId, message, true)
                break
            }
        case (penaltyTypes.TEMPBAN):
            {
                const duration = moment.duration(result.end * 1000 - new Date()).humanize()
                const message = string.format(localization['PENALTIES_TEMPBAN_MSG'], result.reason, duration)
                client.kick(database.consoleId, message, true)
                break
            }
    }
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
const path   = require('path')
const io     = require('../../utils/io')
const string = require('../../utils/string')

const localization = require('../../../config/localization-en.json')
const config = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

module.exports = {
    onLoad: (manager) => {
        manager.servers.forEach(server => {
        })
    }
}
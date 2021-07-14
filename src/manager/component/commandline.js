const path = require('path')
const io   = require('../../utils/io')

const config = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

module.exports = {
    onLoad: (server) => {
        
    }
}
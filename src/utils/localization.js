const path   = require('path')
const io     = require('./io')

const localizationPath = path.join(__dirname, `../../config/localization-${process.env.locale}.json`)
const localization     = new io.ConfigWatcher(localizationPath)

module.exports = new Proxy(localization, {
    get: (target, name) => {
        return target.current[name] || name
    }
})
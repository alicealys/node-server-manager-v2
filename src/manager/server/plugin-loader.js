const fs   = require('fs')
const path = require('path')

const requireUncached = (module) => {
    delete require.cache[require.resolve(module)]
    return require(module)
}

class Loader {
    constructor(server) {
        this.server = server
        this.loaded = false

        this.plugins = []
        this.pluginFiles = fs.readdirSync(path.join(__dirname, '../plugins'))
        this.pluginFiles.forEach(async (file) => {
            const plugin = {name: file, timeoutHandles: [], intervalHandles: []}
            const module = requireUncached(path.join(__dirname, `../plugins/${file}`))

            module.onInterval = (callback, interval) => {
                plugin.intervalHandles.push(setInterval(callback, interval))
            }
            module.onTimeout = (callback, timeout) => {
                plugin.intervalHandles.push(setTimeout(callback, timeout))
            }

            plugin.module = module
            this.plugins.push(plugin)
        })

        process.on('exit', this.onUnload.bind(this))

        var lastChange = new Date()
        fs.watch(path.join(__dirname, '../plugins'), async (eventType, filename) => {
            if (!this.loaded || new Date() - lastChange < 100 
                || !fs.existsSync(path.join(__dirname, `../plugins/${filename}`))
                || !fs.readFileSync(path.join(__dirname, `../plugins/${filename}`)).length) {
                return
            }

            lastChange = new Date()

            const found = this.plugins.find(plugin => plugin.name == filename)
            const plugin = found 
                ? found 
                : {name: filename, timeoutHandles: [], intervalHandles: []}

            if (plugin.module && typeof plugin.module.onUnload === 'function') {
                plugin.module.onUnload()
            }

            plugin.timeoutHandles.forEach(handle => {
                clearTimeout(handle)
            })

            plugin.intervalHandles.forEach(handle => {
                clearInterval(handle)
            })

            plugin.timeoutHandles = []
            plugin.intervalHandles = []

            plugin.module = requireUncached(path.join(__dirname, `../plugins/${filename}`))

            plugin.module.onInterval = (callback, interval) => {
                plugin.intervalHandles.push(setInterval(callback, interval))
            }
            plugin.module.onTimeout = (callback, timeout) => {
                plugin.intervalHandles.push(setTimeout(callback, timeout))
            }

            if (typeof plugin.module.onLoad === 'function') {
                plugin.module.onLoad(server)
            }
        })

        server.on('*', (event, args) => {
            this.plugins.forEach(plugin => {
                const module = plugin.module
                const keys = Object.keys(module)

                keys.forEach(async (key) => {
                    const name = key.toLowerCase()
                    if (typeof module[key] === 'function' && name == `on${event}` && name != 'onload' && name != 'onevent') {
                        module[key].apply(null, args)
                    } else if (typeof module[key] === 'function' && name == 'onevent') {
                        module[key](event, args)
                    }
                })
            })
        })
    }

    async onLoad() {
        this.loaded = true

        this.plugins.forEach(plugin => {
            if (typeof plugin.module.onLoad === 'function') {
                plugin.module.onLoad(this.server)
            }
        })
    }

    async onUnload() {
        this.loaded = true

        this.plugins.forEach(plugin => {
            if (typeof plugin.module.onUnload === 'function') {
                plugin.module.onUnload(this.server)
            }
        })
    }
}

module.exports = Loader
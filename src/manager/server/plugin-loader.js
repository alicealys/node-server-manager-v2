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
            try {
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
            }
            catch (e) {
                console.log(`Error loading plugin ${file}:`)
                console.log(e)
            }
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
                try {
                    plugin.module.onUnload(this.server)
                }
                catch (e) {
                    console.log(`Error unloading plugin: ${plugin.name}:`)
                }
            }

            plugin.timeoutHandles.forEach(handle => {
                clearTimeout(handle)
            })

            plugin.intervalHandles.forEach(handle => {
                clearInterval(handle)
            })

            plugin.timeoutHandles = []
            plugin.intervalHandles = []

            try {
                plugin.module = requireUncached(path.join(__dirname, `../plugins/${filename}`))

                plugin.module.onInterval = (callback, interval) => {
                    plugin.intervalHandles.push(setInterval(callback, interval))
                }
                plugin.module.onTimeout = (callback, timeout) => {
                    plugin.intervalHandles.push(setTimeout(callback, timeout))
                }
    
                if (typeof plugin.module.onLoad === 'function') {
                    try {
                        plugin.module.onLoad(this.server)
                    }
                    catch (e) {
                        console.log(`Error loading plugin: ${plugin.name}:`)
                        console.log(e)
                    }
                }
            }
            catch (e) {
                console.log(`Error loading plugin ${plugin.name}:`)
                console.log(e)
            }
        })

        server.on('*', (event, args) => {
            this.plugins.forEach(plugin => {
                const module = plugin.module
                const keys = Object.keys(module)

                keys.forEach(async (key) => {
                    const name = key.toLowerCase()
                    if (typeof module[key] === 'function' && name == `on${event}` && name != 'onload' && name != 'onevent') {
                        try {
                            module[key].apply(null, args)
                        }
                        catch (e) {
                            console.log(`Error executing callback '${`on${event}`}' in plugin: ${plugin.name}:`)
                            console.log(e)
                        }
                    } else if (typeof module[key] === 'function' && name == 'onevent') {
                        try {
                            module[key](event, args)
                        }
                        catch (e) {
                            console.log(`Error executing callback 'onevent' in plugin: ${plugin.name}:`)
                            console.log(e)
                        }
                    }
                })
            })
        })
    }

    async onLoad() {
        this.loaded = true

        this.plugins.forEach(plugin => {
            if (typeof plugin.module.onLoad === 'function') {
                try {
                    plugin.module.onLoad(this.server)
                }
                catch (e) {
                    console.log(`Error executing callback 'onload' in plugin: ${plugin.name}:`)
                    console.log(e)
                }
            }
        })
    }

    async onUnload() {
        this.loaded = true

        this.plugins.forEach(plugin => {
            if (typeof plugin.module.onUnload === 'function') { 
                try {
                    plugin.module.onUnload(this.server)
                }
                catch (e) {
                    console.log(`Error executing callback 'onunload' in plugin: ${plugin.name}: ${e}`)
                    console.log(e)
                }
            }
        })
    }
}

module.exports = Loader
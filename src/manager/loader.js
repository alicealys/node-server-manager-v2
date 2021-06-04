const fs = require('fs')
const path = require('path')

const requireUncached = (module) => {
    delete require.cache[require.resolve(module)]
    return require(module)
}

class Loader {
    constructor(server) {
        this.server = server
        this.components = []
        this.files = fs.readdirSync(path.join(__dirname, './component'))

        this.files.forEach(file => {
            const component = requireUncached(path.join(__dirname, `./component/${file}`))
            component.onInit(server)
            this.components.push(component)
        })
    }

    onEvent(event) {
        this.components.forEach(component => {
            if (typeof component.onEvent === 'function') {
                component.onEvent(event)
            }
        })
    }

    onLoad() {
        this.components.forEach(component => {
            if (typeof component.onLoad === 'function') {
                component.onLoad()
            }
        })
    }

    onEnd() {
        this.components.forEach(component => {
            if (typeof component.onEnd === 'function') {
                component.onEnd()
            }
        })
    }
}

module.exports = Loader
const fs   = require('fs')
const path = require('path')

class Loader {
    constructor(manager) {
        this.manager = manager
        this.components = []
        this.componentFiles = fs.readdirSync(path.join(__dirname, './component'))
        this.componentFiles.forEach(file => {
            const component = require(path.join(__dirname, `./component/${file}`))
            this.components.push(component)
        })

        process.on('exit', this.onUnload.bind(this))
    }

    onInit() {
        this.components.forEach(component => {
            if (typeof component.onInit === 'function') {
                component.onInit(this.manager)
            }
        })
    }

    onLoad() {
        this.components.forEach(component => {
            if (typeof component.onLoad === 'function') {
                component.onLoad(this.manager)
            }
        })
    }

    onUnload() {
        this.components.forEach(component => {
            if (typeof component.onUnload === 'function') {
                component.onUnload(this.manager)
            }
        })
    }
}

module.exports = Loader
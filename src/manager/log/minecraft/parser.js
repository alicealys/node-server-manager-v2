const regex = {
    header: /\[\d\d:\d\d:\d\d\] \[Server thread\/INFO\]\: /g,
    message: /\<(.+?)\> (.+)/g,
    disconnect: /(.+?) lost connection: (.+)/g,
    connect: /(.+?)\[\/(\d+\.\d+\.\d+.\d+\:-*\d{1,5})\] logged in .+/g,
}

class Parser {
    constructor() { }

    parse(event) {
        if (!event.match(regex.header)) {
            return {
                valid: false
            }
        }

        event = event.replace(regex.header, '')

        const types = Object.keys(regex)
        for (var i = 0; i < types.length; i++) {
            if (types[i] == 'header') {
                continue
            }

            if (event.match(regex[types[i]])) {
                return {
                    valid: true,
                    type: types[i],
                    args: regex[types[i]].exec(event).slice(1)
                }
            }
        }

        return {
            valid: false
        }
    }
}

module.exports = Parser
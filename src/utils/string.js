module.exports = {
    format(format) {
        const args = [...arguments].slice(1)
        
        format = format.replace(/\[{\d+}\]/g, () => {
            return ''
        })

        return format.replace(/{(\d+)}/g, (match, index) => {
            return args[index] != undefined
                ? args[index]
                : match
        })
    },
    pad(string, char, length) {
        while (string.length < length) {
            string += char
        }
        
        return string
    },
    parseColors(colors, string) {
        if (!colors) {
            return string
        }

        string = colors.default + string
        return string.replace(/\<(.+?)\>/g, (match, index) => {
            const original = match
            match = match.toLowerCase().slice(1, -1)

            return colors[match] || original
        })
    }
}
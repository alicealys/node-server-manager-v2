module.exports = {
    format(format) {
        const args = [...arguments].slice(1)
        var offset = 0
        
        format = format.replace(/\[{\d+}\]/g, () => {
            offset++
            return ''
        })

        return format.replace(/{(\d+)}/g, (match, index) => {
            index = index - offset

            return args[index] != undefined
                ? args[index]
                : match
        })
    }
}
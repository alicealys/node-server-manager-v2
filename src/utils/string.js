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
    }
}
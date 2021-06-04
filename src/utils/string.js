module.exports = {
    format(template = '', values, c = '%', flags = 'g') {
        Object.entries(values).forEach(value => {
            template = template.replace(new RegExp(`${c}${value[0].toLocaleUpperCase()}${c}`, flags), value[1])
        })

        return template
    }
}
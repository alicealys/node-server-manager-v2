const path         = require('path')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')

const configRoles  = new io.ConfigWatcher(path.join(__dirname, '../../../config/roles.json'))

const parseParameter = (param, type) => {
    switch (type.toLowerCase()) {
        case 'bool':
            return param == 'true'
        case 'int':
            return parseInt(param)
        case 'float':
            return parseFloat(param)
        case 'string':
        default:
            return param
    }
}

const getRoles = () => {
    const currentRoles = []
    const roles = configRoles.current

    for (var i = 0; i < roles.length; i++) {
        var permissions = [...roles[i].permissions]
        for (var o = i + 1; o < roles.length; o++) {
            permissions = [...permissions, ...roles[o].permissions]
        }

        currentRoles[i] = {...roles[i]}
        currentRoles[i].index = i
        currentRoles[i].permissions = permissions
    }

    if (!currentRoles.find(role => role.id == 'everyone')) {
        currentRoles.push({
            id: "everyone",
            name: "User",
            permissions: [
                "user.*"
            ]
        })
    }

    return currentRoles
}

const getRole = (clientRoles) => {
    const roles = getRoles()
    var validRoles = []

    for (var i = 0; i < clientRoles.length; i++) {
        const role = roles.find(role => role.id == clientRoles[i])
        if (role) {
            validRoles.push(role)
        }
    }

    if (!validRoles.length) {
        return roles.find(role => role.id == 'everyone')
    }

    validRoles.sort((a, b) => {
        return a.index - b.index
    })

    return validRoles[0]
}

const hasPermission = (role, permission) => {
    for (var i = 0; i < role.permissions.length; i++) {
        if (comparePermissions(role.permissions[i], permission)) {
            return true
        }
    }

    return false
}

const comparePermissions = (a, b) => {
    const splitA = a.split('.')
    const splitB = b.split('.')

    for (var i = 0; i < splitA.length; i++) {
        if (splitA[i] == '*') {
            return true
        }

        if (splitA[i] != splitB[i]) {
            return false
        }
    }

    return true
}

module.exports = {
    comparePermissions: comparePermissions,
    hasPermission: hasPermission,
    getRoles: getRoles,
    getRole: getRole,
    CommandBuilder: class CommandBuilder {
        constructor() {
            this.params = []
        }
        setName(name) {
            this.name = name

            return this
        }
        setAlias(alias) {
            this.alias = alias
            
            return this
        }
        setCallback(callback) {
            this.callback = callback
            
            return this
        }
        setPermission(permission) {
            this.permission = permission
            
            return this
        }
        setParameterType(index, type) {
            this.params[index] = type
        }
        execute(client, args) {
            for (var i = 0; i < args; i++) {
                if (this.params[i]) {
                    args[i] = parseParameter(args[i], this.params[i])
                }
            }

            const role = getRole(client.roles)
            if (!hasPermission(role, this.permission)) {
                client.tell(string.format(localization['CMD_MISSING_PERMISSION'], this.permission))
                return
            }

            this.callback(client, args)
        }
    }
}
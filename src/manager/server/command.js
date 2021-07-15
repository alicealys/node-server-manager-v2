const path         = require('path')
const io           = require('../../utils/io')
const string       = require('../../utils/string')
const localization = require('../../utils/localization')

const configRoles  = new io.ConfigWatcher(path.join(__dirname, '../../../config/roles.json'))
const config       = new io.ConfigWatcher(path.join(__dirname, '../../../config/config.json'))

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

    if (!currentRoles.find(role => role.id == 'role_owner')) {
        currentRoles.push({
            id: "role_owner",
            name: "Owner",
            permissions: [
                "*"
            ]
        })
    }

    if (!currentRoles.find(role => role.id == 'role_console')) {
        currentRoles.push({
            id: "role_console",
            name: "Console",
            permissions: [
                "*"
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
            this.minArgs = 0
            this.inGame = false
        }
        setName(name) {
            this.name = name.toLowerCase()

            return this
        }
        setAlias(alias) {
            this.alias = alias.toLowerCase()
            
            return this
        }
        setCallback(callback) {
            this.callback = callback
            
            return this
        }
        setPermission(permission) {
            this.permission = permission.toLowerCase()
            
            return this
        }
        setParameterType(index, type) {
            this.params[index + 1] = type.toLowerCase()

            return this
        }
        setDescription(description) {
            this.description = description

            return this
        }
        setUsage(usage) {
            this.usage = usage
            
            return this
        }
        setMinArgs(args) {
            this.minArgs = args

            return this
        }
        setInGame(value) {
            this.inGame = value

            return this
        }
        getUsage() {
            if (this.usage) {
                return string.format(this.usage, config.current.commandPrefix)
            }

            if (localization.commands && localization.commands[this.name] && localization.commands[this.name].usage) {
                return string.format(localization.commands[this.name].usage, config.current.commandPrefix)
            }

            return localization['NOT_DEFINED']
        }
        getDescription() {
            if (this.description) {
                return this.description
            }

            if (localization.commands && localization.commands[this.name] && localization.commands[this.name].description) {
                return localization.commands[this.name].description
            }

            return localization['NOT_DEFINED']
        }
        noPermission(client) {
            client.tell(string.format(localization['CMD_MISSING_PERMISSION'], this.permission))
        }
        missingArguments(client) {
            client.tell(string.format(localization['CMD_MISSING_ARGUMENTS'], this.getUsage()))
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

            if (args.length - 1 < this.minArgs) {
                client.tell(string.format(localization['CMD_MISSING_ARGUMENTS'], this.getUsage()))
                return
            }

            args.join = (index) => {
                var buffer = ""
                for (var i = index; i < args.length; i++) {
                    buffer += args[i]
                    if (i < args.length - 1) {
                        buffer += " "
                    }
                }

                return buffer
            }

            this.callback(client, args, this)
        }
    }
}
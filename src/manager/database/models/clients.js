module.exports = (sequelize, Sequelize) => {
    const clients = {}

    clients.instance = sequelize.define('clients', 
    {
        clientId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        uniqueId: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        roles: {
            type: Sequelize.BLOB,
            allowNull: false,
            defaultValue: '["everyone"]',
        },
        firstConnection: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })

    clients.instance.sync()

    clients.find = async (uniqueId) => {
        const result = await clients.instance.findOne({
            where: {
                uniqueId
            },
            raw: true
        })

        if (result) {
            result.roles = JSON.parse(result.roles)
        }

        return result
    }

    clients.get = async (clientId) => {
        const result = await clients.instance.findOne({
            where: {
                clientId
            },
            raw: true
        })

        if (result) {
            result.roles = JSON.parse(result.roles)
        }

        return result
    }

    clients.add = async (uniqueId, roles) => {
        const find = await clients.find(uniqueId)
        if (find) {
            return find
        }

        await clients.instance.build({
            uniqueId,
            roles: JSON.stringify(roles)
        }).save()

        return await clients.add(uniqueId)
    }

    clients.addRole = async (clientId, role) => {
        const client = await clients.get(clientId)
        if (!client) {
            return
        }

        client.roles.push(role)

        await clients.instance.update({
            roles: JSON.stringify(client.roles)
        }, {
            where: {
                clientId
            }
        })
    }
    
    return clients
}
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
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true
        },
        roles: {
            type: Sequelize.JSON,
            allowNull: false,
            defaultValue: ['everyone'],
        },
        firstConnection: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        lastConnection: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })

    clients.instance.sync()

    clients.find = async (uniqueId) => {
        return await clients.instance.findOne({
            where: {
                uniqueId
            },
            raw: true
        })
    }

    clients.get = async (clientId) => {
        return await clients.instance.findOne({
            where: {
                clientId
            },
            raw: true
        })
    }

    clients.add = async (uniqueId, roles) => {
        const find = await clients.find(uniqueId)
        if (find) {
            return find
        }

        await clients.instance.build({
            uniqueId,
            roles
        }).save()

        return await clients.add(uniqueId)
    }

    clients.addRole = async (clientId, role) => {
        const client = await clients.get(clientId)
        if (!client) {
            return
        }

        const roles = JSON.parse(client.roles)
        roles.push(role)

        await clients.instance.update({
            roles
        }, {
            where: {
                clientId
            }
        })
    }
    
    return clients
}
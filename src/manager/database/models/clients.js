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
        return await clients.instance.findAll({
            where: {
                uniqueId
            },
            raw: true
        })
    }

    clients.findByName = async (name) => {
        
    }

    clients.add = async (uniqueId) => {
        const find = await clients.find(uniqueId)
        if (find.length) {
            return find[0]
        }

        if (!find.length) {
            await clients.instance.build({
                uniqueId
            }).save()

            return await clients.add(uniqueId)
        }
    }
    
    return clients
}
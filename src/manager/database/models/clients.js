module.exports = (sequelize, DataTypes) => {
    const clients = {}

    clients.instance = sequelize.define('clients', 
    {
        clientId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        uniqueId: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },
        roles: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['everyone'],
        },
        firstConnection: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        },
        lastConnection: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
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
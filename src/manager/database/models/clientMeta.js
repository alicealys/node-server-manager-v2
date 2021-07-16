module.exports = (sequelize, Sequelize) => {
    const clientMeta = {}

    clientMeta.instance = sequelize.define('clientMeta', 
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        clientId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'clients',
                key: 'clientId'
            }
        },
        key: {
            type: Sequelize.STRING,
            allowNull: true,
            unique: true
        },
        value: {
            type: Sequelize.BLOB,
            allowNull: true
        }
    }, {
        timestamps: false
    })

    clientMeta.instance.sync()

    clientMeta.get = async (clientId, key) => {
        const result = await clientMeta.instance.findAll({
            where: {
                clientId,
                key
            },
            raw: true
        })

        if (!result.length) {
            return null
        }

        const value = result[0].value
        try {
            return JSON.parse(value)
        }
        catch (e) {
            return value
        }
    }

    clientMeta.set = async (clientId, key, value) => {
        value = JSON.stringify(value)

        const exist = await clientMeta.get(clientId, key)
        if (!exist) {
            return await clientMeta.instance.build({
                clientId,
                key,
                value
            }).save()
        }

        await clientMeta.instance.update({
            value
        }, {
            where: {
                clientId,
                key
            }
        })
    }
    
    return clientMeta
}
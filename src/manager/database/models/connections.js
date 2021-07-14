module.exports = (sequelize, Sequelize) => {
    const connections = {}

    connections.instance = sequelize.define('connections', 
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
        uniqueId: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        name: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        address: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        date: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        }
    }, {
        timestamps: false
    })
    
    connections.instance.sync()

    connections.add = async (connection) => {
        return await connections.instance.build({
            clientId: connection.clientId,
            uniqueId: connection.uniqueId,
            name: connection.name,
            address: connection.address,
        }).save()
    }

    connections.findByName = async (name, limit = 50) => {
        const result = await connections.instance.findAll({
            group: ['clientId'],
            order: [
                ['Date', 'desc']
            ],
            raw: true,
            limit,
            where: {
                name: {
                    [Sequelize.Op.like]: `%${name}%`
                }
            }
        })

        return result
    }

    return connections
}
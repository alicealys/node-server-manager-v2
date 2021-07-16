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
            type: Sequelize.STRING,
            allowNull: false
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false,
        },
        address: {
            type: Sequelize.STRING,
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

    connections.getLatest = async (clientId) => {
        return await connections.instance.findOne({
            group: ['clientId'],
            order: [
                ['date', 'desc']
            ],
            raw: true,
            where: {
                clientId
            }
        })
    }

    connections.findByName = async (name, limit = 50) => {
        const result = await connections.instance.findAll({
            group: ['clientId'],
            raw: true,
            limit,
            attributes: [
                'clientId',
                'uniqueId',
                'name',
                'address',
                [sequelize.fn('MAX', sequelize.col('date')), 'date']
            ],
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
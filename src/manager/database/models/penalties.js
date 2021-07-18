const penaltyTypes = require('../penaltyTypes')

module.exports = (sequelize, Sequelize) => {
    const penalties = {}

    penalties.instance = sequelize.define('penalties', 
    {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true
        },
        originId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'clients',
                key: 'clientId'
            }
        },
        targetId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'clients',
                key: 'clientId'
            }
        },
        active: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 1,
        },
        type: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        reason: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        end: {
            type: Sequelize.INTEGER,
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
    
    penalties.instance.sync()

    penalties.add = async (penalty) => {
        const valid = Object.keys(penaltyTypes).find(key => penaltyTypes[key] == penalty.type)
        if (!valid) {
            throw new Error('Invalid penalty type: ' + penalty.type)
        }

        return await penalties.instance.build({
            originId: penalty.originId,
            targetId: penalty.targetId,
            type: penalty.type,
            end: penalty.end,
            reason: penalty.reason,
            active: penalty.active
        }).save()
    }

    penalties.unBan = async (penalty) => {
        const result = await penalties.instance.update({
            active: 0
        }, {
            where: {
                targetId: penalty.targetId
            },
            raw: true
        })
        
        const count = result[0]
        if (count) {
            await penalties.add({
                originId: penalty.originId,
                targetId: penalty.targetId,
                reason: penalty.reason,
                type: penaltyTypes.UNBAN,
                active: 0
            })
        }

        return count
    }

    penalties.getBan = async (targetId) => {
        return await penalties.instance.findOne({
            where: {
                targetId,
                active: 1,
                [Sequelize.Op.or]: [
                    {
                        type: penaltyTypes.BAN
                    },
                    {
                        type: penaltyTypes.TEMPBAN,
                        end: {
                            [Sequelize.Op.gte]: Math.floor(new Date() / 1000)
                        }
                    }
                ]
            },
            order: [
                ['type', 'desc'],
                ['date', 'desc'],
            ],
            raw: true
        })
    }

    return penalties
}
const fs        = require('fs')
const path      = require('path')
const sqlite3   = require('sqlite3').verbose()
const directory = path.join(__dirname, './models')
const Sequelize = require('sequelize')
const instance  = {}

instance.connect = () => {
    return new Promise((resolve, reject) => {
        new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
            var sequelize = new Sequelize({
                host: 'localhost',
                dialect: 'sqlite',
                pool: {
                   max: 5,
                   min: 0,
                   idle: 10000
                },
                logging: false,
                storage: path.join(__dirname, 'database.db')
            })
        
            instance.sequelize = sequelize
            instance.models = {}
        
            fs.readdir(directory, (err, files) => {
                if (err) {
                    reject(new Error('Unable to scan directory'))
                    return
                }
        
                files.forEach(file => {
                    file = path.join(__dirname, `./models/${file}`)
        
                    const model = require(file)(sequelize, Sequelize)
                    const name = path.basename(file, path.extname(file))
                    instance.models[name] = model
                })

                resolve(instance)
            })
        })
    })
}

module.exports = instance
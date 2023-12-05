const Sequelize = require('sequelize');

module.exports = class Room extends Sequelize.Model{
    static init(sequelize) {
        return super.init({
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
                primaryKey: true,
            },
            title: {
                type: Sequelize.STRING(100),
                allowNull: false,
                defaultValue : "방송"
            },
            leader:{
                type: Sequelize.INTEGER(100),
                primaryKey: true,
            }
        },
            {
                sequelize,
                modelName: 'Room',
                tableName: 'rooms',
                charset: 'utf8',
                collate: 'utf8_general_ci',
            });
    }
}
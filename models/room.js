const Sequelize = require('sequelize');

module.exports = class Account extends Sequelize.Model{
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
        },
            {
                sequelize,
                modelName: 'Room',
                tableName: 'rooms',
                charset: 'utf8',
                collate: 'utf8_general_ci',
            });
    }

    static associate(db) {
        db.Account.belongsTo(db.User, {foreignKey: 'UserId', targetKey: 'id'});
    }
}
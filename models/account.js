const Sequelize = require('sequelize');

module.exports = class Account extends Sequelize.Model{
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.STRING(100),
                allowNull: false,
                primaryKey: true,
            },
            password: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            salt: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
        },
            {
                sequelize,
                modelName: 'Account',
                tableName: 'accounts',
                charset: 'utf8',
                collate: 'utf8_general_ci',
            });
    }

    static associate(db) {
        db.Account.belongsTo(db.User, {foreignKey: 'UserId', targetKey: 'id'});
    }
}
const Sequelize = require('sequelize');

module.exports = class User extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            win: {
                type:Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate:{
                    isInt: true,
                    min: 0,
                }
            },
            lose: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: true,
                    min: 0,
                }
            }
        },
            {
                sequelize,
                modelName: 'User',
                tableName: 'users',
                charset: 'utf8',
                collate: 'utf8_general_ci',
            });
    }

    static associate(db) {
        db.User.hasOne(db.Account, {foreignKey: 'UserId', sourceKey: 'id'});
    }
}
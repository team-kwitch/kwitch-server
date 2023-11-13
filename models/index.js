const Sequelize = require('sequelize');
const Account = require('./account');
const User = require('./user');

const env = process.env.DATA_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);


db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Account = Account;
db.User = User;

Account.init(sequelize);
User.init(sequelize);

Account.associate(db);
User.associate(db);

module.exports = db;
const Sequelize = require('sequelize');
const Account = require('./account');
const User = require('./user');
const Room = require('./room');

const env = process.env.DATA_ENV || 'development';
const config = require('../config/config')[env];
const db = {};
 
const sequelize = new Sequelize(config.database, config.user, config.password, config);


db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Account = Account;
db.User = User;
db.Room = Room;

Account.init(sequelize);
User.init(sequelize);
Room.init(sequelize);

Account.associate(db);
User.associate(db);
Room.associate(db);

module.exports = db;
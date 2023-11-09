import { Sequelize } from "sequelize";

const env = process.env.DATA_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

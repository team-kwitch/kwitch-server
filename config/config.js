const dotenv = require('dotenv');
dotenv.config();

const env = process.env;

const config = {
  "development": {
    "username": env.DEVELOPMENT_NAME,
    "password": env.DEVELOPMENT_PASSWORD,
    "database": env.DEVELOPMENT_DATABASE,
    "host": "127.0.0.1",
    "dialect": "mysql",
    "logging": false,
  }
}

module.exports = config;
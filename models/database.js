const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:rDazZ1zCjD3PkOKJ@db.xxxsgvqbnkftoswascds.supabase.co:5432/postgres', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    keepAlive: true
  },
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  host: process.env.DB_HOST || 'db.xxxsgvqbnkftoswascds.supabase.co',
  protocol: 'tcp',
  logging: false,
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true,
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

module.exports = sequelize;
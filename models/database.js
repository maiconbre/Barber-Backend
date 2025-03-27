const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgresql://postgres:rDazZ1zCjD3PkOKJ@db.xxxsgvqbnkftoswascds.supabase.co:5432/postgres',
  {
    dialect: 'mysql',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
);

module.exports = sequelize;
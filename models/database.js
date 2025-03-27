const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('postgresql://postgres:ajvqIY6dIho00UjX@db.xxxsgvqbnkftoswascds.supabase.co:5432/postgres', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Testar a conexão
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch(err => {
    console.error('Não foi possível conectar ao banco de dados:', err);
  });

module.exports = sequelize;
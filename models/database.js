const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:rDazZ1zCjD3PkOKJ@db.xxxsgvqbnkftoswascds.supabase.co:5432/postgres', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    idle: 10000,
    acquire: 30000
  },
  retry: {
    max: 5,
    match: [/SequelizeConnectionError/],
    backoffBase: 1000,
    backoffExponent: 1.5
  },
  define: {
    timestamps: true
  },
  host: process.env.DB_HOST || 'db.xxxsgvqbnkftoswascds.supabase.co',
  dialectModule: require('pg'),
  logging: false,
  native: false,
  hooks: {
    beforeConnect: async (config) => {
      config.dialectOptions = {
        ...config.dialectOptions,
        application_name: 'barber-backend',
        connectTimeout: 30000,
        keepAlive: true
      };
    }
  }
});

// Teste de conexão com retry
const testConnection = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      break;
    } catch (err) {
      console.log(`Connection attempt failed. Retries left: ${retries - 1}`);
      retries -= 1;
      if (retries === 0) {
        console.error('Failed to connect to database:', err);
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

testConnection();

module.exports = sequelize;
const { Sequelize } = require('sequelize');

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // bắt buộc với Render
        },
      },
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'library_pro',
      username: process.env.DB_USER || 'library_ctx',
      password: process.env.DB_PASSWORD || 'library_password',
      logging: false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      define: {
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected');
    await sequelize.sync({ force: false, alter: true });
    console.log('Database synced');
  } catch (err) {
    console.error('DB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };

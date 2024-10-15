import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Load environment variables

export const AppDataSource = new DataSource({
  type: 'mongodb',
  url: process.env.MONGO_URI, // Replace with your MongoDB URI
  database: 'chat-app-db',
  useNewUrlParser: true,
  synchronize: false, // Migrations should handle synchronization
  logging: true,
  entities: ['dist/**/*.entity.js'], // Adjust path as necessary
  migrations: ['dist/src/migrations/*.js'],
});

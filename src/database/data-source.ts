import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const commonConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST!,
  port: +process.env.DB_PORT!,
  username: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  synchronize: false,
  logging: true,
};

export const typeOrmConfig: TypeOrmModuleOptions = {
  ...commonConfig,
  entities: [__dirname + '/../modules/**/*.entity{.ts,.js}']
};

export const dataSource = new DataSource({
  ...commonConfig,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductBrand } from './product-brend.entity';
import { ProductBrandService } from './product-brend.sevice';

@Module({
  imports: [TypeOrmModule.forFeature([ProductBrand])],
  providers: [ProductBrandService],
  exports: [ProductBrandService], // boshqa modullarda ishlatish uchun export qilinmoqda
})
export class ProductBrandModule {}

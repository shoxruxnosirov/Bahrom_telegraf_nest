import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductType } from './product-type.entity';
import { ProductTypeService } from './product-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductType])],
  providers: [ProductTypeService],
  exports: [ProductTypeService], // agar boshqa modulda ishlatilsa
})
export class ProductTypeModule {}

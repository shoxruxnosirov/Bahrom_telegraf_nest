import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './product-type.entity';

@Injectable()
export class ProductTypeService {
  constructor(
    @InjectRepository(ProductType)
    private readonly productTypeRepo: Repository<ProductType>,
  ) {}

  async findAll(): Promise<ProductType[]> {
    return this.productTypeRepo.find();
  }

  async findOne(id: number): Promise<ProductType | null> {
    return this.productTypeRepo.findOne({ where: { id } });
  }

  async create(name: string, photo: string): Promise<ProductType> {
    const type = this.productTypeRepo.create({ name, photo });
    return this.productTypeRepo.save(type);
  }

  async remove(id: number): Promise<void> {
    await this.productTypeRepo.delete(id);
  }
}

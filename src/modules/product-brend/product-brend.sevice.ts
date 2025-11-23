import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductBrand } from './product-brend.entity';

@Injectable()
export class ProductBrandService {
  constructor(
    @InjectRepository(ProductBrand)
    private readonly brandRepo: Repository<ProductBrand>,
  ) {}

  create(name:string, photo: string, productType: number) {
    // if(typeof productType === 'number'){
        const brand = this.brandRepo.create({name, photo, productType: {id: productType}});
        return this.brandRepo.save(brand);
    // }
  }

  findAll(productTypeId: number) {
    // return this.brandRepo.find();
    return this.brandRepo.find({
    where: {
      productType: { id: productTypeId }, // 👈 shunchaki id orqali filter
    },
  });
  }

  findOne(id: number) {
    return this.brandRepo.findOne({ where: { id } });
  }

  async remove(id: number) {
    const brand = await this.findOne(id);
    if (!brand) return null;
    return this.brandRepo.remove(brand);
  }

  async update(id: number, data: Partial<ProductBrand>) {
    await this.brandRepo.update(id, data);
    return this.findOne(id);
  }
}

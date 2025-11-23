import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Criterion } from 'src/comman/types';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) { }

    async findAll(brandId: number, isAdmin: boolean): Promise<Product[]> {
        return this.productRepo.find({
            where:
                isAdmin
                    ?
                    {
                        productBrand: { id: brandId }, // bu yerda brandId - int
                    }
                    :
                    {
                        productBrand: { id: brandId }, // bu yerda brandId - int
                        isAvailable: true
                    },
        });
    }

    async findOne(id: number): Promise<Product | null> {
        return this.productRepo.findOne({ where: { id } });
    }

    async create(data: {
        name: string;
        productBrandId: number;
        description?: string;
        price?: number;
        criterion: Criterion;
        photo: string
    }): Promise<Product> {
        const product = this.productRepo.create({
            name: data.name,
            description: data.description,
            price: data.price,
            productBrand: { id: data.productBrandId },
            photo: data.photo,
            criterion: data.criterion
        });

        return this.productRepo.save(product);
    }

    async update(id: number, data: {
        name?: string;
        description?: string;
        price?: number;
        criterion?: Criterion;
        photo?: string;
    }): Promise<Product | null> {
        const product = await this.productRepo.findOne({
            where: { id }
        });

        if (!product) {
            // throw new NotFoundException(`Mahsulot topilmadi (id: ${id})`);
            console.log('product topilmadi');
            return null;
        }

        if (data.name !== undefined) product.name = data.name;
        if (data.description !== undefined) product.description = data.description;
        if (data.price !== undefined) product.price = data.price;
        if (data.photo !== undefined) product.photo = data.photo;
        if (data.criterion !== undefined) product.criterion = data.criterion;

        return await this.productRepo.save(product);
    }


    async remove(id: number): Promise<void> {
        await this.productRepo.delete(id);
    }

    // isAvailable qiymatini o‘zgartirish
    async toggleAvailability(id: number, isAvailable: boolean): Promise<Product | null> {
        const product = await this.productRepo.findOne({ where: { id } });

        if (!product) {
            //   throw new NotFoundException(`Product with ID ${id} not found`);
            console.log('product topilmadi');
            return null;
        }

        product.isAvailable = isAvailable;
        return this.productRepo.save(product);
    }
}

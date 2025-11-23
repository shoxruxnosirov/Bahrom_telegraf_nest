import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ProductBrand } from '../product-brend/product-brend.entity';
import { Criterion } from 'src/comman/types';


@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  photo: string;

  @Column({ nullable: true })
  description?: string;

  @Column('decimal', { nullable: true })
  price?: number;

  @ManyToOne(() => ProductBrand, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_brand_id' })
  productBrand: ProductBrand;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({
    type: 'enum',       // enum tipini ko‘rsatish
    enum: Criterion,    // enumning o‘zi
    default: Criterion.dona
  })
  criterion: Criterion;

}


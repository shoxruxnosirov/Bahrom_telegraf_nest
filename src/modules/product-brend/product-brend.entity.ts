import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductType } from '../product-types/product-type.entity';

@Entity()
export class ProductBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  photo: string;

  @ManyToOne(() => ProductType, { eager: true, onDelete: 'CASCADE' }) // type o‘chsa, brandlar ham o‘chadi
  @JoinColumn({ name: 'product_type_id' })
  productType: ProductType;
}

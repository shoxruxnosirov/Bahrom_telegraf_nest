import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ProductType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  photo: string;
}

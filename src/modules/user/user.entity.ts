import { Role } from 'src/comman/types';
import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'bigint' })
  chatId: number;


  @Column({
    type: 'enum',
    enum: Role,
    default: Role.user
  })
  role: Role;

  @Column()
  name: string;

  // @Column({ nullable: true })
  // username: string | null;
  @Column({ type: 'varchar', nullable: true })
  username: string | null;


  // @Column({ nullable: true })
  // phone: string | null;
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;


  @CreateDateColumn()
  createdAt: Date;
}

// users.set(5448064497, {
//     chatId: 5448064497,
//     role: 'user',
//     name: 'B',
//     username: 'AAZZs99',
//     phone: null
// })

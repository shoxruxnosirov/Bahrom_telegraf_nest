import { User } from 'src/modules/user/user.entity';
import { dataSource } from '../data-source';
import { Role } from 'src/comman/types';


async function seed() {
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);

  const existing = await userRepo.count();
  if (existing > 0) {
    console.log('Users already exist, skipping seeding.');
    return;
  }

  const users = [
    {
      chatId: 5448064497,
      role: Role.superAdmin,
      username: null,
      name: 'Bahrom',
      phone: null,
    },
    {
      chatId: 8416782330,
      role: Role.superAdmin,
      name: 'Shoxrux',
      username: null,
      phone: null,
    }
  ];

  await userRepo.save(userRepo.create(users));

  // await userRepo.save([
  //   userRepo.create({
  //     chatId: 5448064497,
  //     role: Role.superAdmin,
  //     username: null,
  //     name: 'root',
  //     phone: null,
  //   }),
  // ]);

  console.log('Seeding complete.');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
});

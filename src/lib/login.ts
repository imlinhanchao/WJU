import { User, UserRepo } from "../entities";

export async function saveUser(user: User) {
  const existingUser = await UserRepo.findOne({ where: { username: user.username, from: user.from } });
  if (!existingUser) {
    await UserRepo.save(UserRepo.create(user));
  } else {
    UserRepo.merge(existingUser, user);
    await UserRepo.save(existingUser);
  }
}

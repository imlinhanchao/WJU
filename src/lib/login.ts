import { User, UserRepo } from "../entities";

export async function saveUser(user: User) {
  const existingUser = await UserRepo.findOne({ where: { username: user.username, from: user.from } });
  if (!existingUser) {
    await UserRepo.save(UserRepo.create(user));
  } else {
    user.lastLogin = Date.now();
    user.isAdmin = existingUser.isAdmin;
    UserRepo.merge(existingUser, user);
    await UserRepo.update({ id: existingUser.id }, existingUser);
  }
}

import { BagRecordRepo, BagRepo } from "@/entities";
import { Bag as BagInstance } from "@/entities/Bag";
import { BagItemType } from "./item";

export default class BagCore {
  userId: string;
  constructor(userId: string) {
    this.userId = userId;
  }

  async getBag() {
    const bag = await BagRepo.findOne({ where: { userId: this.userId } });
    if (!bag) {
      const newBag = new BagInstance();
      newBag.userId = this.userId;
      await BagRepo.save(BagRepo.create(newBag));
      return newBag;
    }
    return bag;
  }

  async addItem(type: BagItemType, count: number = 1, remark: string = '') {
    const bag = await this.getBag();
    bag[`${type}Count`] += count;
    await BagRepo.update({ userId: this.userId }, bag);
    await BagRecordRepo.save(BagRecordRepo.create({
      userId: this.userId,
      type,
      count,
      remark,
    }));
    return bag;
  }
}
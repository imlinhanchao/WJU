import { GameRepo } from "@/entities";
import { random } from "@/utils";
import { And, MoreThan, Not } from "typeorm";

export enum BagItemType {
  DailyResetCard = 'dailyResetCard',
  AccountResetCard = 'accountResetCard',
  FreePlayCard = 'freePlayCard',
}

export interface IItem {
  itemKey: BagItemType;
  itemName: string;
  description: string;
  dropRate: number;
}

export const items: IItem[] = [
  { itemKey: BagItemType.DailyResetCard, itemName: '单日重置卡', description: '重置指定日期的游戏记录', dropRate: 1 / 100 },
  { itemKey: BagItemType.AccountResetCard, itemName: '账号重置卡', description: '重置账号的所有游戏记录', dropRate: 1 / 80 },
  { itemKey: BagItemType.FreePlayCard, itemName: '限免游玩卡', description: '免费游玩一次游戏', dropRate: 1 / 50 },
]

export default class Item {
  // 随机颁发道具
  static getRandomItem() {
    const rand = random(1000);
    let cumulative = 0;
    for (const item of items) {
      cumulative += item.dropRate * 1000;
      if (rand < cumulative) {
        return item.itemKey;
      }
    }
    return null;
  }

  static async useDailyResetCard(userId: string, createDate: string) {
    const todayStart = Math.floor(Date.now() / 86400000) * 86400000;
    const todayEnd = todayStart + 86400000;
    const targetGame = await GameRepo.find({ 
      where: { 
        userId: userId,
        createTime: And(MoreThan(todayStart), Not(MoreThan(todayEnd))),
      },
      order: { updatedTime: 'DESC' } 
    });
    if (targetGame?.length === 0) {
      throw new Error("无游戏可重置");
    }
    for (const game of targetGame) {
      if (createDate && new Date(createDate).getTime() !== Math.floor(game.createTime / 86400000) * 86400000) {
        continue;
      }
      GameRepo.remove(game);
    }
  }

  static async useAccountResetCard(userId: string) {
    await GameRepo.delete({ userId: userId });
  }

  static getName(type?: BagItemType | null) {
    if (!type) return '';
    const item = items.find(i => i.itemKey === type);
    return item ? item.itemName : '';
  }
}
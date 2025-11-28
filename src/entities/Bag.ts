import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ comment: '背包表', name: 'bag' })
export class Bag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "用户Id" })
  userId: string;

  @Column({ comment: "单日重置卡数量", default: 0 })
  dailyResetCardCount: number = 0;

  @Column({ comment: "账号重置卡数量", default: 0 })
  accountResetCardCount: number = 0;

  @Column({ comment: "限免游玩卡数量", default: 0 })
  freePlayCardCount: number = 0;

  @Column('bigint', { comment: "创建时间" })
  createTime: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedTime: number = Date.now();

  constructor() {
    
  }
}
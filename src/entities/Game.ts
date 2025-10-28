import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IGame } from "../lib/core";

@Entity({ comment: '游戏表', name: 'game' })
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "用户Id" })
  userId: string;

  @Column({ comment: "原始字符串" })
  source: string;

  @Column({ comment: "目标字符串" })
  target: string;

  @Column('bigint', { comment: "随机种子" })
  seed: number;

  @Column({ comment: "当前字符串" })
  current: string;

  @Column("simple-array", { comment: "历史记录" })
  history: string[];

  @Column({ comment: "获得积分" })
  earnedPoint: number = 0;

  @Column('bigint', { comment: "创建时间" })
  createTime: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedTime: number = Date.now();

  constructor(options?: IGame) {
    this.source = options?.source || '';
    this.target = options?.target || this.source;
    this.seed = options?.seed || Date.now();
    this.current = options?.current || '';
    this.history = options?.history || [];
  }
}
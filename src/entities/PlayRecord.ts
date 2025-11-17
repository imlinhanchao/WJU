import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IGame } from "../lib/core";

@Entity({ comment: '游玩记录表', name: 'play_record' })
export class PlayRecord implements IGame {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "谜题Id" })
  playgroundId: number;

  @Column({ comment: "用户Id" })
  userId: string;

  @Column({ comment: "原始字符串" })
  source: string;

  @Column({ comment: "目标字符串" })
  target: string;

  @Column({ comment: "当前字符串" })
  current: string;
    
  @Column('bigint', { comment: "随机种子" })
  seed: number;

  @Column("simple-array", { comment: "历史记录" })
  history: string[];

  @Column({ comment: "通关步数"})
  steps: number = 0;

  @Column({ 
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: "游戏难度",
    default: 0.00 
  })
  difficulty: number = 0;

  @Column('bigint', { comment: "创建时间" })
  createTime: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedTime: number = Date.now();

  constructor(options?: Partial<IGame>) {
    this.current = this.source = options?.source || '';
    this.target = options?.target || this.source;
    this.seed = options?.seed || Date.now();
    this.difficulty = options?.difficulty || 0;
    this.history = options?.history || [];
  }
}
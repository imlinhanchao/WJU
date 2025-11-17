import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { IGame } from "../lib/core";

@Entity({ comment: '谜题游乐场表', name: 'playground' })
export class Playground {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "创建用户Id" })
  userId: string = '';

  @Column({ comment: "原始字符串" })
  source: string = '';

  @Column({ comment: "目标字符串" })
  target: string = '';

  @Column('bigint', { comment: "随机种子", nullable: true })
  seed?: number;

  @Column({ 
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: "游戏难度",
    default: 0.00 
  })
  difficulty: number = 0;

  @Column("simple-array", { comment: "操作步骤" })
  actions: string[] = [];

  @Column({ comment: "是否发布" })
  isPublished: boolean = false;

  @Column({ comment: "最低步数"})
  bestRecord: number = 0;

  @Column('bigint', { comment: "创建时间" })
  createTime: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedTime: number = Date.now();

  constructor(options?: IGame) {
    this.source = options?.source || '';
    this.target = options?.target || this.source;
  }
}
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ comment: '背包记录表', name: 'bag_record' })
export class BagRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: "用户Id" })
  userId: string;

  @Column({ comment: "类型" })
  type: string;

  @Column({ comment: "数量" })
  count: number = 0;

  @Column({ comment: "备注" })
  remark: string;

  @Column('bigint', { comment: "创建时间" })
  createTime: number = Date.now();

  @Column('bigint', { comment: "更新时间" })
  updatedTime: number = Date.now();

  constructor() {
    
  }
}
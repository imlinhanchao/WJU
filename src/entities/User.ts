import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ comment: '用户表', name: 'user' })
export class User {
  @Column('bigint', { comment: "用户ID", primary: true, unique: true })
  id: string;

  @Column({ comment: "用户名" })
  username: string;

  @Column({ comment: "昵称" })
  nickname: string;

  @Column('bigint', { comment: "上次登录时间" })
  lastLogin: number = 0;

  @Column({ comment: "注册来源" })
  from: string = '';

  @Column('bigint', { comment: "用户积分" })
  point: number = 500;

  constructor(username: string = '', nickname: string = '') {
    this.username = username;
    this.nickname = nickname || username;
  }
}
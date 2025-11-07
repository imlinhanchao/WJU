import { ViewEntity, DataSource, ViewColumn } from 'typeorm';
import { Game } from './Game';
import { User } from './User';

@ViewEntity({
  name: 'profile', // 视图名称
  expression: (dataSource: DataSource) => dataSource
    .createQueryBuilder()
    .addSelect("userId", "user") // 用户 ID
    .addSelect("user.nickname", "nickname") // 用户昵称
    .addSelect("user.username", "username") // 用户名
    .addSelect("user.from", "from") // 注册来源
    .addSelect("user.point", "point") // 用户积分
    .addSelect("COUNT(*)", "total")
    .addSelect("SUM(CASE WHEN g.current = g.target THEN 1 ELSE 0 END)", "matched")
    .addSelect(
      `AVG(
         CASE
           WHEN g.history IS NULL OR g.history = '' THEN 0
           ELSE (LENGTH(g.history) - LENGTH(REPLACE(g.history, ',', '')) + 1)
         END
       )`,
      "avgSteps"
    )
    .addSelect(
      `CASE WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND(SUM(CASE WHEN g.current = g.target THEN 1 ELSE 0 END) / COUNT(*), 4)
      END`,
      "winRate"
    )
    .addSelect("AVG((g.updatedTime - g.createTime) / 1000.0)", "avgTimeCost")
    .addSelect("AVG(CAST(g.earnedPoint AS DECIMAL(18,2)))", "avgEarnedPoint")
    .from(Game, "g")
    .innerJoin(User, "user", "user.id = g.userId")
    .groupBy("userId"),
})
export class ProfileView {
  /**
   * 用户ID
   */
  @ViewColumn()
  user: string;

  /**
   * 用户昵称
   */
  @ViewColumn()
  nickname: string;

  /**
   * 用户名
   */
  @ViewColumn()
  username: string;

  /**
   * 注册来源
   */
  @ViewColumn()
  from: string;

  /**
   * 用户积分
   */
  @ViewColumn()
  point: number;

  /**
   * 总游戏数
   */
  @ViewColumn()
  total: number;

  /**
   * 匹配成功数
   */
  @ViewColumn()
  matched: number;

  /**
   * 胜率
   */
  @ViewColumn()
  winRate: number;

  /**
   * 平均步骤数
   */
  @ViewColumn()
  avgSteps: number;

  /**
   * 平均耗时
   */
  @ViewColumn()
  avgTimeCost: number;

  /**
   * 平均获得积分
   */
  @ViewColumn()
  avgEarnedPoint: number;
}
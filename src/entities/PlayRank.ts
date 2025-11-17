import { ViewEntity, DataSource, ViewColumn } from 'typeorm';
import { PlayRecord } from './PlayRecord';

@ViewEntity({
  name: 'play_rank', // 视图名
  expression: (dataSource: DataSource) => dataSource
    .createQueryBuilder()
    .select('p.userId', 'userId')
    .addSelect('p.playgroundId', 'playgroundId')
    .addSelect('p.id', 'playRecordId')
    .addSelect('p.steps', 'steps')
    .addSelect('p.source', 'source')
    .addSelect('p.target', 'target')
    .addSelect('p.current', 'current')
    .addSelect('p.seed', 'seed')
    .addSelect('p.history', 'history')
    .addSelect('p.difficulty', 'difficulty')
    .addSelect('p.createTime', 'createTime')
    .addSelect('p.updatedTime', 'updatedTime')
    .addSelect('p.updatedTime - p.createTime', 'cost')
    .from(PlayRecord, 'p')
    .innerJoin(
      qb => qb
        .select('pr.userId', 'userId')
        .addSelect('pr.playgroundId', 'playgroundId')
        .addSelect('MIN(pr.steps)', 'minSteps')
        .from(PlayRecord, 'pr')
        .where('pr.current = pr.target')
        .groupBy('pr.userId')
        .addGroupBy('pr.playgroundId'),
      'm',
      'm.userId = p.userId AND m.playgroundId = p.playgroundId AND p.steps = m.minSteps AND p.current = p.target'
    )
})

export class PlayRankView {
  @ViewColumn()
  userId: string;

  @ViewColumn()
  playgroundId: number;

  @ViewColumn()
  playRecordId: number;

  @ViewColumn()
  steps: number;

  @ViewColumn()
  source: string;

  @ViewColumn()
  target: string;

  @ViewColumn()
  current: string;

  @ViewColumn()
  seed: number;

  @ViewColumn()
  history: string;

  @ViewColumn()
  difficulty: number;

  @ViewColumn()
  createTime: number;

  @ViewColumn()
  updatedTime: number;

  @ViewColumn()
  cost: number;
}
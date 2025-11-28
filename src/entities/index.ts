import 'reflect-metadata';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource, Repository } from 'typeorm';
import { User } from "./User";
import { Game } from "./Game";
import { PlayRecord } from "./PlayRecord";
import { Playground } from "./Playground";
import { ProfileView } from "./Profile";
import { PlayRankView } from './PlayRank';
import { Bag } from './Bag';
import { BagRecord } from './BagRecord';
import utils from '../utils'

@EventSubscriber()
export class EntitySubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<any>): void {
    if (event.entity) {
      const timestamp = Date.now();
      if ('createTime' in event.entity) {
        event.entity.createTime = timestamp;
      }
      if ('updateTime' in event.entity) {
        event.entity.updateTime = timestamp;
      }
    }
  }

  beforeUpdate(event: UpdateEvent<any>): void {
    if (event.entity && 'updateTime' in event.entity) {
      event.entity.updateTime = Date.now();
    }
  }
}

export const AppDataSource = utils.config ? new DataSource({
  type: "mysql",
  logging: false,
  ...utils.config.database,
  synchronize: true,
  entities: [User, Game, PlayRecord, Playground, ProfileView, PlayRankView, Bag, BagRecord],
  migrations: [],
  subscribers: [],
  charset: "utf8mb4_unicode_ci"
}) : {} as DataSource;

export {
  User, Game
}

export const UserRepo = utils.config ? AppDataSource.getRepository(User) : {} as Repository<User>;
export const GameRepo = utils.config ? AppDataSource.getRepository(Game) : {} as Repository<Game>;
export const PlaygroundRepo = utils.config ? AppDataSource.getRepository(Playground) : {} as Repository<Playground>;
export const PlayRecordRepo = utils.config ? AppDataSource.getRepository(PlayRecord) : {} as Repository<PlayRecord>;
export const ProfileRepo = utils.config ? AppDataSource.getRepository(ProfileView) : {} as Repository<ProfileView>;
export const PlayRankRepo = utils.config ? AppDataSource.getRepository(PlayRankView) : {} as Repository<PlayRankView>;
export const BagRepo = utils.config ? AppDataSource.getRepository(Bag) : {} as Repository<Bag>;
export const BagRecordRepo = utils.config ? AppDataSource.getRepository(BagRecord) : {} as Repository<BagRecord>;
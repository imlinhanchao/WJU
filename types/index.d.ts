import 'express-session';
import { User } from '../src/entities/User';
import { Playground } from '@/entities/Playground';

declare module 'express-session' {
  interface SessionData {
    user?: User;
    error?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      playground?: Playground;
    }
  }
}

declare interface IConfig {
  webport: number;
  login: {
    githubClientId: string;
    githubClientSecret: string;
    steamApiKey: string;
  },
  secret: {
    identity: string;
    session: string;
    goldenKey: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entityPrefix?: string;
  };
}
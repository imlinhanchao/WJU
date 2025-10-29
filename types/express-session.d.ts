import 'express-session';
import { User } from '../src/entities/User';
import { Request } from "express";
import { IGame } from '../src/lib/core';

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
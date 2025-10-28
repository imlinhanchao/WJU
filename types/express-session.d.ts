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
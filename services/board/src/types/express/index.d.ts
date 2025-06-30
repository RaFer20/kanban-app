import { Request } from "express";
import pino from "pino";

declare module "express-serve-static-core" {
  interface Request {
    id?: string;
    log?: pino.Logger;
  }
}

export interface AuthenticatedUser {
  id: number;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
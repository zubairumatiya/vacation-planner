//import { JwtPayload } from "jsonwebtoken"

export interface MyPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: MyPayload; // custom
    }
  }
}

export {};

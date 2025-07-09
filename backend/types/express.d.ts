//import { JwtPayload } from "jsonwebtoken"

interface MyPayload {
  id: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: MyPayload; // custom
    }
  }
}

export {};

//import { JwtPayload } from "jsonwebtoken"

export interface MyPayload {
  id: string;
  role?: string;
}

export interface Schedule {
  id: string;
  trip_id: string;
  location: string;
  details: string;
  start_time: Date;
  end_time: Date;
  cost: number;
  multi_day: boolean;
  sort_index: number;
  last_modified: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: MyPayload; // custom
    }
  }
}

export {};

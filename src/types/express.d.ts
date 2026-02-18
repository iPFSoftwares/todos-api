import type { User } from "../entity/User";
import type { Session } from "../entity/Session";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}

export {};

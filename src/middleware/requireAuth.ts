import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { User } from "../entity/User";
import { hashToken, SESSION_COOKIE_NAME } from "../utils/sessions";

const sessionRepo = () => AppDataSource.getRepository(Session);
const userRepo = () => AppDataSource.getRepository(User);

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = String(req.cookies?.[SESSION_COOKIE_NAME] || "");
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tokenHash = hashToken(token);
    const session = await sessionRepo().findOne({
      where: { tokenHash }
    });

    if (!session || session.expiresAt <= new Date()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await userRepo().findOne({ where: { id: session.userId } });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}

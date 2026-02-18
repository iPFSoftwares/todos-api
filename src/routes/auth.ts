import { Router } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { createSession, clearSession } from "../utils/sessions";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
const userRepo = () => AppDataSource.getRepository(User);

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return email.includes("@") && email.length <= 320;
}

router.post("/register", async (req, res, next) => {
  try {
    const email = normalizeEmail(String(req.body?.email || ""));
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const existing = await userRepo().findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = userRepo().create({ email, passwordHash });
    const saved = await userRepo().save(user);

    await createSession(saved.id, res);
    res.status(201).json({
      id: saved.id,
      email: saved.email,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const email = normalizeEmail(String(req.body?.email || ""));
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await userRepo().findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await createSession(user.id, res);
    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await clearSession(req.session!.id, res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

export default router;

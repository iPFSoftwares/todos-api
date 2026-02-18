import { Router } from "express";
import { AppDataSource } from "../data-source";
import { Todo } from "../entity/Todo";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const todoRepo = () => AppDataSource.getRepository(Todo);

router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const userId = _req.user!.id;
    const todos = await todoRepo().find({
      where: { userId },
      order: { createdAt: "DESC" }
    });
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const todo = await todoRepo().findOne({ where: { id, userId } });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const title = String(req.body?.title || "").trim();
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    const status = req.body?.status
      ? String(req.body.status)
      : "in_progress";
    if (!["in_progress", "backlog", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const todo = todoRepo().create({
      title,
      status: status as "in_progress" | "backlog" | "completed",
      userId: req.user!.id
    });
    const saved = await todoRepo().save(todo);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const todo = await todoRepo().findOne({ where: { id, userId } });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    const hasTitle = "title" in req.body;
    const hasStatus = "status" in req.body;

    if (hasTitle) {
      const title = String(req.body?.title || "").trim();
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      todo.title = title;
    }

    if (hasStatus) {
      const status = String(req.body?.status || "");
      if (!["in_progress", "backlog", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      todo.status = status as "in_progress" | "backlog" | "completed";
    }

    const saved = await todoRepo().save(todo);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user!.id;
    const result = await todoRepo().delete({ id, userId });
    if (result.affected === 0) {
      return res.status(404).json({ message: "Todo not found" });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;

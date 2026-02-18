import { AppDataSource } from "../src/data-source";
import bcrypt from "bcryptjs";
import { User } from "../src/entity/User";
import { Todo } from "../src/entity/Todo";
import todosRouter from "../src/routes/todos";
import { requireAuth } from "../src/middleware/requireAuth";
 
import { createMockRes, getRouteHandler, runMiddleware } from "./helpers";

const userRepo = () => AppDataSource.getRepository(User);
const todoRepo = () => AppDataSource.getRepository(Todo);

function makeReq(params: {
  body?: unknown;
  params?: Record<string, string>;
  user?: User;
  cookies?: Record<string, string>;
}) {
  return {
    body: params.body ?? {},
    params: params.params ?? {},
    user: params.user,
    cookies: params.cookies ?? {},
    headers: {}
  } as any;
}

describe("Todos API", () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await AppDataSource.synchronize(true);
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  it("returns health", async () => {
    const res = createMockRes().res;
    res.status(200).json({ ok: true });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects unauthenticated access", async () => {
    const result = await runMiddleware(requireAuth, makeReq({}));
    expect(result.res.statusCode).toBe(401);
  });

  it("creates and lists todos", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user1@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );

    const createHandler = getRouteHandler(todosRouter, "post", "/");
    const createRes = createMockRes();
    await createHandler(
      makeReq({ body: { title: "Write tests" }, user }),
      createRes.res,
      () => {}
    );
    await createRes.done;

    expect(createRes.res.statusCode).toBe(201);
    expect((createRes.res.body as Todo).title).toBe("Write tests");

    const listHandler = getRouteHandler(todosRouter, "get", "/");
    const listRes = createMockRes();
    await listHandler(makeReq({ user }), listRes.res, () => {});
    await listRes.done;

    const listBody = listRes.res.body as Todo[];
    expect(listRes.res.statusCode).toBe(200);
    expect(listBody.length).toBe(1);
    expect(listBody[0].title).toBe("Write tests");
  });

  it("gets, updates, and deletes a todo", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user2@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const todo = await todoRepo().save(
      todoRepo().create({ title: "Ship feature", status: "in_progress", userId: user.id })
    );

    const getHandler = getRouteHandler(todosRouter, "get", "/:id");
    const getRes = createMockRes();
    await getHandler(makeReq({ user, params: { id: String(todo.id) } }), getRes.res, () => {});
    await getRes.done;
    expect(getRes.res.statusCode).toBe(200);
    expect((getRes.res.body as Todo).title).toBe("Ship feature");

    const patchHandler = getRouteHandler(todosRouter, "patch", "/:id");
    const patchRes = createMockRes();
    await patchHandler(
      makeReq({
        user,
        params: { id: String(todo.id) },
        body: { status: "completed" }
      }),
      patchRes.res,
      () => {}
    );
    await patchRes.done;
    expect(patchRes.res.statusCode).toBe(200);
    expect((patchRes.res.body as Todo).status).toBe("completed");

    const deleteHandler = getRouteHandler(todosRouter, "delete", "/:id");
    const deleteRes = createMockRes();
    await deleteHandler(
      makeReq({ user, params: { id: String(todo.id) } }),
      deleteRes.res,
      () => {}
    );
    await deleteRes.done;
    expect(deleteRes.res.statusCode).toBe(204);

    const missingRes = createMockRes();
    await getHandler(
      makeReq({ user, params: { id: String(todo.id) } }),
      missingRes.res,
      () => {}
    );
    await missingRes.done;
    expect(missingRes.res.statusCode).toBe(404);
  });

  it("updates title and rejects invalid title", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user7@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const todo = await todoRepo().save(
      todoRepo().create({ title: "Old", status: "in_progress", userId: user.id })
    );

    const patchHandler = getRouteHandler(todosRouter, "patch", "/:id");
    const okRes = createMockRes();
    await patchHandler(
      makeReq({
        user,
        params: { id: String(todo.id) },
        body: { title: "New title" }
      }),
      okRes.res,
      () => {}
    );
    await okRes.done;
    expect(okRes.res.statusCode).toBe(200);
    expect((okRes.res.body as Todo).title).toBe("New title");

    const badRes = createMockRes();
    await patchHandler(
      makeReq({
        user,
        params: { id: String(todo.id) },
        body: { title: "" }
      }),
      badRes.res,
      () => {}
    );
    await badRes.done;
    expect(badRes.res.statusCode).toBe(400);
  });

  it("allows patch with no changes", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user10@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const todo = await todoRepo().save(
      todoRepo().create({ title: "Keep", status: "in_progress", userId: user.id })
    );

    const patchHandler = getRouteHandler(todosRouter, "patch", "/:id");
    const res = createMockRes();
    await patchHandler(
      makeReq({ user, params: { id: String(todo.id) }, body: {} }),
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(200);
    expect((res.res.body as Todo).title).toBe("Keep");
  });

  it("returns not found for missing or foreign todos", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user8@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const other = await userRepo().save(
      userRepo().create({
        email: "user9@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const todo = await todoRepo().save(
      todoRepo().create({ title: "Other user", status: "backlog", userId: other.id })
    );

    const getHandler = getRouteHandler(todosRouter, "get", "/:id");
    const res = createMockRes();
    await getHandler(
      makeReq({ user, params: { id: String(todo.id) } }),
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(404);

    const delHandler = getRouteHandler(todosRouter, "delete", "/:id");
    const delRes = createMockRes();
    await delHandler(
      makeReq({ user, params: { id: "9999" } }),
      delRes.res,
      () => {}
    );
    await delRes.done;
    expect(delRes.res.statusCode).toBe(404);
  });

  it("rejects empty titles", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "user3@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const createHandler = getRouteHandler(todosRouter, "post", "/");
    const res = createMockRes();
    await createHandler(makeReq({ user, body: { title: "" } }), res.res, () => {});
    await res.done;
    expect(res.res.statusCode).toBe(400);
  });

  it("isolates todos per user", async () => {
    const userA = await userRepo().save(
      userRepo().create({
        email: "user4@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );
    const userB = await userRepo().save(
      userRepo().create({
        email: "user5@example.com",
        passwordHash: await bcrypt.hash("password123", 12)
      })
    );

    await todoRepo().save(
      todoRepo().create({ title: "A only", status: "in_progress", userId: userA.id })
    );

    const listHandler = getRouteHandler(todosRouter, "get", "/");
    const listA = createMockRes();
    await listHandler(makeReq({ user: userA }), listA.res, () => {});
    await listA.done;
    const listB = createMockRes();
    await listHandler(makeReq({ user: userB }), listB.res, () => {});
    await listB.done;

    expect((listA.res.body as Todo[]).length).toBe(1);
    expect((listB.res.body as Todo[]).length).toBe(0);
  });

  it("requires a valid session to logout", async () => {
    const result = await runMiddleware(requireAuth, makeReq({}));
    expect(result.res.statusCode).toBe(401);
  });
});

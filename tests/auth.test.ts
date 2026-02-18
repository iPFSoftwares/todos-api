import bcrypt from "bcryptjs";
import { AppDataSource } from "../src/data-source";
import { User } from "../src/entity/User";
import { Session } from "../src/entity/Session";
import { hashToken } from "../src/utils/sessions";
import authRouter from "../src/routes/auth";
import { requireAuth } from "../src/middleware/requireAuth";
import { createMockRes, getRouteHandler, runMiddleware } from "./helpers";

const userRepo = () => AppDataSource.getRepository(User);
const sessionRepo = () => AppDataSource.getRepository(Session);

async function register(email: string) {
  const handler = getRouteHandler(authRouter, "post", "/register");
  const res = createMockRes();
  await handler(
    { body: { email, password: "password123" }, headers: {} } as any,
    res.res,
    () => {}
  );
  await res.done;
  return res.res;
}

describe("Auth API", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  beforeEach(async () => {
    await AppDataSource.synchronize(true);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("registers and sets a session cookie", async () => {
    const res = await register("new@example.com");
    expect(res.statusCode).toBe(201);
    expect((res.body as User).email).toBe("new@example.com");
    expect(res.cookies.sid).toBeDefined();
  });

  it("validates registration input", async () => {
    const handler = getRouteHandler(authRouter, "post", "/register");
    const missing = createMockRes();
    await handler({ body: {}, headers: {} } as any, missing.res, () => {});
    await missing.done;
    expect(missing.res.statusCode).toBe(400);

    const invalid = createMockRes();
    await handler(
      { body: { email: "not-an-email", password: "pw" }, headers: {} } as any,
      invalid.res,
      () => {}
    );
    await invalid.done;
    expect(invalid.res.statusCode).toBe(400);
  });

  it("rejects duplicate registration", async () => {
    await register("dupe@example.com");
    const handler = getRouteHandler(authRouter, "post", "/register");
    const res = createMockRes();
    await handler(
      { body: { email: "dupe@example.com", password: "password123" }, headers: {} } as any,
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(409);
  });

  it("rejects invalid login", async () => {
    await register("login@example.com");
    const handler = getRouteHandler(authRouter, "post", "/login");
    const res = createMockRes();
    await handler(
      { body: { email: "login@example.com", password: "wrong" }, headers: {} } as any,
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(401);
  });

  it("validates login input and missing user", async () => {
    const handler = getRouteHandler(authRouter, "post", "/login");
    const missing = createMockRes();
    await handler({ body: {}, headers: {} } as any, missing.res, () => {});
    await missing.done;
    expect(missing.res.statusCode).toBe(400);

    const notFound = createMockRes();
    await handler(
      { body: { email: "absent@example.com", password: "pw" }, headers: {} } as any,
      notFound.res,
      () => {}
    );
    await notFound.done;
    expect(notFound.res.statusCode).toBe(401);
  });

  it("logs in and returns user", async () => {
    await register("user@example.com");
    const handler = getRouteHandler(authRouter, "post", "/login");
    const res = createMockRes();
    await handler(
      { body: { email: "user@example.com", password: "password123" }, headers: {} } as any,
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(200);
    expect((res.res.body as User).email).toBe("user@example.com");
    expect(res.res.cookies.sid).toBeDefined();
  });

  it("requires auth for me endpoint", async () => {
    const noAuth = await runMiddleware(requireAuth, { headers: {}, cookies: {} } as any);
    expect(noAuth.res.statusCode).toBe(401);

    const registered = await register("me@example.com");
    const meHandler = getRouteHandler(authRouter, "get", "/me", -1);
    const res = createMockRes();
    await meHandler(
      {
        headers: {},
        user: (registered.body as User),
        cookies: { sid: registered.cookies.sid }
      } as any,
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(200);
    expect((res.res.body as User).email).toBe("me@example.com");
  });

  it("rejects expired session", async () => {
    const passwordHash = await bcrypt.hash("password123", 12);
    const user = await userRepo().save(
      userRepo().create({ email: "expired@example.com", passwordHash })
    );

    const token = "expired-token";
    await sessionRepo().save(
      sessionRepo().create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() - 1000)
      })
    );

    const result = await runMiddleware(
      requireAuth,
      { headers: {}, cookies: { sid: token } } as any
    );
    expect(result.res.statusCode).toBe(401);
  });

  it("rejects sessions with missing users", async () => {
    await AppDataSource.query("PRAGMA foreign_keys=OFF");
    const token = "missing-user-token";
    await sessionRepo().save(
      sessionRepo().create({
        userId: 9999,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000)
      })
    );
    await AppDataSource.query("PRAGMA foreign_keys=ON");

    const result = await runMiddleware(
      requireAuth,
      { headers: {}, cookies: { sid: token } } as any
    );
    expect(result.res.statusCode).toBe(401);
  });

  it("logs out only with a valid session", async () => {
    const registered = await register("logout@example.com");
    const logoutHandler = getRouteHandler(authRouter, "post", "/logout", -1);
    const res = createMockRes();
    await logoutHandler(
      {
        headers: {},
        user: registered.body as User,
        session: await sessionRepo().findOneOrFail({ where: { userId: (registered.body as User).id } })
      } as any,
      res.res,
      () => {}
    );
    await res.done;
    expect(res.res.statusCode).toBe(204);
  });

  it("propagates unexpected errors", async () => {
    const handler = getRouteHandler(authRouter, "post", "/register");
    const repo = userRepo();
    const original = repo.findOne;
    repo.findOne = () => {
      throw new Error("boom");
    };
    let caught: unknown;
    await handler(
      { body: { email: "err@example.com", password: "pw" }, headers: {} } as any,
      createMockRes().res,
      (err?: unknown) => {
        caught = err;
      }
    );
    repo.findOne = original;
    expect(caught).toBeInstanceOf(Error);
  });

  it("propagates login errors", async () => {
    const handler = getRouteHandler(authRouter, "post", "/login");
    const repo = userRepo();
    const original = repo.findOne;
    repo.findOne = () => {
      throw new Error("boom");
    };
    let caught: unknown;
    await handler(
      { body: { email: "err@example.com", password: "pw" }, headers: {} } as any,
      createMockRes().res,
      (err?: unknown) => {
        caught = err;
      }
    );
    repo.findOne = original;
    expect(caught).toBeInstanceOf(Error);
  });
});

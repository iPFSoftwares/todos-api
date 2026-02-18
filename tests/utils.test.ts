import { AppDataSource } from "../src/data-source";
import { User } from "../src/entity/User";
import { Session } from "../src/entity/Session";
import bcrypt from "bcryptjs";
import { createMockRes, runMiddleware } from "./helpers";
import { createSession, clearSession, hashToken } from "../src/utils/sessions";
import { requireAuth } from "../src/middleware/requireAuth";

const userRepo = () => AppDataSource.getRepository(User);
const sessionRepo = () => AppDataSource.getRepository(Session);

describe("utils", () => {
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

  it("hashes and verifies passwords", () => {
    const hash = bcrypt.hashSync("secret", 12);
    expect(hash.length).toBeGreaterThan(20);
    expect(bcrypt.compareSync("secret", hash)).toBe(true);
    expect(bcrypt.compareSync("wrong", hash)).toBe(false);
  });

  it("creates and clears sessions", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "session@example.com",
        passwordHash: await bcrypt.hash("pw", 12)
      })
    );
    const { res } = createMockRes();
    const session = await createSession(user.id, res);

    expect(res.cookies.sid).toBeDefined();
    expect(session.userId).toBe(user.id);

    await clearSession(session.id, res);
    const found = await sessionRepo().findOne({ where: { id: session.id } });
    expect(found).toBeNull();
  });

  it("requireAuth passes with valid session", async () => {
    const user = await userRepo().save(
      userRepo().create({
        email: "auth@example.com",
        passwordHash: await bcrypt.hash("pw", 12)
      })
    );
    const token = "valid-token";
    await sessionRepo().save(
      sessionRepo().create({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60_000)
      })
    );

    const req = { headers: {}, cookies: { sid: token } } as any;
    const result = await runMiddleware(requireAuth, req);
    expect(result.nextCalled).toBe(true);
    expect(req.user?.id).toBe(user.id);
  });

  it("requireAuth forwards unexpected errors", async () => {
    const repo = sessionRepo();
    const original = repo.findOne;
    repo.findOne = () => {
      throw new Error("boom");
    };

    let caught: unknown;
    await requireAuth(
      { headers: {}, cookies: { sid: "token" } } as any,
      createMockRes().res as any,
      (err?: unknown) => {
        caught = err;
      }
    );

    repo.findOne = original;
    expect(caught).toBeInstanceOf(Error);
  });
});

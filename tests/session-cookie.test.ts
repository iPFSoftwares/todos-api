import { sessionCookieOptions } from "../src/utils/sessions";

describe("session cookie transport", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecure = process.env.SESSION_COOKIE_SECURE;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalSecure === undefined) delete process.env.SESSION_COOKIE_SECURE;
    else process.env.SESSION_COOKIE_SECURE = originalSecure;
  });

  it.each(["development", "production"])("defaults safely in %s", (mode) => {
    process.env.NODE_ENV = mode;
    delete process.env.SESSION_COOKIE_SECURE;
    expect(sessionCookieOptions(new Date()).secure).toBe(mode === "production");
  });

  it.each(["true", "false"])("allows an explicit transport setting %s", (secure) => {
    process.env.NODE_ENV = "production";
    process.env.SESSION_COOKIE_SECURE = secure;
    expect(sessionCookieOptions(new Date())).toEqual(expect.objectContaining({
      secure: secure === "true", httpOnly: true, sameSite: "lax"
    }));
  });
});

import type { NextFunction, Request, Response } from "express";

export function createMockRes() {
  let resolveDone: (() => void) | undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    clearedCookies: [],
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      resolveDone?.();
      return this;
    },
    send(payload?: unknown) {
      this.body = payload;
      resolveDone?.();
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    cookie(name: string, value: string) {
      this.cookies[name] = value;
      return this;
    },
    clearCookie(name: string) {
      this.clearedCookies.push(name);
      return this;
    }
  } as any;

  return { res, done };
}

export async function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request
) {
  const { res, done } = createMockRes();
  let nextCalled = false;
  const next: NextFunction = (err?: unknown) => {
    if (err) {
      throw err;
    }
    nextCalled = true;
  };
  await middleware(req, res, next);
  if (!nextCalled) {
    await done;
  }
  return { res, nextCalled };
}

export function getRouteHandler(
  router: any,
  method: "get" | "post" | "patch" | "delete",
  path: string,
  handlerIndex = 0
) {
  const layer = router.stack.find(
    (item: any) => item.route?.path === path && item.route.methods?.[method]
  );
  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }
  const stack = layer.route.stack;
  const index = handlerIndex < 0 ? stack.length + handlerIndex : handlerIndex;
  const handler = stack[index]?.handle;
  if (!handler) {
    throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
  }
  return handler;
}

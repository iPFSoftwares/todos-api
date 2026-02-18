import { errorHandler } from "../src/middleware/error";
import { createMockRes } from "./helpers";

describe("error handler", () => {
  it("returns 500 and message", () => {
    const { res } = createMockRes();
    errorHandler(new Error("boom"), {} as any, res as any, () => {});
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});

describe("data-source config", () => {
  it("uses file database outside test", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppDataSource } = require("../src/data-source");
    expect(AppDataSource.options.database).toBe("data.sqlite");
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });
});

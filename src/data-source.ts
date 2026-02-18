import "reflect-metadata";
import { DataSource } from "typeorm";
import { Todo } from "./entity/Todo";
import { User } from "./entity/User";
import { Session } from "./entity/Session";

const isTest = process.env.NODE_ENV === "test";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: isTest ? ":memory:" : process.env.DATABASE_URL || "data.sqlite",
  synchronize: true,
  logging: false,
  entities: [Todo, User, Session],
  migrations: [],
  subscribers: []
});

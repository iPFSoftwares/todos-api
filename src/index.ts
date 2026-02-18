import { AppDataSource } from "./data-source";
import { createApp } from "./app";

const PORT = Number(process.env.PORT || 8080);
const app = createApp();

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize data source", err);
    process.exit(1);
  });

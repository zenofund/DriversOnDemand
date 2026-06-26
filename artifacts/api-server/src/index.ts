import app from "./app";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes/routes";
import { startAutoCompleteWorker } from "./services/autoCompleteService";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  const server = await registerRoutes(app);

  server.listen(port, () => {
    logger.info({ port }, "Server listening");
    startAutoCompleteWorker();
  });
})();

import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminUser, seedUsersFromFile } from "./lib/auth-utils";

/* Prevent unhandled promise rejections from crashing the server silently */
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection — server kept alive");
});
process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException — server kept alive");
});

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

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed superadmin first, then restore any other users from the seed file
  await seedAdminUser();
  await seedUsersFromFile();
  logger.info("User seed complete");
});

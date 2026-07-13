import app from "./app";
import { logger } from "./lib/logger";
import { ensureBootstrapUser } from "./lib/auth";
import { claimOrphanStudyActivity } from "./lib/studyActivity";

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

async function start() {
  try {
    await ensureBootstrapUser();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (adminEmail) {
      const { findUserByEmail } = await import("./lib/auth");
      const admin = await findUserByEmail(adminEmail);
      if (admin) await claimOrphanStudyActivity(admin.id);
    }
  } catch (err) {
    logger.error({ err }, "Bootstrap user migration failed");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();

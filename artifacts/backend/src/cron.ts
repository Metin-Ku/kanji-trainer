import { CronJob } from "cron";
import { isDemoAutoLoginEnabled } from "./lib/auth";

const backendUrl = isDemoAutoLoginEnabled()
  ? "https://kanji-trainer-cv.onrender.com/api/healthz"
  : "https://kanji-trainer.onrender.com/api/healthz";

const job = new CronJob("*/14 * * * *", async () => {
  try {
    console.log("Restarting server");

    const res = await fetch(backendUrl);

    if (res.ok) {
      console.log("Server restarted");
    } else {
      console.error(`Failed with status ${res.status}`);
    }
  } catch (err) {
    console.error("Error during restart:", err);
  }
});

job.start();

export default job;
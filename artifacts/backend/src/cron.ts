import { CronJob } from "cron";

function isDemoAutoLoginEnabled(): boolean {
  const v = process.env.DEMO_AUTO_LOGIN?.trim().toLowerCase();
  return v === "true" || v === "1";
}

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
console.log(`[cron] keep-alive job started → ${backendUrl} (every 14 min)`);

export default job;
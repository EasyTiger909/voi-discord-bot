import { CronJob } from "cron";
import { Client } from "discord.js";
import { scheduledScripts } from "./db/config.js";

const runScript = async (scriptName: string, client: Client) => {
  try {
    const script = await import(`./scripts/${scriptName}.js`);
    await script.run(client);
  } catch (error) {
    console.log(error);
  }
};

export const scheduleScripts = (client: Client) => {
  scheduledScripts.forEach((t) => {
    const task = new CronJob(
      t.cronTime,
      () => {
        void runScript(t.scriptName, client);
      },
      null,
      false,
    );
    task.start();
    console.log(`Scheduled script '${t.scriptName}' for ${t.cronTime}`);
  });
};

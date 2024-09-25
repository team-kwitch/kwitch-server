import { config } from "@/config";
import { assert } from "console";
import * as mediasoup from "mediasoup";

let worker: mediasoup.types.Worker;

export async function createWorker() {
  console.info("running %d mediasoup Workers...", 1);

  const newWorker = await mediasoup.createWorker({
    logLevel: "warn",
  });

  newWorker.on("died", () => {
    console.error(
      "mediasoup Worker died, exiting  in 2 seconds... [pid:%d]",
      newWorker.pid,
    );

    setTimeout(() => process.exit(1), 2000);
  });

  worker = newWorker;

  const { webRtcServerOptions } = config.mediasoup;
  const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);
  worker.appData.webRtcServer = webRtcServer;

  setInterval(async () => {
    const usage = await worker.getResourceUsage();

    console.info(
      "mediasoup Worker resource usage [pid:%d]: %o",
      worker.pid,
      usage,
    );

    const dump = await worker.dump();
    console.info("mediasoup Worker dump [pid:%d]: %o", worker.pid, dump);
  }, 120000);
}

export function getWorker() {
  assert(worker, "mediasoup Worker not initialized");
  return worker;
}

import * as mediasoup from "mediasoup";

import { config } from "@/config";

import { getWorker } from ".";

const broadcasts = [];

export interface Peer {
  rtpCapabilities: mediasoup.types.RtpCapabilities;
}

export interface Broadcaster {
  channelId: string;
  rtpCapabilities: mediasoup.types.RtpCapabilities;
  producerTransport: mediasoup.types.Transport;
  consumerTransport: mediasoup.types.Transport;
}

export default class Broadcast {
  private readonly router: mediasoup.types.Router;

  private constructor(router: mediasoup.types.Router) {
    this.router = router;
  }

  public static async create() {
    const worker = getWorker();
    const { mediaCodecs } = config.mediasoup;
    const router = await worker.createRouter({
      mediaCodecs,
    });

    return new Broadcast(router);
  }
}

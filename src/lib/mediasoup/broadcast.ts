import { Channel } from "@prisma/client";
import * as mediasoup from "mediasoup";

import { config } from "@/config";

import { getWorker } from ".";

export interface Peer {
  recvTransport: mediasoup.types.WebRtcTransport;
  consumers: Map<string, mediasoup.types.Consumer>; // Map<consumerId, Consumer>
}

export interface Broadcaster {
  sendTransport: mediasoup.types.WebRtcTransport;
  producers: Map<string, mediasoup.types.Producer>; // Map<producerId, Producer>
}

export default class Broadcast {
  private readonly router: mediasoup.types.Router;
  private readonly channel: Channel;

  private readonly broadcaster: Broadcaster = { sendTransport: null, producers: new Map() };
  private readonly peers: Map<string, Peer> = new Map(); // Map<socketId, Peer>

  public title: string;

  private constructor({
    router,
    channel,
  }: {
    router: mediasoup.types.Router;
    channel: Channel;
  }) {
    this.router = router;
    this.channel = channel;
  }

  public static async create({ channel }: { channel: Channel }) {
    const worker = getWorker();
    const { routerOptions } = config.mediasoup;
    const router = await worker.createRouter(routerOptions);

    return new Broadcast({
      router,
      channel,
    });
  }

  public getRouter() {
    return this.router;
  }

  public getChannel() {
    return this.channel;
  }

  public getSendTransport() {
    return this.broadcaster.sendTransport;
  }

  public getRecvTransport(socketId: string) {
    return this.peers.get(socketId).recvTransport;
  }

  public getProducer(producerId: string) {
    return this.broadcaster.producers.get(producerId);
  }

  public getConsumer(socketId: string, consumerId: string) {
    return this.peers.get(socketId).consumers.get(consumerId);
  }

  public getProducerIds() {
    return Array.from(this.broadcaster.producers.keys());
  }

  public setSendTransport(transport: mediasoup.types.WebRtcTransport) {
    this.broadcaster.sendTransport = transport;
  }

  public setRecvTransport(
    socketId: string,
    transport: mediasoup.types.WebRtcTransport,
  ) {
    if (!this.peers.has(socketId)) {
      this.peers.set(socketId, { recvTransport: null, consumers: new Map() });
    }
    this.peers.get(socketId).recvTransport = transport;
  }

  public addProducer(producer: mediasoup.types.Producer) {
    this.broadcaster.producers.set(producer.id, producer);
  }

  public addConsumer(socketId: string, consumer: mediasoup.types.Consumer) {
    if (!this.peers.has(socketId)) {
      this.peers.set(socketId, { recvTransport: null, consumers: new Map() });
    }
    this.peers.get(socketId).consumers.set(consumer.id, consumer);
  }
}

import { Channel } from "@prisma/client";
import * as mediasoup from "mediasoup";
import { Socket } from "socket.io";

import { config } from "@/config";

import { getWorker } from ".";

export interface Peer {
  socket: Socket;
  broadcastId: string;
  transports: mediasoup.types.Transport[];
  producers: mediasoup.types.Producer[];
  consumers: mediasoup.types.Consumer[];
}

export interface Broadcaster {
  channelId: string;
  rtpCapabilities: mediasoup.types.RtpCapabilities;
  producerTransport: mediasoup.types.Transport;
  consumerTransport: mediasoup.types.Transport;
}

export default class Broadcast {
  private readonly _router: mediasoup.types.Router;
  private readonly _channel: Channel;

  private _producerTransport: mediasoup.types.Transport;
  private _consumerTransports: Map<string, mediasoup.types.Transport>; // Map<socketId, Transport>
  private _producer: mediasoup.types.Producer;
  private _consumers: Map<string, mediasoup.types.Consumer>; // Map<socketId, Consume>

  public title: string;

  private constructor({
    router,
    channel,
  }: {
    router: mediasoup.types.Router;
    channel: Channel;
  }) {
    this._router = router;
    this._channel = channel;
  }

  public static async create({ channel }: { channel: Channel }) {
    const worker = getWorker();
    const { mediaCodecs } = config.mediasoup;
    const router = await worker.createRouter({
      mediaCodecs,
    });

    return new Broadcast({
      router,
      channel,
    });
  }

  public getRouter() {
    return this._router;
  }

  public getChannel() {
    return this._channel;
  }

  public getProducerTransport() {
    return this._producerTransport;
  }

  public getConsumerTransport(socketId: string) {
    return this._consumerTransports[socketId];
  }

  public getProducer() {
    return this._producer;
  }

  public getConsumer(socketId: string) {
    return this._consumers[socketId];
  }

  public setProducerTransport(transport: mediasoup.types.Transport) {
    this._producerTransport = transport;
  }

  public addConsumerTransport(socketId: string, transport: mediasoup.types.Transport) {
    this._consumerTransports.set(socketId, transport);
  }

  public setProducer(producer: mediasoup.types.Producer) {
    this._producer = producer;
  }

  public addConsumer(socketId: string, consumer: mediasoup.types.Consumer) {
    this._consumers.set(socketId, consumer);
  }
}

import * as mediasoup from "mediasoup";
import { Server, Socket } from "socket.io";
import Container from "typedi";

import { config } from "@/config";
import { BroadcastService } from "@/services/BroadcastService";

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
let producer: mediasoup.types.Producer;
let consumer: mediasoup.types.Consumer;
let producerTransport: mediasoup.types.WebRtcTransport;
let consumerTransport: mediasoup.types.WebRtcTransport;

export class SFUConnectionHandler {
  public static readonly broadcastService: BroadcastService =
    Container.get(BroadcastService);

  public static register(io: Server, socket: Socket) {
    const createTransport = async (
      router: mediasoup.types.Router,
    ): Promise<mediasoup.types.WebRtcTransport> => {
      const { transportOptions } = config.mediasoup;
      const transport = await router.createWebRtcTransport(transportOptions);
      console.log(`transport ID: ${transport.id}`);

      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          console.log("transport closed");
        }
      });

      return transport;
    };

    socket.on(
      "sfu:create-transport",
      async (
        { channelId, isProducer }: { channelId: string; isProducer: boolean },
        done,
      ) => {
        console.log("Is this a producer request?", isProducer);
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const router = broadcast.getRouter();

        try {
          const transport = await createTransport(router);
          if (isProducer) {
            broadcast.setProducerTransport(transport);
          } else {
            broadcast.addConsumerTransport(socket.id, transport);
          }
          done({
            success: true,
            content: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          });
        } catch (err: any) {
          console.error("Error creating transport:", err);
          done({ success: false, error: err.message });
        }
      },
    );

    socket.on(
      "sfu:transport-producer-connect",
      async ({
        channelId,
        dtlsParameters,
      }: {
        channelId: string;
        dtlsParameters: mediasoup.types.DtlsParameters;
      }) => {
        console.log("DTLS PARAMS...", { dtlsParameters });
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const producerTransport = broadcast.getProducerTransport();
        producerTransport.connect({ dtlsParameters });
      },
    );

    socket.on(
      "sfu:transport-consumer-connect",
      async ({
        channelId,
        dtlsParameters,
      }: {
        channelId: string;
        dtlsParameters: mediasoup.types.DtlsParameters;
      }) => {
        console.log("DTLS PARAMS...", { dtlsParameters });
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const consumerTransport = broadcast.getConsumerTransport(socket.id);
        consumerTransport.connect({ dtlsParameters });
      },
    );

    socket.on(
      "sfu:transport-produce",
      async (
        {
          channelId,
          producerOptions,
        }: {
          channelId: string;
          producerOptions: mediasoup.types.ProducerOptions;
        },
        done,
      ) => {
        try {
          const broadcast = this.broadcastService.getBroadcast(channelId);

          const { kind, rtpParameters } = producerOptions;
          const producerTransport = broadcast.getProducerTransport();
          const producer = await producerTransport.produce({
            kind,
            rtpParameters,
          });

          console.log(`producer ID: ${producer.id}, kind: ${producer.kind}`);

          producer.on("transportclose", () => {
            console.log("producer transport closed");
          });

          broadcast.setProducer(producer);

          done({ success: true, content: { id: producer.id } });
        } catch (err: any) {
          console.error("Error creating producer:", err);
          done({ success: false, error: err.message });
        }
      },
    );

    socket.on(
      "sfu:transport-consume",
      async (
        {
          channelId,
          rtpCapabilities,
        }: {
          channelId: string;
          rtpCapabilities: mediasoup.types.RtpCapabilities;
        },
        done,
      ) => {
        try {
          const broadcast = this.broadcastService.getBroadcast(channelId);
          const router = broadcast.getRouter();
          const producer = broadcast.getProducer();
          const consumerTransport = broadcast.getConsumerTransport(socket.id);

          if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
            const consumer = await consumerTransport.consume({
              producerId: producer.id,
              rtpCapabilities,
              paused: true,
            });

            consumer.on("transportclose", () => {
              console.log("consumer transport closed");
            });

            consumer.on("producerclose", () => {
              console.log("producer closed");
            });

            broadcast.addConsumer(socket.id, consumer);

            done({
              success: true,
              content: {
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
              },
            });
          }
        } catch (err: any) {
          console.log(err.message);
          done({
            success: false,
            error: err.message,
          });
        }
      },
    );

    socket.on(
      "sfu:consumer-resume",
      async ({ channelId }: { channelId: string }) => {
        console.log(
          `[consumer-resume] channelId: ${channelId}, socketId: ${socket.id}`,
        );
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const consumer = broadcast.getConsumer(socket.id);
        await consumer.resume();
      },
    );
  }
}

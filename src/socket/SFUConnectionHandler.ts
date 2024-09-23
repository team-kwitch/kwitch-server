import * as mediasoup from "mediasoup";
import { Server, Socket } from "socket.io";
import { Service } from "typedi";

import { config } from "@/config";
import { BroadcastService } from "@/services/BroadcastService";

import { SocketHandler, socketHandlerToken } from ".";

@Service({ id: socketHandlerToken, multiple: true })
export class SFUConnectionHandler implements SocketHandler {
  public readonly broadcastService: BroadcastService;

  constructor(broadcastService: BroadcastService) {
    this.broadcastService = broadcastService;
  }

  public register(io: Server, socket: Socket) {
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
        { channelId, isSender }: { channelId: string; isSender: boolean },
        done,
      ) => {
        console.log("Is this a producer request?", isSender);
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const router = broadcast.getRouter();

        try {
          const transport = await createTransport(router);
          if (isSender) {
            broadcast.setSendTransport(transport);
          } else {
            broadcast.setRecvTransport(socket.id, transport);
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
      "sfu:send-transport-connect",
      async ({
        channelId,
        dtlsParameters,
      }: {
        channelId: string;
        dtlsParameters: mediasoup.types.DtlsParameters;
      }) => {
        console.log("DTLS PARAMS...", { dtlsParameters });
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const sendTransport = broadcast.getSendTransport();
        sendTransport.connect({ dtlsParameters });
      },
    );

    socket.on(
      "sfu:recv-transport-connect",
      async ({
        channelId,
        dtlsParameters,
      }: {
        channelId: string;
        dtlsParameters: mediasoup.types.DtlsParameters;
      }) => {
        console.log("DTLS PARAMS...", { dtlsParameters });
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const recvTransport = broadcast.getRecvTransport(socket.id);
        recvTransport.connect({ dtlsParameters });
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
          const sendTransport = broadcast.getSendTransport();
          const producer = await sendTransport.produce({
            kind,
            rtpParameters,
          });

          console.log(`producer ID: ${producer.id}, kind: ${producer.kind}`);

          producer.on("transportclose", () => {
            console.log("producer transport closed");
          });

          broadcast.addProducer(producer);

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
          producerId,
          rtpCapabilities,
        }: {
          channelId: string;
          producerId: string;
          rtpCapabilities: mediasoup.types.RtpCapabilities;
        },
        done,
      ) => {
        try {
          const broadcast = this.broadcastService.getBroadcast(channelId);
          const router = broadcast.getRouter();
          const producer = broadcast.getProducer(producerId);
          const recvTransport = broadcast.getRecvTransport(socket.id);

          if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
            const consumer = await recvTransport.consume({
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
          console.error(err);
          done({
            success: false,
            error: err.message,
          });
        }
      },
    );

    socket.on(
      "sfu:consumer-resume",
      async ({ channelId, consumerId }: { channelId: string, consumerId: string }) => {
        console.log(
          `[consumer-resume] channelId: ${channelId}, socketId: ${socket.id}`,
        );
        const broadcast = this.broadcastService.getBroadcast(channelId);
        const consumer = broadcast.getConsumer(socket.id, consumerId);
        await consumer.resume();
      },
    );

    socket.on("sfu:get-producers", async ({ channelId }: { channelId: string }, done) => {
      const broadcast = this.broadcastService.getBroadcast(channelId);
      const producerIdMapIterator = broadcast.getProducerIds();
      const producerIds = Array.from(producerIdMapIterator);
      done({ success: true, content: { producerIds } });
    });
  }
}

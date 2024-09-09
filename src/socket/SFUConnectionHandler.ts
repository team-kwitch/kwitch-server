import * as mediasoup from "mediasoup";
import { types as mediasoupTypes } from "mediasoup";
import { Server, Socket } from "socket.io";

let worker: mediasoupTypes.Worker;
let router: mediasoupTypes.Router;
let producer: mediasoupTypes.Producer;
let consumer: mediasoupTypes.Consumer;
let producerTransport: mediasoupTypes.WebRtcTransport;
let consumerTransport: mediasoupTypes.WebRtcTransport;

const createWorker = async () => {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
  });

  worker.on("died", () => {
    console.log("mediasoup worker has died");
  });
};

const mediaCodecs: mediasoupTypes.RtpCodecCapability[] = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

createWorker();

export const registerSFUConnectionHandler = async (
  io: Server,
  socket: Socket,
) => {
  router = await worker.createRouter({ mediaCodecs });

  socket.on("getRtpCapabilities", (cb) => {
    const rtpCapabilities = router.rtpCapabilities;

    console.log("getRtpCapabilities: ", rtpCapabilities);

    cb({ content: rtpCapabilities });
  });

  socket.on(
    "createWebRtcTransport",
    async ({ sender }: { sender: boolean }, cb) => {
      console.log("Is this a sender request?", sender);

      if (sender) {
        producerTransport = await createWebRtcTransport(cb);
      } else {
        consumerTransport = await createWebRtcTransport(cb);
      }
    },
  );

  socket.on(
    "transport-connect",
    async ({
      dtlsParameters,
    }: {
      dtlsParameters: mediasoupTypes.DtlsParameters;
    }) => {
      console.log("DTLS PARAMS...", { dtlsParameters });
      await consumerTransport.connect({ dtlsParameters });
    },
  );

  socket.on(
    "transport-recv-connect",
    async ({
      dtlsParameters,
    }: {
      dtlsParameters: mediasoupTypes.DtlsParameters;
    }) => {
      console.log("DTLS PARAMS...", { dtlsParameters });
      await producerTransport.connect({ dtlsParameters });
    },
  );

  socket.on("transport-produce", async ({ kind, rtpParameters }, cb) => {
    producer = await producerTransport.produce({ kind, rtpParameters });

    console.log(`producer ID: ${producer.id}, kind: ${producer.kind}`);

    producer.on("transportclose", () => {
      console.log("producer transport closed");
    });

    cb({ id: producer.id });
  });

  socket.on("consume", async ({ rtpCapabilities }, cb) => {
    try {
      if (router.canConsume({ producerId: producer.id, rtpCapabilities })) {
        consumer = await consumerTransport.consume({
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

        cb({
          id: consumer.id,
          producerId: producer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      }
    } catch (err: any) {
      console.log(err.message);
      cb({
        error: err.message,
      });
    }
  });

  socket.on("consumer-resume", async () => {
    console.log("consumer resume");
    await consumer.resume();
  });
};

const createWebRtcTransport = async (cb) => {
  try {
    const webRtcTransportOptions = {
      listenIps: [
        {
          ip: "0.0.0.0",
          announcedIp: "127.0.0.1",
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };

    const transport = await router.createWebRtcTransport(
      webRtcTransportOptions,
    );
    console.log(`transport ID: ${transport.id}`);

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") {
        console.log("transport closed");
        transport.close();
      }
    });

    cb({
      content: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      },
    });

    return transport;
  } catch (err: any) {
    console.log(err.message);
    cb({
      error: err.message,
    });
  }
};

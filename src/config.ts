import * as mediasoup from "mediasoup";

export const config: {
  app: {
    port: number;
  };
  mediasoup: {
    mediaCodecs: mediasoup.types.RtpCodecCapability[];
    transportOptions: mediasoup.types.WebRtcTransportOptions;
  };
} = {
  app: { port: parseInt(process.env.PORT || "8000", 10) },
  mediasoup: {
    mediaCodecs: [
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
    ],
    transportOptions: {
      listenIps: [
        {
          ip: process.env.LISTEN_IP || "127.0.0.1",
          announcedIp: process.env.LISTEN_ANNOUNCED_IP || null,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
  },
};

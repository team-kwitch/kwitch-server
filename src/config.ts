import * as mediasoup from "mediasoup";

export const config: {
  https: {
    listenPort: string | number;
  };
  mediasoup: {
    routerOptions: mediasoup.types.RouterOptions;
    transportOptions: mediasoup.types.WebRtcTransportOptions;
    webRtcServerOptions: mediasoup.types.WebRtcServerOptions;
  };
} = {
  https: {
    listenPort: process.env.PORT || 8000,
  },
  mediasoup: {
    routerOptions: {
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
        {
          kind: "video",
          mimeType: "video/VP9",
          clockRate: 90000,
          parameters: {
            "profile-id": 2,
            "x-google-start-bitrate": 1000,
          },
        },
        {
          kind: "video",
          mimeType: "video/h264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "4d0032",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
          },
        },
        {
          kind: "video",
          mimeType: "video/h264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
            "x-google-start-bitrate": 1000,
          },
        },
      ],
    },
    webRtcServerOptions: {
      listenInfos: [
        {
          protocol: "udp",
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: 44444,
        },
        {
          protocol: "tcp",
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: 44444,
        },
      ],
    },
    transportOptions: {
      listenInfos: [
        {
          protocol: "udp",
          ip: "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: 40000,
          portRange: {
            min: parseInt(process.env.MEDIASOUP_MIN_PORT, 10) || 40000,
            max: parseInt(process.env.MEDIASOUP_MAX_PORT, 10) || 49999,
          },
        },
        {
          protocol: "tcp",
          ip: "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP,
          port: 40000,
          portRange: {
            min: parseInt(process.env.MEDIASOUP_MIN_PORT, 10) || 40000,
            max: parseInt(process.env.MEDIASOUP_MAX_PORT, 10) || 49999,
          },
        },
      ],
    },
  },
};

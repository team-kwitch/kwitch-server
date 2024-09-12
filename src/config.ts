import * as mediasoup from "mediasoup";

export const config: {
  mediasoup: {
    mediaCodecs: mediasoup.types.RtpCodecCapability[];
  };
} = {
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
  },
};

import { Service } from "typedi";

import Broadcast from "@/lib/mediasoup/broadcast";

import { ChannelService } from "./ChannelService";

@Service()
export class BroadcastService {
  private readonly channelService: ChannelService;

  // Map<channelId, Broadcast>
  private readonly broadcasts: Map<string, Broadcast> = new Map();

  constructor(channelService: ChannelService) {
    this.channelService = channelService;
  }

  async startBroadcast(userId: number, broadcastTitle: string) {
    const channel = await this.channelService.getChannelByUserId(userId);

    if (this.broadcasts.has(channel.id)) {
      throw new Error("This channel is already on live.");
    }

    const broadcast = await Broadcast.create({ channel });
    const router = broadcast.getRouter();
    const rtpCapabilities = router.rtpCapabilities;
    broadcast.title = broadcastTitle;
    this.broadcasts.set(channel.id, broadcast);

    return {
      channel,
      rtpCapabilities,
    };
  }

  async joinBroadcast(channelId: string) {
    const broadcast = this.getBroadcast(channelId);
    const router = broadcast.getRouter();
    const rtpCapabilities = router.rtpCapabilities;

    // TODO: increase viewer count

    return {
      broadcast,
      rtpCapabilities,
    };
  }

  public getBroadcast(channelId: string) {
    if (!this.broadcasts.has(channelId)) {
      throw new Error("Broadcast not found.");
    }
    return this.broadcasts.get(channelId);
  }

  public getBroadcasts() {
    return Array.from(this.broadcasts.values());
  }
}

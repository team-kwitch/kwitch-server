import { Channel, User } from "@prisma/client";
import { Service } from "typedi";

import prisma from "@/lib/prisma";
import { redisConnection } from "@/lib/redis";
import { BroadcastService } from "./BroadcastService";


@Service()
export class ChannelService {
  private readonly _broadcastService: BroadcastService;

  constructor(broadcastService: BroadcastService) {
    this._broadcastService = broadcastService;
  }

  public getChannelKey(channelId: string) {
    return `channel:${channelId}`;
  }

  public async isOnLive(channelKey: string) {
    const exists = await redisConnection.EXISTS(channelKey);
    return exists === 1;
  }

  public async createChannel(user: User) {
    const createdChannel = await prisma.channel.create({
      data: {
        name: `${user.username}'s channel`,
        ownerId: user.id,
      },
    });

    return createdChannel;
  }

  public async getLiveChannels(cursor: number) {
    const reply = await redisConnection.SCAN(cursor, {
      MATCH: "channel:*",
      COUNT: 10,
    });

    const keys = reply.keys;
    const broadcasts = await Promise.all(
      keys.map(async (key) => {
        const liveBroadcasts = await redisConnection.HGETALL(key);
        const channel = JSON.parse(liveBroadcasts.channel);
        const broadcast = JSON.parse(liveBroadcasts.broadcast);
        const viewers = Number(liveBroadcasts.viewers);
        return { channel, broadcast, viewers };
      }),
    );

    return broadcasts;
  }

  public async getChannelByUserId(userId: number) {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        ownerId: userId,
      },
    });

    return channel;
  }

  public async getChannelById(channelId: string) {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        id: channelId,
      },
    });

    return channel;
  }
}

import { Channel, User } from "@prisma/client";
import { Service } from "typedi";

import prisma from "@/lib/prisma";
import { redisConnection } from "@/lib/redis";

import type { Broadcast } from "../../typings";

@Service()
export class ChannelService {
  getChannelKey(channelId: string) {
    return `channel:${channelId}`;
  }

  async isOnLive(channelKey: string) {
    const exists = await redisConnection.EXISTS(channelKey);
    return exists === 1;
  }

  async createChannel(user: User) {
    const createdChannel = await prisma.channel.create({
      data: {
        name: `${user.username}'s channel`,
        ownerId: user.id,
      },
    });

    return createdChannel;
  }

  async broadcast(userId: number, broadcastTitle: string) {
    const channel = await this.getChannelByUserId(userId);
    const channelKey = this.getChannelKey(channel.id);

    if (await this.isOnLive(channelKey)) {
      throw new Error("This channel is already on live.");
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        title: broadcastTitle,
        channelId: channel.id,
        status: "LIVE",
      },
    });

    await redisConnection.HSET(
      channelKey,
      {
        "channel": JSON.stringify(channel),
        "broadcast": JSON.stringify(broadcast),
        "viewers": 0,
      }
    );

    return broadcast;
  }

  async endBroadcast(userId: number) {
    const channel = await this.getChannelByUserId(userId);
    const channelKey = this.getChannelKey(channel.id);

    if (!await this.isOnLive(channelKey)) {
      throw new Error("This channel is not on live.");
    }

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: {
        channelId: channel.id,
        status: "LIVE",
      },
    });

    await prisma.broadcast.update({
      where: {
        id: broadcast.id,
      },
      data: {
        status: "ENDED",
      },
    });

    await redisConnection.DEL(channelKey);

    return broadcast;
  }

  async joinBroadcast(channelId: string) {
    const channel = await this.getChannelWithBroadcastById(channelId);
    const channelKey = this.getChannelKey(channel.id);

    if (!this.isOnLive(channel.id)) {
      throw new Error("This channel is not on live.");
    }

    await redisConnection.HINCRBY(channelKey, "viewers", 1);

    return channel.broadcast;
  }

  async leaveBroadcast(channelId: string) {
    const channel = await this.getChannelWithBroadcastById(channelId);
    const channelKey = this.getChannelKey(channel.id);

    if (!this.isOnLive(channelKey)) {
      throw new Error("This channel is not on live.");
    }

    await redisConnection.HINCRBY(channelKey, "viewers", -1);

    return channel.broadcast;
  }

  async getLiveChannels(cursor: number) {
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

  async getChannelByUserId(userId: number) {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        ownerId: userId,
      },
    });

    return channel;
  }

  async getChannelById(channelId: string) {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        id: channelId,
      },
    });

    return channel;
  }

  async getChannelWithBroadcastById(channelId: string) {
    const channel = await prisma.channel.findFirstOrThrow({
      where: {
        id: channelId,
      },
    });

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: {
        channelId: channelId,
        status: "LIVE",
      },
    });

    return {
      ...channel,
      broadcast,
    };
  }
}

import { Request } from "express";
import type { Server, Socket } from "socket.io";

import prisma from "@lib/prisma";
import { redisConnection } from "@lib/redis";

import { filterSentence } from "@utils/filter";

import type { Broadcast } from "../typings";

export function getChannelKey(channelId: string) {
  return `channel:${channelId}`;
}

export function registerBroadcastHandler(io: Server, socket: Socket) {
  const req = socket.request as Request;
  const user = req.user;

  socket.on("broadcasts:start", async (title: string, done: Function) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { ownerId: user.id },
      });
  
      const channelKey = getChannelKey(channel.id);
      const isOnLive = await redisConnection.EXISTS(channelKey);
      if (isOnLive) {
        return done({ success: false, message: "You already has a broadcast" });
      }

      // create a broadcast
      const broadcast: Broadcast = {
        title,
        roomName: channel.id,
        ownerId: user.id,
      };

      // set broadcast metadata in redis
      await redisConnection.HSET(channelKey, {
        viewers: 0,
        broadcast: JSON.stringify(broadcast),
      });

      io.emit("broadcasts:update");
      socket.join(channel.id);
      console.log(`broadcast started on ${channel.name}`);
      done({ success: true });
    } catch (err) {
      console.error(err);
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:end", async (channelId: string, done: Function) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
        },
      });

      if (!channel) {
        return done({ success: false, message: "Channel not found" });
      }

      const channelKey = getChannelKey(channel.id);
      const isOnLive = await redisConnection.EXISTS(channelKey);
      if (!isOnLive) {
        return done({ success: false, message: "This channel is offline" });
      }

      socket.to(channel.id).emit("broadcasts:destroy");
      io.sockets.socketsLeave(channelId);
      // del broadcast metadata in redis
      await redisConnection.DEL(channelKey);

      console.log(`broadcast ended on ${channel.name}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:join", async (channelId: string, done: Function) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
        },
      });

      if (!channel) {
        return done({ success: false, message: "Channel not found" });
      }

      const channelKey = getChannelKey(channel.id);
      const isOnLive = await redisConnection.EXISTS(channelKey);
      if (!isOnLive) {
        return done({ success: false, message: "This channel is offline" });
      }

      await redisConnection.HINCRBY(channelKey, "viewers", 1);

      socket.join(channelId);
      socket.to(channelId).emit("broadcasts:joined", user.username);
      socket.to(channelId).emit("p2p:joined", socket.id);
      console.log(`${user.username} joined ${channel.name}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:leave", async (channelId: string, done: Function) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: {
          id: channelId,
        },
      });

      if (!channel) {
        return done({ success: false, message: "Channel not found" });
      }

      const channelKey = getChannelKey(channel.id);
      const isOnLive = await redisConnection.EXISTS(channelKey);
      if (!isOnLive) {
        return done({ success: false, message: "This channel is offline" });
      }

      await redisConnection.HINCRBY(channelKey, "viewers", -1);

      socket.to(channelId).emit("broadcasts:left", user.username);
      socket.to(channelId).emit("p2p:left", socket.id);
      socket.leave(channelId);
      console.log(`${user.username} left ${channel.name}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on(
    "messages:send",
    async (channelId: string, message: string, done: Function) => {
      try {
        const filteredMessage = filterSentence(message);

        const channelKey = getChannelKey(channelId);
        const isOnLive = await redisConnection.EXISTS(channelKey);
        if (!isOnLive) {
          return done({ success: false, message: "This channel is offline" });
        }

        const broadcastJson = await redisConnection.HGET(channelKey, "broadcast");
        const broadcast: Broadcast = JSON.parse(broadcastJson);

        socket
          .to(channelId)
          .emit(
            "messages:sent",
            user.username,
            filteredMessage,
            broadcast.ownerId === user.id,
          );
        console.log(`${user.username} sent a message to ${channelId}: ${message}`);
        done({ success: true });
      } catch (err) {
        done({ success: false, message: err.message });
      }
    },
  );
}

export function registerP2PConnectionHandler(io: Server, socket: Socket) {
  socket.on("p2p:offer", (channelId: string, offer: RTCSessionDescription) => {
    console.log(`offer from ${socket.id} to ${channelId}`);
    socket.to(channelId).emit("p2p:offer", offer);
  });

  socket.on(
    "p2p:answer",
    (channelId: string, answer: RTCSessionDescription) => {
      console.log(`answer from ${socket.id} to ${channelId}`);
      socket.to(channelId).emit("p2p:answer", socket.id, answer);
    },
  );

  socket.on("p2p:ice", (channelId: string, ice: RTCIceCandidate) => {
    console.log(`ice from ${socket.id} to ${channelId}`);
    console.log(ice);
    socket.to(channelId).emit("p2p:ice", socket.id, ice);
  });
}

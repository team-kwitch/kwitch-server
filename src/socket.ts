import { Request } from "express";
import type { Server, Socket } from "socket.io";

import prisma from "@lib/prisma";

import { filterSentence } from "@utils/filter";
import { Channel } from "@prisma/client";

export function getRoomName(channel: Channel) {
  return `channel/${channel.broadcasterId}/${channel.title}`;
}

export function registerChannelHandler(io: Server, socket: Socket) {
  const req = socket.request as Request;
  const user = req.user;

  socket.on("channels:create", async (title: string, done: Function) => {
    try {
      const validateChannel = await prisma.channel.findUnique({
        where: { broadcasterId: user.id },
      });

      if (validateChannel) {
        done({
          success: false,
          message: "You can't turn on more than one broadcast.",
        });
        return;
      }

      const channel = await prisma.channel.create({
        data: {
          title,
          broadcasterId: user.id,
        },
      });

      io.emit("channels:update");
      socket.join(getRoomName(channel));
      console.log(`channel created by ${user.username}: ${channel.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:delete", async (done: Function) => {
    try {
      const channel = await prisma.channel.delete({
        where: { broadcasterId: user.id },
      });
      console.log(`channel deleted: ${channel.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:join", async (channelId: number, done: Function) => {
    try {
      const channel = await prisma.channel.update({
        where: { id: channelId },
        data: { viewers: { increment: 1 } },
        include: { broadcaster: true },
      });

      if (!channel) {
        done({ success: false, message: "Channel is not online." });
        return;
      }

      const roomName = getRoomName(channel);
      socket.join(roomName);
      socket.to(roomName).emit("channels:joined", user.username);
      socket.to(roomName).emit("p2p:joined", socket.id);
      console.log(`${user.username} joined ${channel.broadcaster.username}'s channel.`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:leave", async (channelId: number, done: Function) => {
    try {
      const channel = await prisma.channel.update({
        where: { id: channelId },
        data: { viewers: { decrement: 1 } },
        include: { broadcaster: true }
      });

      if (!channel) {
        done({ success: false, message: "Channel is not online." });
        return;
      }

      const roomName = getRoomName(channel);
      socket.to(roomName).emit("channels:left", user.username);
      socket.to(roomName).emit("p2p:left", socket.id);
      socket.leave(roomName);
      console.log(`${user.username} left ${channel.broadcaster.username}'r channel.`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on(
    "messages:send",
    async (broadcaster: string, message: string, done: Function) => {
      try {
        const filteredMessage = filterSentence(message);
        socket
          .to(broadcaster)
          .emit(
            "messages:sent",
            user.username,
            filteredMessage,
            broadcaster === user.username,
          );
        done({ success: true });
      } catch (err) {
        done({ success: false, message: err.message });
      }
    },
  );
}

export function registerP2PConnectionHandler(io: Server, socket: Socket) {
  socket.on(
    "p2p:offer",
    (broadcaster: string, offer: RTCSessionDescription) => {
      console.log(`offer from ${socket.id} to ${broadcaster}`);
      socket.to(broadcaster).emit("p2p:offer", offer);
    },
  );

  socket.on(
    "p2p:answer",
    (broadcaster: string, answer: RTCSessionDescription) => {
      console.log(`answer from ${socket.id} to ${broadcaster}`);
      socket.to(broadcaster).emit("p2p:answer", socket.id, answer);
    },
  );

  socket.on("p2p:ice", (broadcaster: string, ice: RTCIceCandidate) => {
    console.log(`ice from ${socket.id} to ${broadcaster}`);
    socket.to(broadcaster).emit("p2p:ice", socket.id, ice);
  });
}

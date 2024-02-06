import type { Server, Socket } from "socket.io";
import prisma from "../lib/prisma";
import { Request } from "express";
import { filterSentence } from "./filter";

export function registerChannelHandler(io: Server, socket: Socket) {
  const req = socket.request as Request;
  const user = req.user;

  socket.on("channels:create", async (title: string, done: Function) => {
    try {
      const validateChannel = await prisma.channel.findUnique({
        where: { broadcasterUsername: user.username },
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
          broadcasterUsername: user.username,
        },
      });

      io.emit("channels:update");
      socket.join(user.username);
      console.log(`channel created by ${user.username}: ${channel.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:delete", async (done: Function) => {
    try {
      const channel = await prisma.channel.delete({
        where: { broadcasterUsername: user.username },
      });
      console.log(`channel deleted: ${channel.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:join", async (broadcaster: string, done: Function) => {
    try {
      const channel = await prisma.channel.update({
        where: { broadcasterUsername: broadcaster },
        data: { viewers: { increment: 1 } },
      });

      if (!channel) {
        done({ success: false, message: "Channel is not online." });
        return;
      }

      socket.join(broadcaster);
      socket.to(broadcaster).emit("channels:joined", user.username);
      socket.to(broadcaster).emit("p2p:joined", socket.id);
      console.log(`${user.username} joined ${broadcaster}'s channel.`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("channels:leave", async (broadcaster: string, done: Function) => {
    try {
      const channel = await prisma.channel.update({
        where: { broadcasterUsername: broadcaster },
        data: { viewers: { decrement: 1 } },
      });

      if (!channel) {
        done({ success: false, message: "Channel is not online." });
        return;
      }

      socket.leave(broadcaster);
      io.to(broadcaster).emit("channels:left", user.username);
      io.to(broadcaster).emit("p2p:left", socket.id);
      console.log(`${user.username} left ${broadcaster}'r channel.`);
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
            broadcaster === user.username
          );
        done({ success: true });
      } catch (err) {
        done({ success: false, message: err.message });
      }
    }
  );
}

export function registerP2PConnectionHandler(io: Server, socket: Socket) {
  socket.on(
    "p2p:offer",
    (broadcaster: string, offer: RTCSessionDescription) => {
      console.log(`offer from ${socket.id} to ${broadcaster}`);
      socket.to(broadcaster).emit("p2p:offer", offer);
    }
  );

  socket.on(
    "p2p:answer",
    (broadcaster: string, answer: RTCSessionDescription) => {
      console.log(`answer from ${socket.id} to ${broadcaster}`);
      socket.to(broadcaster).emit("p2p:answer", socket.id, answer);
    }
  );

  socket.on("p2p:ice", (broadcaster: string, ice: RTCIceCandidate) => {
    console.log(`ice from ${socket.id} to ${broadcaster}`);
    socket.to(broadcaster).emit("p2p:ice", socket.id, ice);
  });
}

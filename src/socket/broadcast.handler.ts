import { Request } from "express";
import { Server, Socket } from "socket.io";
import Container from "typedi";

import { ChannelService } from "@/services/channel.service";
import { filterSentence } from "@/utils/chatFilter";

const channelService = Container.get(ChannelService);

export function registerBroadcastHandler(io: Server, socket: Socket) {
  const req = socket.request as Request;
  const user = req.user;

  socket.on("broadcasts:start", async (title: string, done: Function) => {
    try {
      const startedBroadcast = await channelService.broadcast(user.id, title);
      socket.join(startedBroadcast.channelId);
      console.log(`broadcast started: ${startedBroadcast.title}`);
      done({ success: true });
    } catch (err) {
      console.error(err);
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:end", async (done: Function) => {
    try {
      const endedBroadcast = await channelService.endBroadcast(user.id);
      io.to(endedBroadcast.channelId).emit("broadcasts:destroy");
      socket.leave(endedBroadcast.channelId);
      console.log(`broadcast ended: ${endedBroadcast.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:join", async (channelId: string, done: Function) => {
    try {
      const broadcast = await channelService.joinBroadcast(channelId);
      socket.join(channelId);
      io.to(channelId).emit("p2p:joined", socket.id);
      io.to(channelId).emit("broadcasts:joined", user.username);
      console.log(`${user.username} joined ${channelId}/${broadcast.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on("broadcasts:leave", async (channelId: string, done: Function) => {
    try {
      const broadcast = await channelService.leaveBroadcast(channelId);
      io.to(channelId).emit("broadcasts:left", user.username);
      io.to(channelId).emit("p2p:left", socket.id);
      socket.leave(channelId);
      console.log(`${user.username} left ${channelId}/${broadcast.title}`);
      done({ success: true });
    } catch (err) {
      done({ success: false, message: err.message });
    }
  });

  socket.on(
    "messages:send",
    async (channelId: string, userChannelId: string, message: string, done: Function) => {
      try {
        const filteredMessage = filterSentence(message);

        socket
          .to(channelId)
          .emit("messages:sent", user.username, filteredMessage, channelId === userChannelId);
        console.log(
          `${user.username} sent a message to ${channelId}: ${message}`,
        );
        done({ success: true });
      } catch (err) {
        done({ success: false, message: err.message });
      }
    },
  );
}

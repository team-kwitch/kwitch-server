import { Request } from "express";
import { Server, Socket } from "socket.io";

export function registerDisconnectingHandler(io: Server, socket: Socket) {
  const req = socket.request as Request;
  const user = req.user;

  // socket.on("disconnecting", async () => {
  //   const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);

  //   for (const channelId of rooms) {
  //     const channelKey = channelService.getChannelKey(channelId);
  //     const isOnLive = await channelService.isOnLive(channelKey);
  //     if (!isOnLive) {
  //       continue;
  //     }

  //     const [channelData, broadcastData] = await redisConnection.HMGET(
  //       channelKey,
  //       ["channel", "broadcast"]
  //     );

  //     const channel: Channel = JSON.parse(channelData);
  //     const broadcast: Broadcast = JSON.parse(broadcastData);

  //     if (channel.ownerId === user.id) {
  //       // End the broadcast if the owner leaves the channel
  //       await channelService.endBroadcast(user.id);
  //       io.to(channelId).emit("broadcasts:destroy");
  //       console.log(`Automatically ended the broadcast/${broadcast.title}`);
  //     } else {
  //       // Leave the broadcast if the viewer leaves the channel
  //       await channelService.leaveBroadcast(channelId);
  //       io.to(channelId).emit("broadcasts:left", user.username);
  //       io.to(channelId).emit("p2p:left", socket.id);
  //       console.log(`${user.username} left the broadcast/${broadcast.title}`);
  //     }
  //   }
  //   console.log(`socket disconnected: ${socket.id}`);
  // });
}

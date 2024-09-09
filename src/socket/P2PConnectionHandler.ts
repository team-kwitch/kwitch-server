import { Server, Socket } from "socket.io";

export function registerP2PConnectionHandler(io: Server, socket: Socket) {
  socket.on("p2p:offer", (channelId: string, offer: RTCSessionDescription) => {
    console.log(`offer from ${socket.id} to ${channelId}`);
    socket.to(channelId).emit("p2p:get_offer", offer);
  });

  socket.on(
    "p2p:answer",
    (channelId: string, answer: RTCSessionDescription) => {
      console.log(`answer from ${socket.id} to ${channelId}`);
      socket.to(channelId).emit("p2p:get_answer", socket.id, answer);
    },
  );

  socket.on("p2p:ice", (channelId: string, ice: RTCIceCandidate) => {
    console.log(`ice from ${socket.id} to ${channelId}`);
    socket.to(channelId).emit("p2p:get_ice", socket.id, ice);
  });
}
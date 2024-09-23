import { Server, Socket } from "socket.io";
import { Token } from "typedi";

export interface SocketHandler {
    register(io: Server, socket: Socket): void;
}

export const socketHandlerToken = new Token<SocketHandler>("socketHandler");
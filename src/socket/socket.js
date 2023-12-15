const socketIO = require("socket.io");
const admin_ui = require("@socket.io/admin-ui");
const userInfo = require("../util/info.js");
const filter = require("../util/filtering.js");
const Room = require("../../models/room.js");

let wsServer = null;

module.exports = (httpserver, sessionMiddleware) => {
  wsServer = socketIO(httpserver, {
    cors: {
      origin: ["https://admin.socket.io"],
      credential: true,
    },
  });

  function publicRooms() {
    const {
      sockets: {
        adapter: { sids, rooms },
      },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) => {
      if (sids.get(key) === undefined) {
        publicRooms.push(key);
      }
    });
    return publicRooms;
  }

  admin_ui.instrument(wsServer, {
    auth: false,
  });

  wsServer.engine.use(sessionMiddleware);

  const roomRoles = {};

  wsServer.on("connection", (socket) => {
    console.log(socket.id + "의 연결 감지!!");
    const session = socket.request.session;
    if (session.isLogined == true) {
      //방 입장하기 이벤트
      socket.on("enter_room", async (roomName, result) => {
        const roomsOfUser = Array.from(socket.rooms);
        wsServer.emit("destroy_room", roomName);
        if (
          wsServer.sockets.adapter.rooms.get(roomName) &&
          !roomsOfUser.includes(roomName)
        ) {
          console.log(session.userId + "님이 " + roomName + "에 입장합니다.");
          socket["userId"] = session.userId;
          socket.join(roomName);
          const nickname = await userInfo.getNickname(session.userId);
          result(true, "Successfully joined room");
          socket.to(roomName).emit("welcome", socket.id, nickname);
          wsServer.sockets.emit("room_change", publicRooms());
        } else {
          result(false, "The streamer is offline");
        }
      });

      //방 만들기 이벤트
      socket.on("create_room", async (roomName, title, result) => {
        const roomsOfUser = Array.from(socket.rooms);
        if (
          !wsServer.sockets.adapter.rooms.get(roomName) &&
          !roomsOfUser.includes(roomName)
        ) {
          if (filter.checkAbuse(title)) {
            result(false, "Abuse word not allowed");
            return;
          }
          console.log(session.userId + "님이 " + roomName + "방을 생성합니다.");
          socket["userId"] = session.userId;
          if (!roomRoles[roomName]) {
            roomRoles[roomName] = {};
          }
          roomRoles[roomName] = { leader: session.userId, manager: [] };
          socket.join(roomName);
          await userInfo.createRoom(roomName, title, session.userId);
          const nickname = await userInfo.getNickname(session.userId);
          result(true, "Succesfully room created");
          wsServer.sockets.emit("room_change", publicRooms());
        } else {
          console.log(roomName + "은 이미 존재하는 방입니다.");
          result(false, "You already have a room");
        }
      });

      //방 삭제하기 이벤트
      socket.on("destroy_room", async (roomName, result) => {
        try {
          if (roomName in roomRoles) {
            const checkroom = roomRoles[roomName];
            const room = await Room.findOne({
              name: roomName,
            });
            console.log(checkroom);
            if (room != null) {
              //나간 사람이 방장일때만 종료
              if (checkroom.leader == session.userId) {
                wsServer.in(roomName).socketsLeave(roomName);
                socket.leave(roomName);
                console.log(roomName + "방송이 종료되었습니다");
                await room.destroy();
                result(true, "Succesfully room destroyed");
              }
            } else {
              result(false, "The room doesn't exist");
            }
          } else {
            result(false, "The room leader only can destroy room");
          }
        } catch (err) {
          console.log(err);
          result(false, "Internal server error");
        }
      });

      //채팅 보내기 이벤트
      socket.on("send_message", async (msg, roomName, result) => {
        const roomsOfUser = Array.from(socket.rooms);
        if (roomsOfUser.includes(roomName)) {
          const account = await userInfo.getAccount(session.userId);
          const nickname = await userInfo.getNickname(session.userId);
          let filtered_msg = filter.filterSentence(msg);
          socket
            .to(roomName)
            .emit("new_message", filtered_msg, account, nickname);
          result(true, "Succesfully message sent");
        } else {
          result(false, "You are not in the " + roomName + "'s room");
        }
      });

      //매니저 권한 부여
      socket.on("give_manager", async (accountId, roomName, result) => {
        try {
          const checkroom = roomRoles[roomName];
          console.log(checkroom);
          if (checkroom) {
            if (checkroom.leader == session.userId) {
              const userId = await userInfo.getUserId(accountId);
              if (userId != -1 || userId != null) {
                if (!checkroom.manager.includes(userId)) {
                  checkroom.manager.push(userId);
                  const nickname = await userInfo.getNickname(userId);
                  console.log(
                    accountId +
                      "님이 " +
                      roomName +
                      "의 매니저로 임명되었습니다."
                  );
                  socket.to(roomName).emit("new_manager", nickname, accountId);
                  result(
                    true,
                    "Successfully manager privileges have been granted"
                  );
                } else {
                  console.log(
                    accountId + "님은 이미 " + roomName + "의 매니저입니다."
                  );
                  result(
                    false,
                    accountId +
                      " is already the manager of " +
                      roomName +
                      "'s room"
                  );
                }
              } else {
                console.log(accountId + "님은 존재하지 않는 계정입니다.");
                result(false, accountId + " is not existing account");
              }
            } else {
              console.log("방장이 아니면 매니저를 부여해줄 수 없습니다.");
              result(
                false,
                "Only the leader of the room can grant manager privileges"
              );
            }
          } else {
            console.log("존재하지 않는 방입니다.");
            result(false, "The room doesn't exist");
          }
        } catch (error) {
          console.log(error);
          result(false, "Internal server error");
        }
      });

      //매니저 권한 뺏기
      socket.on("remove_manager", async (accountId, roomName, result) => {
        try {
          const checkroom = roomRoles[roomName];
          if (checkroom) {
            if (checkroom.leader == session.userId) {
              const userId = await userInfo.getUserId(accountId);
              if (userId != -1 || userId != null) {
                if (checkroom.manager.includes(userId)) {
                  var index = checkroom.manager.indexOf(userId);
                  if (index !== -1) {
                    checkroom.manager.splice(index, 1);
                  }
                  const nickname = await userInfo.getNickname(userId);
                  console.log(
                    accountId +
                      "님이 " +
                      roomName +
                      "의 매니저가 더이상 아닙니다."
                  );
                  socket
                    .to(roomName)
                    .emit("delete_manager", nickname, accountId);
                  result(
                    true,
                    "Succesfully manager privileges have been removed"
                  );
                } else {
                  console.log(
                    accountId +
                      "님은 " +
                      roomName +
                      "의 매니저가 아니라서 해제할 수 없습니다."
                  );
                  result(
                    false,
                    accountId + " is not the manager of " + roomName + "'s room"
                  );
                }
              } else {
                console.log(accountId + "님은 존재하지 않는 계정입니다.");
                result(false, accountId + " is not existing account");
              }
            } else {
              console.log("방장이 아니면 매니저를 뺏을 수 없습니다.");
              result(
                false,
                "Only the leader of the room can remove manager privileges"
              );
            }
          } else {
            console.log("존재하지 않는 방입니다.");
            result(false, "The room doesn't exist");
          }
        } catch (error) {
          console.log(error);
          result(false, "Internal server error");
        }
      });
      //특정 유저 강퇴 이벤트
      socket.on("kick", async (accountId, roomName, result) => {
        try {
          const checkroom = roomRoles[roomName];
          if (checkroom) {
            //그 방의 방장이나 매니저만 권한이 있음
            if (
              checkroom.leader == session.userId ||
              checkroom.manager.includes(session.userId)
            ) {
              //강퇴할 유저의 아이디를 바탕으로 userId를 얻어옴
              const userId = await userInfo.getUserId(accountId);
              if (userId == socket.session.userId) {
                console.log("자기 자신을 강퇴할 순 없습니다");
                result(false, "You can't kick yourself");
              } else if (
                checkroom.leader == userId ||
                checkroom.manager.includes(userId)
              ) {
                console.log("방장이나 다른 매니저를 강퇴할 수 없습니다");
                result(
                  false,
                  "You can't kick the leader or the other managers"
                );
              } else if (userId != -1 && userId != null) {
                const roomsOfUser = Array.from(socket.rooms);
                const list = Array.from(
                  wsServer.sockets.sockets.values()
                ).filter(
                  (socket) =>
                    socket["userId"] == userId && roomsOfUser.includes(roomName)
                );
                if (list.length == 0) {
                  result(
                    false,
                    accountId + " is not in the " + roomName + "'s room"
                  );
                  return;
                }
                list.forEach((socket) => {
                  socket.leave(roomName);
                  //개인에게 너 강퇴당했다고 메시지 띄우는 용도임
                  wsServer.to(socket.id).emit("ban", roomName);
                });
                result(true, "Successfully user kicked");
                const nickname = await userInfo.getNickname(userId);
                console.log(
                  nickname +
                    " (" +
                    accountId +
                    ") 님이 " +
                    roomName +
                    "에서 강퇴당하셨습니다."
                );
                //모두에게 누가 강퇴당했다고 알리는 것
                socket.to(roomName).emit("kicked", nickname, accountId);
              } else {
                console.log("존재하지 않는 계정입니다.");
                result(false, accountId + " is not existing account");
              }
            } else {
              console.log("방장이나 매니저만 추방할 수 있습니다.");
              result(
                false,
                "Only the leader or managers of the room can kick user"
              );
            }
          } else {
            console.log("존재하지 않는 방입니다.");
            result(false, "The room doesn't exist");
          }
        } catch (err) {
          console.log(err);
          result(false, "Internal server error");
        }
      });

      //개인이 방 나가기
      socket.on("leave_room", (roomName) => {
        userInfo.getNickname(session.userId).then((nickname) => {
          socket.to(roomName).emit("bye", socket.id, nickname);
        });
        const roomsOfUser = Array.from(socket.rooms);
        if (
          wsServer.sockets.adapter.rooms.get(roomName) &&
          roomsOfUser.includes(roomName)
        ) {
          socket.leave(roomName);
        }
      });

      //WebRTC 전용인가? 몰루?
      socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", socket.id, offer);
      });
      socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", socket.id, answer);
      });
      socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", socket.id, ice);
      });

      //연결이 끊어지기 직전에 보내는 이벤트
      socket.on("disconnecting", async () => {
        socket.rooms.forEach(async (roomName) => {
          const nickname = await userInfo.getNickname(session.userId);
          socket.to(roomName).emit("bye", socket.id, nickname);
          try {
            if (roomName in roomRoles) {
              const checkroom = roomRoles[roomName];
              const room = await Room.findOne({
                name: roomName,
              });
              console.log(checkroom);
              if (room != null) {
                //나간 사람이 방장일때만 종료
                if (checkroom.leader == session.userId) {
                  wsServer.in(roomName).socketsLeave(roomName);
                  socket.leave(roomName);
                  console.log(roomName + "방송이 비정상적으로 종료되었습니다");
                  await room.destroy();
                }
              }
            }
          } catch (err) {
            console.log(err);
          }
        });
        wsServer.sockets.emit("room_change", publicRooms());
      });
      //연결이 완전히 끊긴 후 보내는 이벤트
      socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
      });
    }
  });
};

module.exports.getSocket = () => {
  return wsServer;
};

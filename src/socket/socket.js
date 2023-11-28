const socketIO = require('socket.io');
const admin_ui = require('@socket.io/admin-ui');
const userInfo = require('../util/info.js'); 
const filter = require('../util/filtering.js');

let wsServer = null;

module.exports = (httpserver, sessionMiddleware) => {
    wsServer = socketIO(httpserver, {
        cors: {
            origin : ["https://admin.socket.io"],
            credential : true
        }
    });

    function publicRooms(){
        const {
            sockets: {
                adapter: {sids, rooms},
            },
        } = wsServer;
        const publicRooms = [];
        rooms.forEach((_, key) =>{
            if(sids.get(key) === undefined) {
                publicRooms.push(key);
            }
        });
        return publicRooms;
    }
    
    admin_ui.instrument(wsServer, {
        auth : false
    });

    wsServer.engine.use(sessionMiddleware);

    const roomRoles = {};
    
    wsServer.on("connection", (socket) => {
        console.log("연결!!");
        const session = socket.request.session;
        if(session.isLogined == true){
            socket.on("enter_room", (roomName) => {
                if(wsServer.sockets.adapter.rooms.get(roomName)){
                    console.log(session.userId + "님이 " + roomName + "에 입장합니다.");
                    socket['userId'] = session.userId;
                    socket.join(roomName);
                    socket.to(roomName).emit("chatting_enter", session.userId);
                    wsServer.sockets.emit("room_change", publicRooms());
                }
                else{
                    wsServer.to(socket.id).emit("no_room", 'no room');
                }
            });
            socket.on("create_room", async(roomName, title) => {
                if(!wsServer.sockets.adapter.rooms.get(roomName)){
                    console.log(session.userId + "님이 " + roomName + "방을 생성합니다.");
                    socket['userId'] = session.userId;
                    if(!roomRoles[roomName]){
                        roomRoles[roomName] = {};
                    }
                    roomRoles[roomName][session.userId] = {role : 'leader'};
                    await userInfo.setRoomTitle(roomName, title);
                    console.log(roomRoles);
                    socket.join(roomName);
                    socket.to(roomName).emit("chatting_enter", session.userId);
                    wsServer.sockets.emit("room_change", publicRooms());
                }
                else{
                    wsServer.to(socket.id).emit("no_room", 'Existing room');
                }
            });
            socket.on("disconnecting", () => {
                socket.rooms.forEach(room => socket.to(room).emit("bye"));
                wsServer.sockets.emit("room_change", publicRooms());
            });
            socket.on("disconnect", () => {
                wsServer.sockets.emit("room_change", publicRooms());
            });
            socket.on("offer", (offer, roomName) => {
                socket.to(roomName).emit("offer", offer);
            });
            socket.on("answer", (answer, roomName) => {
                socket.to(roomName).emit("answer", answer);
            });
            socket.on("send_message", async (msg, room, done) => {
                const {account, nickname} = await userInfo.getInfo(session.userId);
                let filtered_msg = filter.KMP(msg);
                socket.to(room).emit("new_message", filtered_msg, account, nickname);
                done();
            });
            socket.on("kick", async (accountId, roomName) => {
                const checkuser = roomRoles[roomName][session.userId];
                if(checkuser){
                    //그 방의 방장이나 매니저만 권한이 있음
                    if(checkuser.role == 'leader' || checkuser.role == 'manager'){
                        //강퇴할 유저의 아이디를 바탕으로 userId를 얻어옴
                        const userId = userInfo.getUserId(accountId);
                
                        if(userId != -1 && userId != null){
                            const list = Array.from(wsServer.sockets.sockets.values()).filter(
                                (socket) => socket["userId"] == userId
                            );
                            list.forEach((socket) => socket.leave(roomName));
                        }
                    }
                }
                else{
                    socket.to(socket.id).emit("error", '권한 거부');
                }
            });
        }
    });
}

module.exports.getSocket = () =>{
    return wsServer;
}

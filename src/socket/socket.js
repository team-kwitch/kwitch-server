const socketIO = require('socket.io');
const admin_ui = require('@socket.io/admin-ui');
const userInfo = require('../util/info.js'); 
const filter = require('../util/filtering.js');
const Room = require('../../models/room.js');

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
        console.log(socket.id + "의 연결 감지!!");
        const session = socket.request.session;
        if(session.isLogined == true){
            //방 입장하기 이벤트
            socket.on("enter_room", async (roomName, done) => {
                const roomsOfUser = Array.from(socket.rooms);
                wsServer.emit("destroy_room", roomName);
                if(wsServer.sockets.adapter.rooms.get(roomName) && !roomsOfUser.includes(roomName)){
                    console.log(session.userId + "님이 " + roomName + "에 입장합니다.");
                    socket['userId'] = session.userId;
                    socket.join(roomName);
                    const nickname = await userInfo.getNickname(session.userId);
                    done(true);
                    socket.to(roomName).emit("chatting_enter", nickname);
                    socket.to(roomName).emit("welcome");
                    wsServer.sockets.emit("room_change", publicRooms());
                }
                else{
                    done(false);
                }
            });

            //방 만들기 이벤트
            socket.on("create_room", async(roomName, title, done) => {
                const roomsOfUser = Array.from(socket.rooms);
                if(!wsServer.sockets.adapter.rooms.get(roomName) && !roomsOfUser.includes(roomName)){
                    console.log(session.userId + "님이 " + roomName + "방을 생성합니다.");
                    socket['userId'] = session.userId;
                    if(!roomRoles[roomName]){
                        roomRoles[roomName] = {};
                    }
                    roomRoles[roomName] = {leader : session.userId, manager : []};
                    await userInfo.createRoom(roomName, title, session.userId);
                    socket.join(roomName);
                    const nickname = await userInfo.getNickname(session.userId);
                    done(true);
                    socket.to(roomName).emit("chatting_enter", nickname);
                    socket.to(roomName).emit("welcom");
                    wsServer.sockets.emit("room_change", publicRooms());
                }
                else{
                    console.log(roomName + "은 이미 존재하는 방입니다.");
                    done(false);
                }
            });

            //방 삭제하기 이벤트
            socket.on("destroy_room", async (roomName) =>{
                try{
                    if(roomName in roomRoles){
                        const checkroom = roomRoles[roomName];
                        const room = await Room.findOne({
                            name : roomName
                        });
                        console.log(checkroom);
                        if(room != null){
                            //나간 사람이 방장일때만 종료
                            if(checkroom.leader == session.userId){
                                wsServer.in(roomName).socketsLeave(roomName);
                                socket.leave(roomName);
                                console.log(roomName + "방송이 종료되었습니다");
                                await room.destroy();
                            }
                        }
                    }
                }
                catch(err){
                    console.log(err);
                    socket.to(socket.id).emit("error", '권한 거부');
                }
            });
                
            //채팅 보내기 이벤트
            socket.on("send_message", async (msg, roomName, done) => {
                const roomsOfUser = Array.from(socket.rooms);
                if(roomsOfUser.includes(roomName)){
                    const account = await userInfo.getAccount(session.userId);
                    const nickname = await userInfo.getNickname(session.userId);
                    let filtered_msg = filter.filterSentence(msg);
                    socket.to(roomName).emit("new_message", filtered_msg, account, nickname);
                    done();
                }
            });
            
            //매니저 권한 부여
            socket.on("give_manager", async(accountId, roomName, result) => {
                try{
                    const checkroom = roomRoles[roomName];
                    if(checkroom){
                        if(checkroom.leader == session.userId){
                            const userId = await userInfo.getUserId(accountId);
                            if(userId != -1 || userId != null){
                                if(!checkroom.manager.includes(userId)){
                                    checkroom.manager.push(userId);
                                    const nickname = await userInfo.getNickname(userId);
                                    console.log(accountId + "님이 " + roomName + "의 매니저로 임명되었습니다.");
                                    socket.to(roomName).emit("new_manager", nickname, accountId);
                                    result(true);
                                }
                                else{
                                    console.log(accountId + "님은 이미 " + roomName + "의 매니저입니다.");
                                    result(false);
                                }
                            }
                            else{
                                console.log(accountId + "님은 존재하지 않는 계정입니다.");
                                result(false);
                            }
                        }
                        else{
                            console.log("방장이 아니면 매니저를 부여해줄 수 없습니다.");
                            result(false);
                        }
                    }
                    else{
                        console.log("존재하지 않는 방입니다.");
                        result(false);
                    }
                }
                catch(error){
                    console.log(error);
                    result(false);
                }
            });

            //매니저 권한 뺏기
            socket.on("remove_manager", async(accountId, roomName, result) => {
                try{
                    const checkroom = roomRoles[roomName];
                    if(checkroom){
                        if(checkroom.leader == session.userId){
                            const userId = await userInfo.getUserId(accountId);
                            if(userId != -1 || userId != null){
                                if(checkroom.manager.includes(userId)){
                                    var index = checkroom.manager.indexOf(userId);
                                    if (index !== -1) {
                                        checkroom.manager.splice(index, 1);
                                    }
                                    const nickname = await userInfo.getNickname(userId);
                                    console.log(accountId + "님이 " + roomName + "의 매니저가 더이상 아닙니다.");
                                    socket.to(roomName).emit("delete_manager", nickname, accountId);
                                    result(true);
                                }
                                else{
                                    console.log(accountId + "님은 " + roomName + "의 매니저가 아니라서 해제할 수 없습니다.");
                                    result(false);
                                }
                            }
                            else{
                                console.log(accountId + "님은 존재하지 않는 계정입니다.");
                                result(false);
                            }
                        }
                        console.log("방장이 아니면 매니저를 뺏을 수 없습니다.");
                        result(false);
                    }
                    else{
                        console.log("존재하지 않는 방입니다.");
                        result(false);
                    }
                }
                catch(error){
                    console.log(error);
                    result(false);
                }
            });
            //특정 유저 강퇴 이벤트
            socket.on("kick", async (accountId, roomName, result) => {
                try{
                    const checkroom = roomRoles[roomName];
                    if(checkroom){
                        //그 방의 방장이나 매니저만 권한이 있음
                        if(checkroom.leader == session.userId || checkroom.manager.includes(session.userId)){
                            //강퇴할 유저의 아이디를 바탕으로 userId를 얻어옴
                            const userId = await userInfo.getUserId(accountId);
                            if(userId != -1 && userId != null){
                                const list = Array.from(wsServer.sockets.sockets.values()).filter(
                                    (socket) => socket["userId"] == userId
                                );
                                list.forEach((socket) => {
                                    socket.leave(roomName);
                                    wsServer.to(socket.id).emit("ban", roomName);
                                });
                                result(true);
                                const nickname = await userInfo.getNickname(userId);
                                console.log(nickname + " (" + accountId + ") 님이 " + roomName + "에서 강퇴당하셨습니다.")
                                socket.to(roomName).emit("kicked", nickname, accountId);
                            }
                            else{
                                result(false);
                            }
                        }
                    }
                    else{
                        result(false);
                    }
                }
                catch(err){
                    console.log(err);
                    result(false);
                }
            });

            //WebRTC 전용인가? 몰루?
            socket.on("offer", (offer, roomName) => {
                socket.to(roomName).emit("offer", offer);
            });
            socket.on("answer", (answer, roomName) => {
                socket.to(roomName).emit("answer", answer);
            });
            socket.on("ice", (ice, roomName) => {
                socket.to(roomName).emit("ice", ice);
            })
            
            //연결이 끊어지기 직전에 보내는 이벤트
            socket.on("disconnecting", () => {
                socket.rooms.forEach(async (roomName) => {
                    socket.to(roomName).emit("bye");
                    try{
                        if(roomName in roomRoles){
                            const checkroom = roomRoles[roomName];
                            const room = await Room.findOne({
                                name : roomName
                            });
                            console.log(checkroom);
                            if(room != null){
                                //나간 사람이 방장일때만 종료
                                if(checkroom.leader == session.userId){
                                    wsServer.in(roomName).socketsLeave(roomName);
                                    socket.leave(roomName);
                                    console.log(roomName + "방송이 비정상적으로 종료되었습니다");
                                    await room.destroy();

                                }
                            }
                        }
                    }
                    catch(err){
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
}

module.exports.getSocket = () =>{
    return wsServer;
}

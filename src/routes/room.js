const socket = require("../socket/socket.js");
const express = require("express");
const router = express.Router();

//룸 리스트
router.get("/list", async (_, res) => {
    
    const wsServer = socket.getSocket();
    const ids = Array.from(wsServer.sockets.adapter.sids.keys());
    const {
        sockets: {
            adapter: {sids, rooms},
        },
    } = wsServer;
    const tmp = Array.from(wsServer.sockets.adapter.rooms.keys());
    const names = tmp.filter(id => !ids.includes(id));     
    const ans = [];
    for(let roomId of names){
        const userCnt = wsServer.sockets.adapter.rooms.get(roomId)?.size;
        ans.push({name: roomId, users: userCnt});
    }
    res.json({roomlist: ans});
});

//방송 정보 변경
router.put("/modify", async(req, res) => {
    //TODO : 방송 정보 변경 기능
});
module.exports = router;
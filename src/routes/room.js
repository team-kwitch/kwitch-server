const socket = require("../socket/socket.js");
const Room = require("../../models/room.js");
const express = require("express");
const filter = require("../util/filtering.js");
const User = require("../../models/user.js");
const router = express.Router();

//룸 리스트
router.get("/list", async (_, res) => {
  const wsServer = socket.getSocket();
  const ids = Array.from(wsServer.sockets.adapter.sids.keys());
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const tmp = Array.from(wsServer.sockets.adapter.rooms.keys());
  const names = tmp.filter((id) => !ids.includes(id));
  const ans = [];
  for (let roomId of names) {
    const userCnt = wsServer.sockets.adapter.rooms.get(roomId)?.size;
    const room = await Room.findOne({
      name: roomId,
    });
    const broadcaster = await User.findOne({
      where: {
        id: room.leader,
      },
    });
    ans.push({
      broadcaster: { id: roomId, nickname: broadcaster.nickname },
      users: userCnt,
      title: room.title,
    });
  }
  res.json({ roomlist: ans });
});

//방송 정보 변경
router.put("/:id", async (req, res) => {
  try {
    const roomName = req.params.id;

    const room = await Room.findOne({
      name: roomName,
    });

    if (room == null) {
      res.status(400).json({ msg: "No room" });
      return;
    }

    if (room.leader != req.session.userId) {
      res.status(403).json({ msg: "No Authroization" });
      return;
    }

    const { title } = req.body;

    if (title == null) {
      res.status(400).json({ msg: "title is essential" });
      return;
    } else if (filter.checkAbuse(title)) {
      res.status(400).json({ msg: "Abuse word not allowed" });
      return;
    }

    room.update({
      title: title,
    });

    res.status(200).json({ msg: "successfully changed" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal server error" });
  }
});
module.exports = router;

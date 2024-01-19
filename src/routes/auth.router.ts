import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";
import prisma from "../util/prisma";
import type { User } from "@prisma/client";
import { issueToken } from "../util/token";

const authRouter = express.Router();

/**
 * 회원가입
 */
authRouter.post("/sign-up", async (req, res) => {
  try {
    const { username, password }: { username: string; password: string } =
      req.body;
    const hashedPassword = await bcrypt.hash(password, "12");

    // TODO: 비밀번호가 같이가고 있음.
    const saveUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        salt: "12",
      },
    });
    res.json({ result: true, user: saveUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ result: false, message: err.message });
  }
});

/**
 * 로그인
 */
authRouter.post("/sign-in", async (req, res) => {
  try {
    const { username } = req.body;

    const findUser = await prisma.user.findUnique({
      where: {
        username,
      },
    });

    if (!findUser) {
      return res.status(400).json({ success: false, message: "No User" });
    }

    const token = issueToken(findUser);
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// //로그인
// AuthRouter.get("/sign-in", (req, res) => {
//   const filePath = path.join(__dirname, "../public/login.html");
//   res.sendFile(filePath);
// });

// AuthRouter.post("/sign-in", async (req, res) => {
//   try {
//     const { id, password, isRemember } = req.body;

//     const module = new LoginSystem(id, password);
//     const execute = await module.Login();

//     console.log(req.session);
//     console.log(execute);
//     if (req.session.isLogined == false || req.session.isLogined == null) {
//       if (execute != -1) {
//         console.log(id + "님이 로그인하셨습니다.");
//         const nickname = await info.getNickname(execute);
//         const accountId = await info.getAccount(execute);

//         req.session.userId = execute;
//         req.session.isLogined = true;

//         if (isRemember) req.session.cookie.maxAge = 86400000 * 14;
//         //만약 로그인 상태 유지 옵션을 클릭해두면 14일간 유지
//         else req.session.cookie.maxAge = 3600000; //기본 세션 만료 시간은 1시간
//         req.session.save((error) => {
//           if (error) {
//             console.log(error);
//           } else {
//             res.status(200).json({
//               msg: "successful login",
//               accountId: accountId,
//               nickname: nickname,
//             });
//             return;
//           }
//         });
//       } else {
//         console.log(
//           id + "님은 등록되지 않은 회원이거나 아이디/비밀번호가 잘못되었습니다."
//         );
//         return res
//           .status(400)
//           .json({ msg: "failed username : " + id, userId: execute });
//       }
//     } else {
//       res.status(401).send("이미 로그인중이십니다.");
//       return;
//     }
//   } catch (err) {
//     console.log(err);
//     if (err == "Nan") res.status(401).json({ msg: "Non Account" });
//     else res.status(401).json({ msg: "Format Error" });
//   }
// });

// AuthRouter.post("/signout", function (req, res) {
//   if (req.session.userId) {
//     req.session.destroy(function (err) {
//       if (err) {
//         console.log(err);
//       } else {
//         res.clearCookie("login");
//         res.status(200).send("logout");
//       }
//     });
//   } else {
//     res.status(400).send("logout failed");
//   }
// });

// //회원가입
// AuthRouter.post("/signup", async (req, res) => {
//   try {
//     const { id, password, nickname } = req.body;

//     const module = new LoginSystem(id, password);
//     const execute = await module.Register(nickname);

//     console.log(id + " " + password);

//     if (execute == 1) {
//       console.log(id + "님이 회원가입 하셨습니다.");
//       res.status(200).send("success register");
//     } else if (execute == 2) {
//       console.log(id + "님은 이미 등록된 회원입니다.");
//       res.status(400).send("duplicate username : " + id);
//     } else {
//       console.log("비밀번호 형식이 틀렸습니다.");
//       res.status(400).send("password pattern is not correct");
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(401).send("Unexpected Error");
//   }
// });

// //룸 리스트
// AuthRouter.get("/rooms", async (_, res) => {
//   const wsServer = socket.getSocket();
//   const ids = Array.from(wsServer.sockets.adapter.sids.keys());
//   const {
//     sockets: {
//       adapter: { sids, rooms },
//     },
//   } = wsServer;
//   const tmp = Array.from(wsServer.sockets.adapter.rooms.keys());
//   const names = tmp.filter((id) => !ids.includes(id));
//   const ans = [];
//   for (let roomId of names) {
//     const userCnt = wsServer.sockets.adapter.rooms.get(roomId)?.size;
//     ans.push({ name: roomId, users: userCnt });
//   }
//   res.json({ roomlist: ans });
// });

export default authRouter;

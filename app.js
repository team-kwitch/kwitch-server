const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const session = require('express-session');
const admin_ui = require('@socket.io/admin-ui');
const userInfo = require('./src/util/userinfo.js'); 
const filter = require('./src/util/filtering.js');   
const passport = require('passport');   
const http = require('http');           
const MySQLStore = require('express-mysql-session')(session);
dotenv.config();

const {sequelize} = require('./models');

const env = process.env.DATA_ENV || 'development';
const config = require('./config/config.js')[env];

const app = express();

const indexRouter = require('./src/routes/');
const userRouter = require('./src/routes/user');

const sessionMiddleware = session({
    key : 'login',
    secret:process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling : true,
    store: new MySQLStore({
        host : config.host,
        port : 3306,
        user : config.user,
        clearExpired: true,
        checkExpirationInterval: 30000,
        password : config.password,
        database: config.database,
    }),
    cookie: {
        maxAge : 0
      }
});

app.set('port', 8000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('./src/public'));

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use("/", indexRouter);
app.use("/user", userRouter);

app.post("/test", (req, res) => {
    console.log(req.session);
    res.status(200).send("s");
});

//룸 리스트
app.get("/rooms", async (_, res) => {
    const iter = wsServer.sockets.adapter.rooms.keys();
    console.log(iter);
    const ans = [];
    for(let roomId of iter){
        const userCnt = wsServer.sockets.adapter.rooms.get(roomId)?.size;
        console.log({id: roomId});
        ans.push({name: roomId, users: userCnt});
    }
    res.json({roomlist: ans});
});

const httpserver = http.createServer(app);
const wsServer = socketIO(httpserver, {
    cors: {
        origin : ["https://admin.socket.io"],
        credential : true
    }
});

admin_ui.instrument(wsServer, {
    auth : false
});

httpserver.listen(app.get('port'), async() => {
    console.log(app.get('port'), '번 포트에서 대기중');
    await sequelize
        .sync({ force: false })
        .then(async () => {
            console.log("데이터베이스 연결 됨");
        })
        .catch((error) => {
            console.log(error);
        });
});

wsServer.engine.use(sessionMiddleware);

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
    console.log(publicRooms);
    return publicRooms;
}

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
        socket.on("create_room", (roomName) => {
            console.log(session.userId + "님이 " + roomName + "에 입장합니다.");
            socket['userId'] = session.userId;
            socket.join(roomName);
            socket.to(roomName).emit("chatting_enter", session.userId);
            wsServer.sockets.emit("room_change", publicRooms());
        });
        socket.on("disconnecting", () => {
            socket.rooms.forEach(room => socket.to(room).emit("bye"));
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
            console.log(filtered_msg);
            socket.to(room).emit("new_message", filtered_msg, account, nickname);
            done();
        });
        socket.on("kick", async (accountId) => {
            const userId = userInfo.getUserId(accountId);
            
            if(userId != -1 && userId != null){
                const list = Array.from(wsServer.sockets.sockets.values()).filter(
                    (socket) => socket["userId"] == userId
                );
                list.forEach((socket) => socket.disconnect());
            }
        });
        socket.on("ice", (ice, roomName) => {
            socket.to(roomName).emit("ice", ice);
        });
    }
});

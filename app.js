const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const session = require('express-session');
const admin_ui = require('@socket.io/admin-ui');       
const http = require('http');           
const MySQLStore = require('express-mysql-session')(session);
dotenv.config();

const {sequelize} = require('./models');

const env = process.env.DATA_ENV || 'development';
const config = require('./config/config.js')[env];

const app = express();

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

app.set('port', 3000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('./src/public'));

app.use(sessionMiddleware);

app.use("/user", userRouter);

app.post("/test", (req, res) => {
    console.log(req.session);
    res.status(200).send("s");
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

wsServer.on("connection", (socket) => {
    console.log("연결!!");
    const session = socket.request.session;
    //TODO : 시청자수 몇명인지 구현
    //TODO : 세션에 적힌 유저 아이디를 통해 DB에서 유저 닉네임 긁어오기
    console.log(session);
    if(session.isLogined == true){
        socket.on("enter_room", (roomName, done) => {
            console.log(session.userId + "님이 " + roomName + "에 입장합니다.");
            socket.join(roomName);
            socket.to(roomName).emit("welcome", session.userId);
            done();
        });
        socket.on("disconnecting", () => {
            socket.rooms.forEach(room => socket.to(room).emit("bye"));
        })
        socket.on("send_message", (msg, room, done) => {
            socket.to(room).emit("new_message", msg, session.userId);
            done();
        });
    }
});

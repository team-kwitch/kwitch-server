const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const session = require('express-session');       
const http = require('http');           
const MySQLStore = require('express-mysql-session')(session);
dotenv.config();

const {sequelize} = require('./models');

const env = process.env.DATA_ENV || 'development';
const config = require('./config/config.js')[env];

const app = express();
    
app.set('port', 3000);

app.use(bodyParser.json());

app.use(express.static('./src/public'));

app.use(session({
    key : 'login',
    secret:process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized : true,
    store: new MySQLStore({
        host : config.host,
        port : 3306,
        user : config.user,
        clearExpired: true,
        password : config.password,
        database : config.database
    }),
    cookie: {
        maxAge: 3600000
    }
}))

app.get("/", (req, res)=>{
    res.status(200).send("s");
});

//로그인
app.post("/signin", async (req, res)=>{
    try{
        const LoginSystem = require("./src/login/loginSystem.js");
        const {id, password} = req.body;

        const module = new LoginSystem(id, password);
        const execute = await module.Login();

        console.log(req.session);
        if (req.session.isLogined == false || req.session.isLogined == null) {
             if(execute != -1){
                    console.log(id + "님이 로그인하셨습니다.");
                    console.log(req.session);
                    req.session.userId = execute;
                    req.session.isLogined = true;

                    //세션 만료 시간은 1시간
                    const hour = 3600000
                    req.session.cookie.expires = new Date(Date.now() + hour)
                    console.log(req.session);
                    req.session.save((error) => {
                        if (error) {
                            console.log(error);
                        }
                        else {
                            res.status(200).send("OK");
                        }
                    });
                }
                else{
                    console.log(id + "님은 등록되지 않은 회원입니다.");
                    res.status(400).json({msg:'failed username : ' + id,userId : execute});
                }        
        }
        else {
            res.status(401).send("이미 로그인중이십니다.");
        }
    }
    catch (err){
        console.log(err);
        if(err == 'Nan') res.status(401).json({msg:'Non Account'});
        else res.status(401).json({msg:'Format Error'});
    }},
);

app.get("/signout", (req, res) => {
    if (req.session.isLogined == true) {
        req.session.destroy(e => {
            if (e) console.log(e);
        });
        res.status(200).send("OK");
    }
    else {
        res.status(400).send("test");
    }
});

//회원가입
app.post("/signup", async (req, res)=>{
        try{
            const LoginSystem = require("./src/login/loginSystem.js");

            const {id, password} = req.body;

            const module = new LoginSystem(id, password);
            const execute = await module.Register();

            console.log(id + " " + password);

            if(execute == 1){
                console.log(id + "님이 회원가입 하셨습니다.");
                res.status(200).send('success register');
            }
            else if(execute == 2){
                console.log(id + "님은 이미 등록된 회원입니다.");
                res.status(400).send('duplicate username : ' + id);
            }
            else {
                console.log("비밀번호 형식이 틀렸습니다.");
                res.status(400).send('password pattern is not correct');
            }
        }
        catch (err){
            console.log(err);
            res.status(401).send('Unexpected Error');
        }
    },
);

const httpserver = http.createServer(app);
const wsServer = socketIO(httpserver);

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

wsServer.on("connection", (socket) => {
    console.log("연결!!");
    socket.on("enter_room", (roomName, done) => {
        console.log(socket.id + "님이 " + roomName + "에 입장합니다.");
        socket.join(roomName);
        done();
    });
});

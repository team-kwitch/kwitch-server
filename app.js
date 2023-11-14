const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');                      
const MySQLStore = require('express-mysql-session')(session);
dotenv.config();

const {sequelize} = require('./models');

const env = process.env.DATA_ENV || 'development';
const config = require('./config/config.js')[env];
console.log(config);
const app = express();
    
app.set('port', 8000);

app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
    secret:process.env.COOKIE_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie : {
        httpOnly:true,
        secure:true
    },
    store: new MySQLStore({
        host : config.host,
        port : 3306,
        user : config.user,
        password : config.password,
        database : config.database
    })
}))

app.get("/", (req, res)=>{
    const {login} = req.cookies;
    console.log(login);
    res.status(200).json({msg:'success login'});
});

//로그인
app.post("/signin", async (req, res)=>{
    try{
        const LoginSystem = require("./src/login/loginSystem.js");
        const {id, password} = req.body;

        const module = new LoginSystem(id, password);
        const execute = await module.Login();

        if(execute != -1){
            console.log(id + "님이 로그인하셨습니다.");
            req.session.userId = execute
            req.session.isLogined = true;
            req.session.save(() => {
                res.cookie('login', execute, { maxAge: 3600000, httpOnly: true }).redirect('/');
            });
        }
        else{
            console.log(id + "님은 등록되지 않은 회원입니다.");
            res.status(400).json({msg:'failed username : ' + id,userId : execute});
        }
    }
    catch (err){
        console.log(err);
        if(err == 'Nan') res.status(401).json({msg:'Non Account'});
        else res.status(401).json({msg:'Format Error'});
    }},
);

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

const server = app.listen(app.get('port'), async() => {
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
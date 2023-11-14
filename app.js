const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser')
dotenv.config();

const {sequelize} = require('./models');
const app = express();

app.set('port', 8000);

app.use(bodyParser.json());

app.post("/signup", async (req, res)=>{
        res.status(200).send("Test");
    },
);

app.post("/signin", async (req, res)=>{
    res.status(200).send("Test");
    },
);

const server = app.listen(app.get('port'), async() => {
    console.log(app.get('port'), '번 포트에서 대기중');
    await sequelize
        .sync({ force: true })
        .then(async () => {
            console.log("데이터베이스 연결 됨");
        })
        .catch((error) => {
            console.log(error);
        });
});
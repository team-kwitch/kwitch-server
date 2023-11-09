import express from "express";
import bodyparser from "body-parser";

const app = express();
app.set('port', 8000);

app.use(bodyparser.json());

app.post("/signup", async (req, res)=>{
        res.status(200).send("Test");
    },
);

const server = app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기중');
});
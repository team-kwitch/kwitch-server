const express = require('express');
const User = require('../../models/user');
const Account = require('../../models/account');
const crypto = require("../util/crypto");
const path = require('path');

const router = express.Router();

//유저 아이디로 세부적인 정보 받아오기
router.get('/info', async (req, res) => {
    try{
        const handle = req.query.handle;
        
        //파라미터가 제대로 주어지지 않았을 경우
        if(handle == null){
            res.status(400).json({msg: 'No Parameter' });
            return;
        }

        const user = await User.findOne({
            where : {
                id : handle
            }
        });

        //없는 계정인 경우
        if(user == null){
            res.status(400).json({msg: 'Non User' });
            return;
        }

        //로그인한 유저와 일치하지 않는 경우
        if(req.session.userId != handle){
            res.status(403).json({msg: 'No Authorization' });
            return;
        }
        
        const account = await Account.findOne({
            where : {
                userId : handle
            }
        });

        const decryptedId = crypto.decipher(account.dataValues.id);

        res.status(200).json({
            msg: 'successful getInformation',
            userId : handle,
            accountId : decryptedId,
            nickname : user.nickname
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Internal Server Error' });
    }
});

//다른 유저의 정보를 받아오는 경우 (개인정보 포함 x)(프로필 표시 용도)
router.get('/show', async (req, res) => {
    try{
        const handle = req.query.handle;
        
        res.status(200).json({
            msg: 'successful getInformation',
            accountId : handle,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({msg: 'Internal Server Error' });
    }
});

//다른 유저의 프로필을 받아오는 경우
router.get("/profile", (req, res) => {
    const filePath = path.join(__dirname, '../public/login.html');
    res.sendFile(filePath);
});

module.exports = router;
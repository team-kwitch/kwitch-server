const User = require('../../models/user');
const Account = require('../../models/account');
const crypto = require("./crypto");

async function getInfo(userId){
    try{
        const account = await Account.findOne({
            where : {
                userId : userId
            }
        });
    
        const user = await User.findOne({
            where : {
                id : userId
            }
        });
    
        const decryptedId = crypto.decipher(account.dataValues.id); 
    
        console.log(decryptedId + " " + user.nickname);
        return { account : decryptedId, nickname : user.nickname};
    }
    catch(err){
        console.log(err);
        return { account : null, nickname : null};
    }
}

async function getUserId(accountId){
    try{
        const cryptedId = crypto.cipher(accountId);

        const account = await Account.findOne({
            where : {
                id : cryptedId
            }
        });
        
        if(account == null) return -1;
        return account.dataValues.id;
    }
    catch(err){
        console.log(err);
        return -1;
    }
}

async function setRoomTitle(roomName, title){
    try{
        const room = await Room.create({name:roomName, title:title});
    }
    catch(err){
        console.log(err);
    }
}

module.exports = {getInfo, getUserId, setRoomTitle};
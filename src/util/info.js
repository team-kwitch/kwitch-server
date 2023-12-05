const User = require('../../models/user');
const Account = require('../../models/account');
const Room = require('../../models/room');
const crypto = require("./crypto");

async function getAccount(userId){
    try{
        const account = await Account.findOne({
            where : {
                userId : userId
            }
        });
        
        if(account == null) return null;
        const decryptedId = crypto.decipher(account.dataValues.id); 
    
        return decryptedId;
    }
    catch(err){
        console.log(err);
        return null;
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
        return account.UserId;
    }
    catch(err){
        console.log(err);
        return -1;
    }
}

async function getNickname(userId){
    try{
        const user = await User.findOne({
            where : {
                id : userId
            }
        });
        
        if(user == null) return null;
        return user.nickname;
    }
    catch(err){
        console.log(err);
        return null;
    }
} 

async function createRoom(roomName, title, leader){
    try{
        const room = await Room.create({name:roomName, title:title, leader:leader});
    }
    catch(err){
        console.log(err);
    }
}

module.exports = {getAccount, getUserId, getNickname, createRoom};
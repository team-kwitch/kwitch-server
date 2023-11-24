const { rejects } = require('assert');
const crypto = require('crypto');

const dotenv = require('dotenv');
const { text } = require('express');
const { copyFileSync } = require('fs');
const { resolve } = require('path');
dotenv.config();

const CRYPTO_KEY = process.env.CRYPTO_KEY; 
const CRYPTO_ALGORITHM = process.env.CRYPTO_ALGORITHM;
const IV = process.env.INITIAL_VECTOR;

// 단방향 암호화
async function createHash(string) {
    return new Promise(async (resolve, rejects) => {
        const salt = await createSalt();
        crypto.pbkdf2(string, salt, 104906, 64, 'sha512', (err, key) => {
            if(err) rejects(err);
            else resolve({hashed : key.toString('base64'), salt});
        });
    });

}

// Salt 만들기
function createSalt() {
    return new Promise((resolve, rejects) => {
        crypto.randomBytes(64, (err, buf) => {
            if(err) rejects(err);
            else resolve(buf.toString('base64'))
        })
    });
}

// 대칭키 암호화
function cipher(string){
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, CRYPTO_KEY, IV);
    let result = cipher.update(string, 'utf-8', 'base64') + cipher.final('base64');
    return result;
}

// 대칭키 복호화
function decipher(result){
    const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, CRYPTO_KEY, IV);
    let result2 = decipher.update(result, 'base64', 'utf-8') + decipher.final('utf-8');
    return result2
}

module.exports = {createHash, createSalt, cipher, decipher};
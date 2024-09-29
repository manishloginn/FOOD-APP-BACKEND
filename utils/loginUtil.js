const mongoose = require('mongoose')


const loginUtil = ({username, password}) => {
    return new Promise ((res, rej) => {
        if(!username || !password) rej('please enter your username and password')

            res()
    })
}

module.exports= {loginUtil}
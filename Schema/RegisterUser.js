const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const RegisterUser = new Schema({
    username: String,
    name : String, 
    email : String,
    password : String,
    contact : String,
})


module.exports = mongoose.model('registerUser', RegisterUser)
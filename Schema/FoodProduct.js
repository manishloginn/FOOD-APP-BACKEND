const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const FoodProduct = new Schema({
    image: String,
    category: String,
    name: String,
    description: String,
    price: String,
    url: String,
    username:String,
    restrauntName:String, 
    address:String, 
})

module.exports = mongoose.model('FoodProduct', FoodProduct)
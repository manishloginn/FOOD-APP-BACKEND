const FoodProduct = require("../Schema/FoodProduct");

const fetchRestaurantFood = async (username) => {
    // console.log("this" + username)
    console.log(username)
    try {
      const foodItems = await FoodProduct.find({username:username}); 
      return foodItems;
    } catch (error) {
      console.error('Error fetching food items:', error);
      throw error;
    }
  };
  
  module.exports = { fetchRestaurantFood };
  
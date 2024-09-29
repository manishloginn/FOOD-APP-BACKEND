const mongoose = require('mongoose')

const isAuth = (req, res, next) => {
   if(req.session.isAuth){
       next()
   } else {
    return res.send({
        message: 'You are not authenticated',
        statusCode: 401,
        isAuth: false
    })
   }
}

module.exports = isAuth
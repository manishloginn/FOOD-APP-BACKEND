const mongoose = require('mongoose');

function registerChecker({ username, name, email, password, contact }) {
    return new Promise((res, rej) => {

        if (!username) rej('Please enter a username')
        if (typeof username !== "string") rej('not correct username')

        if (!name) rej('Please enter a name')
        if (typeof name !== "string") rej('not correct name')

        if (!email) rej('Please enter a email')
        if (typeof email !== "string") rej('not correct email')

        if (!password) rej('Please enter a password')
        if (typeof password !== "string") rej('not correct password')

        if (!contact) rej('Please enter a contact')
        if (typeof contact !== "string") rej('not correct contact')

        res()
    })

}

 module.exports= {registerChecker}
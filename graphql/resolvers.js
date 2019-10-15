const bcrypt = require('bcryptjs');
const validator = require('validator');
const User = require('../models/user');

module.exports = {
    createUser: async function ({ userInput }, req) {
        const {email, name, password} = userInput;
        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({message: 'email is invalid!'});
        }
        if (validator.isEmpty(password) || !validator.isLength(password, {min: 5})) {
            errors.push({message: 'password too short!'});
        }
        if (errors.length) {
            const error = new Error('invalid input!');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const existingUser = await User.findOne({email});
        // user already exists
        if (existingUser) {
            const error = new Error('User allready exists!');
            throw error;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email,
            name,
            password: hashedPassword,
        });

        const createdUser = await user.save();

        return {
                ...createdUser._doc,
                _id: createdUser._id.toString(), // override id type to string
            };
    }
};
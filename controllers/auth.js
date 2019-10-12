const {validationResult} = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const errorHelper = require('../helpers/error');
const User = require('../models/user');

exports.putSignup = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        errorHelper.throwError('Validation Failed hard!', 422);
    }

    const {email, name, password} = req.body;
    bcrypt.hash(password, 12)
        .then(hashedPass => {
            const user = new User({
                email,
                name,
                password: hashedPass
            });
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'user was created!',
                userId: result._id,
            });
        })
        .catch(err => errorHelper.catchError(err, next));
};

exports.postLogin = (req, res, next) => {
    const {email, password} = req.body;
    let loadedUser;
    User.findOne({email})
        .then(user => {
            if (!user) {
                errorHelper.throwError(`User with email: ${email} was not found`, 401);
            }
            loadedUser = user;
            return bcrypt.compare(password, loadedUser.password);
        })
        .then(isEqual => {
            if (!isEqual) {
                errorHelper.throwError(`wrong credentials`, 401);
            }
            const token = jwt.sign({email, userId: loadedUser._id.toString()}, 'ThisIsTheSecret', {expiresIn: '1h'});

            res.status(200).json({token, userId: loadedUser._id.toString()})
        })
        .catch(err => errorHelper.catchError(err, next));
};
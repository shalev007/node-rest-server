const express = require('express');
const {body} = require('express-validator/check');
const authController = require('../controllers/auth');
const User = require('../models/user');
const router = express.Router();

// PUT /auth/signup
router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email!')
        .custom((value, {req}) => {
            return User
                .findOne({email: value})
                .then(user => {
                    if (user) {
                        return Promise.reject('Email address already exists!');
                    }
                });
        })
        .normalizeEmail(),
    body('password')
        .trim()
        .isLength({min: 5}),
    body('name')
        .trim()
        .not()
        .isEmpty()
],authController.putSignup);

// POST /auth/login
router.post('/login', authController.postLogin);

module.exports = router;
const express = require('express');
const {body} = require('express-validator/check');
const feedController = require('../controllers/feed');
const isAuth = require('../middleware/isAuth');

const router = express.Router();
const postValidators = [
    body('title')
    .trim()
    .isLength({
        min: 5
    }),
    body('content').trim().isLength({
        min: 5
    })
];

// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts);

// POST /feed/posts
router.post('/posts', isAuth, postValidators, feedController.createPost);

// GET /feed/post/:id
router.get('/post/:id', isAuth, feedController.getPost);

// PUT /feed/post/:id
router.put('/post/:id', isAuth, postValidators, feedController.putPost);

// DELETE /feed/post/:id
router.delete('/post/:id', isAuth, feedController.deletePost);

module.exports = router;
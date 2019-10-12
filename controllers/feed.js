const {validationResult} = require('express-validator/check');
const Post = require('../models/post');
const User = require('../models/user');
const errorHelper = require('../helpers/error');
const imageHelper = require('../helpers/image');

exports.getPosts = (req, res, next) => {
    const ITEMS_PER_PAGE = 2;
    const currentPage = req.query.page || 1;
    let totalItems;
    Post.find()
        .countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find()
                .populate('creator')
                .skip((currentPage - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        })    
        .then(posts => {
            res.status(200).json({
                message: 'posts fetched succefully!',
                posts,
                totalItems
            });
        })
        .catch(err => errorHelper.catchError(err, next));
};

exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    let creator;

    if (!errors.isEmpty()) {
        errorHelper.throwError('Validation failed!', 422);
    }
    if(!req.file) {
        console.log(req.file);
        errorHelper.throwError('no Valid image provided!', 422);
    }
    const imageUrl = req.file.path.replace("\\" ,"/");
    const {title, content} = req.body;
    // create post in DB
    const post = new Post({
        title,
        content,
        imageUrl,
        creator: req.userId
    });
    post.save()
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();
        })
        .then(result => {
            console.log({post, creator});
            res.status(201).json({
                message: 'post created successfully!',
                post,
                creator: {_id: creator._id, name: creator.name},
            });
        })
        .catch(err => errorHelper.catchError(err, next));
    
};

exports.getPost = (req, res, next) => {
    const {id} = req.params;
    Post.findById(id)
        .then(post => {
            if(!post) {
                errorHelper.throwError(`Post with id: ${id} was not found...`, 404);
            }
            res.status(200).json({
                message: 'post found!',
                post
            });
        })
        .catch(err => errorHelper.catchError(err, next));
};

exports.putPost = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errorHelper.throwError('Validation failed!', 422);
    }

    const id = req.params.id;
    const {title, content} = req.body;
    let imageUrl = req.body.image;
    // uploaded image
    if (req.file) {
        imageUrl = req.file.path;
    }
    // no file picked
    if (!imageUrl) {
        errorHelper.throwError('No file picked!', 422);
    }

    Post.findById(id)
        .then(post => {
            if (!post) {
                errorHelper.throwError(`Post with id: ${id} was not found...`, 404);
            }
            if (post.creator.toString() !== req.userId.toString()) {
                errorHelper.throwError(`Not autherized...`, 403);
            }
            if (imageUrl !== post.imageUrl) {
                imageHelper.clearImage(post.imageUrl);
            }
            post.title = title;
            post.content = content;
            post.imageUrl = imageUrl;
            return post.save();
        })
        .then(result => {
            res.status(200).json({
                message: 'post updated!',
                post: result
            });
        })
        .catch(err => errorHelper.catchError(err, next));
};

exports.deletePost = (req, res, next) => {
    const id = req.params.id;
    Post.findById(id)
        .then(post => {
            if (!post) {
                errorHelper.throwError(`Post with id: ${id} was not found...`, 404);
            }
            if (post.creator.toString() !== req.userId.toString()) {
                errorHelper.throwError(`Not autherized...`, 403);
            }
            imageHelper.clearImage(post.imageUrl);
            return Post.findByIdAndRemove(id);
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(id);
            return user.save();
        })
        .then(result => {
            res.status(200)
                    .json({
                        message: 'post removed!'
                    });
        })
        .catch(err => errorHelper.catchError(err, next));
};
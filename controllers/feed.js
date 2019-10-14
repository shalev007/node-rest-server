const {validationResult} = require('express-validator/check');
const Post = require('../models/post');
const User = require('../models/user');
const errorHelper = require('../helpers/error');
const imageHelper = require('../helpers/image');

exports.getPosts = async (req, res, next) => {
    const ITEMS_PER_PAGE = 2;
    const currentPage = req.query.page || 1;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt: -1})
            .skip((currentPage - 1) * ITEMS_PER_PAGE)
            .limit(ITEMS_PER_PAGE);
        
        res.status(200).json({
            message: 'posts fetched succefully!',
            posts,
            totalItems
        });
    } catch (error) {
        errorHelper.catchError(err, next)
    }
};

exports.createPost = async (req, res, next) => {
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
    try {
        await post.save()
        const user = await User.findById(req.userId);
        creator = user;
        user.posts.push(post);
        await user.save();
        res.status(201).json({
            message: 'post created successfully!',
            post,
            creator: {_id: creator._id, name: creator.name},
        });
    } catch (error) {
        errorHelper.catchError(error, next)
    }
    
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

exports.putPost = async (req, res, next) => {
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

    try {
        const post = await Post.findById(id).populate('creator');
        if (!post) {
            errorHelper.throwError(`Post with id: ${id} was not found...`, 404);
        }
        if (post.creator._id.toString() !== req.userId.toString()) {
            errorHelper.throwError(`Not autherized...`, 403);
        }
        if (imageUrl !== post.imageUrl) {
            imageHelper.clearImage(post.imageUrl);
        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        const result = await post.save();
        res.status(200).json({
            message: 'post updated!',
            post: result
        });
    } catch (error) {
        errorHelper.catchError(err, next);   
    }
};

exports.deletePost = async (req, res, next) => {
    const id = req.params.id;
    try {
        const post = await Post.findById(id);
        if (!post) {
            errorHelper.throwError(`Post with id: ${id} was not found...`, 404);
        }
        if (post.creator.toString() !== req.userId.toString()) {
            errorHelper.throwError(`Not autherized...`, 403);
        }
        // delete image file
        imageHelper.clearImage(post.imageUrl);
        // remove post from DB
        await Post.findByIdAndRemove(id);
        // remove post ref from user
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();
        // return success response
        res.status(200)
            .json({
                message: 'post removed!'
            });

    } catch (error) {
        errorHelper.catchError(err, next);
    }
};
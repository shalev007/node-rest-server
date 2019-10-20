const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const imageHelper = require('../helpers/image');
const errorHelper = require('../helpers/error');
const User = require('../models/user');
const Post = require('../models/post');

const SECRET = 'somesupersecretsecret';
const ITEMS_PER_PAGE = 2;

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
    },
    login: async function ({email, password}) {
        const user = await User.findOne({email});
        if (!user) {
            errorHelper.throwError('User not found...', 401);
        }

        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            errorHelper.throwError('password is incorrect!', 401);
        }
        const token = jwt.sign({
            userId: user._id.toString(),
            email
        }, SECRET, {expiresIn: '1h'});

        return {
            token,
            userId: user._id.toString()
        };
    },

    createPost: async function ({postInput}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})) {
            errors.push({message: 'Title is invalid.'});
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})) {
            errors.push({message: 'Content is invalid.'});
        }

        if (errors.length) {
            errorHelper.throwError('Invalid input', 422, errors);
        }

        const user = await User.findById(req.userId);
        if (!user) {
            errorHelper.throwError('Invalid user', 401, errors);
        }
        const {title, content, imageUrl} = postInput;
        const post = new Post({
            title,
            content,
            imageUrl,
            creator: user
        });

        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        };
    },
    posts: async function ({page}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }
        page = page || 1;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
                                .sort({createdAt: -1})
                                .skip((page - 1) * ITEMS_PER_PAGE)
                                .limit(ITEMS_PER_PAGE)
                                .populate('creator');
        return {
            posts: posts.map(post => {
                return {   
                    ...post._doc,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString(),
               }
            }),
            totalPosts,
        };
    },
    post: async function ({id}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }

        const post = await Post.findById(id)
                               .populate('creator');
        if (!post) {
            errorHelper.throwError('No post Found!', 404);
        }

        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        };
    },
    updatePost: async function({id, postInput}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }

        const post = await Post.findById(id)
                               .populate('creator');
        if (!post) {
            errorHelper.throwError('No post Found!', 404);
        }

        if (post.creator._id.toString() !== req.userId.toString()) {
            errorHelper.throwError('Not Autherized!', 403);
        }

        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, {min: 5})) {
            errors.push({message: 'Title is invalid.'});
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, {min: 5})) {
            errors.push({message: 'Content is invalid.'});
        }

        if (errors.length) {
            errorHelper.throwError('Invalid input', 422, errors);
        }

        const user = await User.findById(req.userId);
        if (!user) {
            errorHelper.throwError('Invalid user', 401, errors);
        }
        const {title, content, imageUrl} = postInput;
        post.title = title;
        post.content = content;

        if (imageUrl !== 'undefined') {
            post.imageUrl = imageUrl;
        }

        const updatedPost = await post.save();
        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        };
    },
    deletePost: async function({id}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }
        const post = await Post.findById(id);
        if (!post) {
            errorHelper.throwError('No post Found!', 404);
        }
        if (post.creator.toString() !== req.userId.toString()) {
            errorHelper.throwError('Not Autherized!', 403);
        }

        imageHelper.clearImage(post.imageUrl);
        await Post.findByIdAndRemove(id);
        const user = await User.findById(req.userId);
        user.posts.pull(id);
        await user.save();

        return true;
    },
    updateStatus: async function({status}, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }

        const user = await User.findById(req.userId);

        if (!user) {
            errorHelper.throwError('No user Found!', 404);
        }
        user.status = status;
        await user.save();
        return {
            ...user._doc,
            _id: user._id.toString(),
        };
    },
    user: async function(args, req) {
        if (!req.isAuth) {
            errorHelper.throwError('Not Authenticated!', 401);
        }

        const user = await User.findById(req.userId);

        if (!user) {
            errorHelper.throwError('No user Found!', 404);
        }

        return {
            ...user._doc,
            _id: user._id.toString()
        }
    }
};
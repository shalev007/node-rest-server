exports.getPosts = (req, res, next) => {
    res.status(200).json({
        posts: [
            {title: 'title1', content: 'this is content stuff'}
        ]
    });
};

exports.postPosts = (req, res, next) => {
    const {title, content} = req.body;
    // create post in DB
    res.status(201).json({
        message: 'post created successfully!',
        post: {
            _id: 'asdasacaASDQ#$eSADASD',
            title,
            content
        }
    });
};
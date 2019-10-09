exports.getPosts = (req, res, next) => {
    res.status(200).json({
        posts: [
            {
                _id: 'shalev1',
                title: 'shalev',
                author: 'shalev',
                date: 'shalev',
                image: 'images/IMG-20190824-WA0034.jpg',
                content: 'shalev',
                creator: {
                    name: 'shalev'
                },
                createdAt: new Date(),
            }
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
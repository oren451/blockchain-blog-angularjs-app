var express = require('express');
var jwt = require('express-jwt');
var router = express.Router();

var authCheck = jwt({
  audience: 'l0bhTMUYEbzBkT6PMaeXuBhUruREwiZR',
  secret: 'rDMRNGlI3Y9Ezi04DskHst4wCHCtiO34ZRDEqxFKaCfjbv6ZbWf4GMESVt1s5pB6',
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Express'
  });
});

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');

// GET /posts - return a list of posts and associated metadata
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts) {
    if (err) {
      return next(err);
    }
    res.json(posts);
  });
});

// POST /posts - create a new post
router.post('/posts', function(req, res, next) {
  var post = new Post(req.body);
  post.save(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  });
});

router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function(err, post) {
    if (err) {
      return next(err);
    }
    if (!post) {
      return next(new Error('Not finding post'));
    }

    req.post = post;
    return next(); //then we are sure next is called only when post is attached to req

  });
});

// GET /posts/:id - return an individual post with associated comments
router.get('/posts/:post', function(req, res, next) {
  req.post.populate('post.comments', function(err, post) {
    if (err) {
      console.log(err);
      return next(err);
    }

    console.log(post);
    res.json(post);
  });
});


// PUT /posts/:id/upvote - upvote a post, notice we use the post ID in the URL
router.put('/posts/:post/upvote', function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  });
});

router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function(err, comment) {
    if (err) {
      return next(err);
    }
    if (!comment) {
      return next(new Error('Not finding comment'));
    }

    req.comment = comment;
    return next();
  });
});

// POST /posts/:id/comments - add a new comment to a post by ID
router.post('/posts/:post/comments', function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;

  comment.save(function(err, comment) {
    if (err) {
      return next(err);
    }

    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if (err) {
        return next(err);
      }

      res.json(comment);
    });
  });
});

// PUT /posts/:id/comments/:id/upvote - upvote a comment
router.put('/posts/:post/comments/:comment/upvote', function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) {
      return next(err);
    }
    res.json(comment);
  });
});

router.get('/api/public', function(req, res) {
  res.json({
    message: "Hello from public endpoint! You don't need to be authenticated to see this"
  });
});

router.get('/api/private', authCheck, function(req, res) {
  res.json({
    message: "Hello from public endpoint! You DO need to authenticated to see this"
  });
});

module.exports = router;

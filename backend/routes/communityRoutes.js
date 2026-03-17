const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const communityController = require('../controllers/communityController');
const cache = require('../middleware/cache');

// All community routes require authentication
router.use(protect);

// Feed — cache 60s: same list is valid for all users for 1 minute
router.get('/posts',    cache(60),  communityController.getPosts);
// Trending tags — cache 120s: changes very infrequently
router.get('/trending', cache(120), communityController.getTrending);

router.post('/create-post',        communityController.createPost);
router.post('/posts/:id/like',     communityController.likePost);

router.get('/posts/:id/comments',  communityController.getComments);
router.post('/posts/:id/comment',  communityController.addComment);

router.put('/posts/:id',           communityController.editPost);
router.delete('/posts/:id',        communityController.deletePost);

router.get('/nearby',              communityController.getNearby);

module.exports = router;

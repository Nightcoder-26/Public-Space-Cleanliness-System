const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const communityController = require('../controllers/communityController');

// All community routes require authentication
router.use(protect);

router.get('/posts', communityController.getPosts);
router.post('/create-post', communityController.createPost);
router.post('/posts/:id/like', communityController.likePost);

router.get('/posts/:id/comments', communityController.getComments);
router.post('/posts/:id/comment', communityController.addComment);

router.put('/posts/:id', communityController.editPost);
router.delete('/posts/:id', communityController.deletePost);

router.get('/nearby', communityController.getNearby);
router.get('/trending', communityController.getTrending);

module.exports = router;

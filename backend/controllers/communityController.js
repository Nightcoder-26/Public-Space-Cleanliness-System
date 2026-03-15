const CommunityPost = require('../models/CommunityPost');
const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const authMiddleware = require('../middleware/authMiddleware');

// Heuristic Moderation
const flagBadWords = (text) => {
    const badWords = ['spam', 'fake', 'idiot', 'scam', 'hate'];
    const lowerText = text.toLowerCase();
    return badWords.some(word => lowerText.includes(word));
};

// Heuristic Image Labeling (simulating CV)
const predictImageLabel = (desc) => {
    const lowerDesc = desc.toLowerCase();
    if (lowerDesc.includes('trash') || lowerDesc.includes('garbage')) return 'Garbage Dump — 95% confidence';
    if (lowerDesc.includes('pothole') || lowerDesc.includes('road')) return 'Road Damage — 92% confidence';
    if (lowerDesc.includes('leak') || lowerDesc.includes('water')) return 'Water Leak — 88% confidence';
    if (lowerDesc.includes('tree') || lowerDesc.includes('plant')) return 'Greening/Planting — 98% confidence';
    return '';
};

// Generate summary for long posts
const generateSummary = (desc) => {
    if (!desc || desc.length <= 120) return '';
    return '📝 AI Preview: ' + desc.substring(0, 117) + '...';
};

// 1. Get Feed
exports.getPosts = async (req, res) => {
    try {
        const posts = await CommunityPost.find()
            .populate('userId', 'name level xp')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching posts' });
    }
};

// 2. Create Post
exports.createPost = async (req, res) => {
    try {
        const { title, description, imageUrl, location, latitude, longitude, category } = req.body;

        const flagged = flagBadWords(description || '');
        const aiLabel = imageUrl ? predictImageLabel(description) : '';
        const aiSummary = generateSummary(description);

        const post = new CommunityPost({
            userId: req.user._id,
            postType: category === 'Issue Report' ? 'issue' : 'update',
            title: title || '',
            description,
            imageUrl,
            location,
            latitude,
            longitude,
            category: category || 'Civic Update',
            aiLabel,
            aiSummary,
            flagged
        });

        await post.save();
        await post.populate('userId', 'name level xp');

        // Emit socket event if io is available
        if (req.app.locals.io) {
            req.app.locals.io.emit('new-community-post', post);
        }

        res.status(201).json({ success: true, post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error creating post' });
    }
};

// 3. Like Post
exports.likePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const index = post.likes.indexOf(req.user._id);
        if (index === -1) {
            post.likes.push(req.user._id); // Like
        } else {
            post.likes.splice(index, 1); // Unlike
        }

        await post.save();

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-liked', { postId: post._id, likes: post.likes });
        }

        res.json({ success: true, likes: post.likes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error liking post' });
    }
};

// 4. Add Comment
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'Comment text required' });

        const post = await CommunityPost.findById(req.params.id);
        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

        const comment = new Comment({
            postId: post._id,
            userId: req.user._id,
            text
        });

        await comment.save();
        await comment.populate('userId', 'name');

        post.commentCount += 1;
        await post.save();

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-commented', { postId: post._id, commentCount: post.commentCount, newComment: comment });
        }

        res.status(201).json({ success: true, comment });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error adding comment' });
    }
};

// 5. Get Comments for a Post
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.id })
            .populate('userId', 'name')
            .sort({ createdAt: 1 });
        res.json({ success: true, comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching comments' });
    }
};

// 6. Get Nearby Issues
exports.getNearby = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ success: false, message: 'Lat and lng required' });

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Simple bounding box approach or all issues if small DB
        const issues = await Issue.find({ status: { $ne: 'Resolved' } });

        // Haversine
        const R = 6371; // km
        const nearby = issues.map(iss => {
            if (!iss.latitude || !iss.longitude) return null;
            const dLat = (iss.latitude - latNum) * Math.PI / 180;
            const dLon = (iss.longitude - lngNum) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(latNum * Math.PI / 180) * Math.cos(iss.latitude * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            return {
                issue: iss.category,
                location: iss.location,
                distance: parseFloat(distance.toFixed(1))
            };
        }).filter(item => item && item.distance <= 5.0).sort((a, b) => a.distance - b.distance).slice(0, 5); // Max 5 km, top 5

        res.json({ success: true, nearby });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching nearby issues' });
    }
};

// 7. Get Trending Hashes
exports.getTrending = async (req, res) => {
    try {
        // Mocking trending tags based on recent posts
        const posts = await CommunityPost.find().sort({ createdAt: -1 }).limit(100);
        const tags = {};
        posts.forEach(p => {
            if (!p.description) return;
            const words = p.description.match(/#[a-zA-Z0-9]+/g);
            if (words) {
                words.forEach(w => { tags[w] = (tags[w] || 0) + 1; });
            }
        });

        let sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        if (sortedTags.length === 0) {
            sortedTags = ['#CleanCity', '#EcoAction', '#CommunitySafety'];
        }
        res.json({ success: true, trending: sortedTags.slice(0, 5) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching trending' });
    }
};

// 8. Edit Post
exports.editPost = async (req, res) => {
    try {
        const { title, description, category, location, imageUrl } = req.body;
        const post = await CommunityPost.findById(req.params.id);

        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this post' });
        }

        // Apply moderation/AI to new description if changed
        if (description) {
            post.flagged = flagBadWords(description);
            post.aiSummary = generateSummary(description);
        }
        
        post.title = title || post.title;
        post.description = description || post.description;
        post.category = category || post.category;
        post.location = location || post.location;
        if (imageUrl) post.imageUrl = imageUrl; 

        await post.save();
        await post.populate('userId', 'name level xp');

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-updated', post);
        }

        res.json({ success: true, post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error editing post' });
    }
};

// 9. Delete Post
exports.deletePost = async (req, res) => {
    try {
        const post = await CommunityPost.findById(req.params.id);

        if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
        }

        await post.deleteOne();
        await Comment.deleteMany({ postId: post._id }); // cleanup comments

        if (req.app.locals.io) {
            req.app.locals.io.emit('post-deleted', { postId: post._id });
        }

        res.json({ success: true, message: 'Post deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error deleting post' });
    }
};

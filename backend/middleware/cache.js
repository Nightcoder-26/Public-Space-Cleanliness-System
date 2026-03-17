/**
 * Lightweight in-memory TTL cache middleware.
 * No external dependency — uses a plain Map.
 *
 * Usage:
 *   const cache = require('../middleware/cache');
 *   router.get('/posts', cache(60), communityController.getPosts);
 *   // Caches the response body for 60 seconds per URL
 */

const store = new Map(); // { key -> { body, expiresAt } }

/**
 * @param {number} ttlSeconds  How long to cache the response (default 60s)
 * @returns Express middleware function
 */
const cache = (ttlSeconds = 60) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cached = store.get(key);

        if (cached && Date.now() < cached.expiresAt) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Content-Type', 'application/json');
            return res.send(cached.body);
        }

        // Override res.send to capture response before sending
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode === 200) {
                store.set(key, {
                    body,
                    expiresAt: Date.now() + ttlSeconds * 1000
                });
            }
            res.setHeader('X-Cache', 'MISS');
            return originalSend(body);
        };

        next();
    };
};

/**
 * Manually invalidate a cached key (call this after write operations
 * to the same resource so the next read is always fresh).
 * @param {string} key  The URL path (e.g. '/api/community/posts')
 */
cache.invalidate = (key) => {
    store.delete(key);
};

module.exports = cache;

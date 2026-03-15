// Centralized API Configuration
export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://public-space-cleanliness-system-backend.onrender.com';

// Expose globally for any scripts that aren't modules but still need access
window.API_BASE = API_BASE;

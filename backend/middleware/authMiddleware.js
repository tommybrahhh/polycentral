const jwt = require('jsonwebtoken');

// Authentication middleware for general users
const authenticateToken = (req, res, next) => {
    console.log('Authentication middleware called for path:', req.originalUrl);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extracted from header:', token ? 'present' : 'missing');
    
    if (!token) {
        console.log('No token provided in request');
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            console.log('Token verification error details:', {
                name: err.name,
                message: err.message,
                expiredAt: err.expiredAt
            });
            // Check for specific JWT errors and return 401
            if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: 'Token is invalid or expired' });
            } else {
                // For any other unexpected errors during verification, return 500
                console.error('Unexpected error during JWT verification:', err);
                return res.status(500).json({ error: 'Internal server error during authentication' });
            }
        }
        console.log('Token verified successfully for user:', user.userId);
        console.log('Full token payload:', user);
        req.userId = user.userId;
        next();
    });
};

// Middleware to authenticate admin using database is_admin flag
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify JWT token to get user ID
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                console.log('Token verification failed:', err.message);
                return res.status(401).json({ error: 'Token is invalid or expired' });
            }

            const userId = decoded.userId;
            
            // Check if user is admin directly from database
            const { rows } = await req.db.raw('SELECT is_admin FROM users WHERE id = ?', [userId]);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (!rows[0].is_admin) {
                return res.status(403).json({ error: 'Admin access required' });
            }

            req.userId = userId;
            next();
        });
    } catch (error) {
        console.error('Admin authentication error:', error);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

module.exports = { authenticateToken, authenticateAdmin };
// Global error handling middleware
function errorHandler(err, req, res, next) {
    console.error('💥 Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
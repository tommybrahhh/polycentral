// 404 Not Found middleware
function notFoundMiddleware(req, res) {
    console.log('404 - Endpoint not found:', req.method, req.originalUrl);
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      availableRoutes: [
        '/api/events/health',
        '/api/events/',
        '/api/events/active',
        '/api/events',
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/user/debug/users',
        '/api/user/debug/token/:userId',
        '/api/events/resolve',
        '/api/admin/events/create',
        '/api/admin/events/status',
        '/api/admin/platform-fees/total',
        '/api/admin/platform-fees/transfer'
      ]
    });
}

module.exports = notFoundMiddleware;
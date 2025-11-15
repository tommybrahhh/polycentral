// Custom request logging middleware
function loggingMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip} - Headers: ${JSON.stringify(req.headers)}`);
    });
    next();
}

module.exports = loggingMiddleware;
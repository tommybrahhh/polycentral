// Conditional JSON parsing middleware
function jsonMiddleware(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    next();
  } else {
    const express = require('express');
    express.json({ limit: '10mb' })(req, res, next);
  }
}

module.exports = jsonMiddleware;
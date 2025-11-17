const express = require('express');
console.log('Express in adminRoutes.js:', express);
console.log('express.Router in adminRoutes.js:', express.Router);
const router = express.Router();

// Import admin controller functions
const {
  adminCreateEvent,
  getEventStatus,
  handleGetTotalPlatformFees,
  handleGetEvents,
  handleGetEventParticipants,
  handleGetEventTemplates,
  handleGetUsers,
  handleGetUserDetails,
  handleAdjustUserPoints,
  handleUpdateUserRole,
  handleSuspendUser,
  handleResetUserClaims,
  handleManualResolveEvent,
  handleSuspendEvent,
  handleDeleteEvent,
  handleTransferPlatformFees,
  handleGetMetrics
} = require('../controllers/adminController');

// Import authentication middleware
const { authenticateAdmin } = require('../middleware/authMiddleware');

// Admin routes
router.post('/events', authenticateAdmin, adminCreateEvent);
router.get('/events/status', authenticateAdmin, getEventStatus);
router.get('/fees/total', authenticateAdmin, handleGetTotalPlatformFees);
router.get('/events', authenticateAdmin, handleGetEvents);
router.get('/events/:id/participants', authenticateAdmin, handleGetEventParticipants);
router.get('/events/templates', authenticateAdmin, handleGetEventTemplates);
router.get('/users', authenticateAdmin, handleGetUsers);
router.get('/users/:id', authenticateAdmin, handleGetUserDetails);
router.patch('/users/:id/points', authenticateAdmin, handleAdjustUserPoints);
router.patch('/users/:id/role', authenticateAdmin, handleUpdateUserRole);
router.patch('/users/:id/suspend', authenticateAdmin, handleSuspendUser);
router.post('/users/:id/reset-claims', authenticateAdmin, handleResetUserClaims);
router.post('/events/:id/resolve', authenticateAdmin, handleManualResolveEvent);
router.patch('/events/:id/suspend', authenticateAdmin, handleSuspendEvent);
router.delete('/events/:id', authenticateAdmin, handleDeleteEvent);
router.post('/fees/transfer', authenticateAdmin, handleTransferPlatformFees);

// GET /metrics route
router.get('/metrics', authenticateAdmin, handleGetMetrics);

module.exports = router;
const express = require('express');
const { authenticateAdmin } = require('../middleware/authMiddleware');
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

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(authenticateAdmin);

// Admin manual event creation endpoint
router.post('/events/create', adminCreateEvent);

// Admin endpoint to get event creation status
router.get('/events/status', getEventStatus);

// Admin endpoint to get all events with pagination and filtering
router.get('/events', handleGetEvents);

// Admin endpoint to get event participants
router.get('/events/:id/participants', handleGetEventParticipants);

// Admin endpoint for event templates (placeholder - returns empty array for now)
router.get('/event-templates', handleGetEventTemplates);

// Admin user management endpoints
router.get('/users', handleGetUsers);

router.get('/users/:id', handleGetUserDetails);

router.put('/users/:id/points', handleAdjustUserPoints);

router.put('/users/:id/role', handleUpdateUserRole);

router.put('/users/:id/suspend', handleSuspendUser);

router.post('/users/:id/reset-claims', handleResetUserClaims);

// Admin endpoint for manual event resolution
router.post('/events/:id/resolve-manual', (req, res) => handleManualResolveEvent(req, res, req.app.locals.clients, req.app.locals.WebSocket));

// Admin endpoint to suspend or unsuspend an event
router.post('/events/:id/suspend', handleSuspendEvent);

// Admin endpoint to delete an event and its associated participants
router.delete('/events/:id', handleDeleteEvent);

// Admin endpoint to get total platform fees
router.get('/platform-fees/total', getTotalPlatformFees);

// Admin endpoint to transfer platform fees to a user
router.post('/platform-fees/transfer', handleTransferPlatformFees);

// Admin metrics endpoint
router.get('/metrics', handleGetMetrics);

module.exports = router;
const express = require('express');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const {
  createEvent,
  getEventStatus,
  getTotalPlatformFees,
  getEvents,
  getEventParticipants,
  getEventTemplates,
  getUsers,
  getUserDetails,
  adjustUserPoints,
  updateUserRole,
  suspendUser,
  resetUserClaims,
  manualResolveEvent,
  suspendEvent,
  deleteEvent,
  transferPlatformFees,
  getMetrics
} = require('../controllers/adminController');

const router = express.Router();

// Apply admin authentication middleware to all admin routes
router.use(authenticateAdmin);

// Admin manual event creation endpoint
router.post('/events/create', createEvent);

// Admin endpoint to get event creation status
router.get('/events/status', getEventStatus);

// Admin endpoint to get all events with pagination and filtering
router.get('/events', getEvents);

// Admin endpoint to get event participants
router.get('/events/:id/participants', getEventParticipants);

// Admin endpoint for event templates (placeholder - returns empty array for now)
router.get('/event-templates', getEventTemplates);

// Admin user management endpoints
router.get('/users', getUsers);

router.get('/users/:id', getUserDetails);

router.put('/users/:id/points', adjustUserPoints);

router.put('/users/:id/role', updateUserRole);

router.put('/users/:id/suspend', suspendUser);

router.post('/users/:id/reset-claims', resetUserClaims);

// Admin endpoint for manual event resolution
router.post('/events/:id/resolve-manual', (req, res) => manualResolveEvent(req, res, req.app.locals.clients, req.app.locals.WebSocket));

// Admin endpoint to suspend or unsuspend an event
router.post('/events/:id/suspend', suspendEvent);

// Admin endpoint to delete an event and its associated participants
router.delete('/events/:id', deleteEvent);

// Admin endpoint to get total platform fees
router.get('/platform-fees/total', getTotalPlatformFees);

// Admin endpoint to transfer platform fees to a user
router.post('/platform-fees/transfer', transferPlatformFees);

// Admin metrics endpoint
router.get('/metrics', getMetrics);

module.exports = router;
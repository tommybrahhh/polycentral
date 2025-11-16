const express = require('express');
const { authenticateAdmin } = require('../middleware/authMiddleware');

// const adminController = require('../controllers/adminController'); // Import as a whole object

const router = express.Router();

// Apply admin authentication middleware to all admin routes
// router.use(authenticateAdmin); // Commented out for now

// Admin manual event creation endpoint
/*
router.post('/events/create', adminController.adminCreateEvent);

// Admin endpoint to get event creation status
router.get('/events/status', adminController.getEventStatus);

// Admin endpoint to get all events with pagination and filtering
router.get('/events', adminController.handleGetEvents);

// Admin endpoint to get event participants
router.get('/events/:id/participants', adminController.handleGetEventParticipants);

// Admin endpoint for event templates (placeholder - returns empty array for now)
router.get('/event-templates', adminController.handleGetEventTemplates);

// Admin user management endpoints
router.get('/users', adminController.handleGetUsers);

router.get('/users/:id', adminController.handleGetUserDetails);

router.put('/users/:id/points', adminController.handleAdjustUserPoints);

router.put('/users/:id/role', adminController.handleUpdateUserRole);

router.put('/users/:id/suspend', adminController.handleSuspendUser);

router.post('/users/:id/reset-claims', adminController.handleResetUserClaims);

// Admin endpoint for manual event resolution
router.post('/events/:id/resolve-manual', (req, res) => adminController.handleManualResolveEvent(req, res, req.app.locals.clients, req.app.locals.WebSocket));

// Admin endpoint to suspend or unsuspend an event
router.post('/events/:id/suspend', adminController.handleSuspendEvent);

// Admin endpoint to delete an event and its associated participants
router.delete('/events/:id', adminController.handleDeleteEvent);

// Admin endpoint to get total platform fees
router.get('/platform-fees/total', adminController.handleGetTotalPlatformFees);

// Admin endpoint to transfer platform fees to a user
router.post('/platform-fees/transfer', adminController.handleTransferPlatformFees);

// Admin metrics endpoint
router.get('/metrics', adminController.handleGetMetrics);
*/

console.log('adminRoutes.js is exporting router');
module.exports = router;
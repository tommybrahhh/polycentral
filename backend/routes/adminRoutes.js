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

// Import event service function for testing
const { createDailyFootballEvents } = require('../services/eventService');

// Import authentication middleware
const { authenticateAdmin } = require('../middleware/authMiddleware');

// Admin routes
router.post('/events', authenticateAdmin, adminCreateEvent);
router.get('/events/status', authenticateAdmin, getEventStatus);
router.get('/fees/total', authenticateAdmin, handleGetTotalPlatformFees);
router.get('/events', authenticateAdmin, handleGetEvents);
router.get('/events/:id/participants', authenticateAdmin, handleGetEventParticipants);
router.get('/events/templates', authenticateAdmin, handleGetEventTemplates);
router.get('/event-templates', authenticateAdmin, handleGetEventTemplates);
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

// Temporary test route to trigger football event creation
router.get('/test-trigger-football', authenticateAdmin, async (req, res) => {
  try {
    console.log('Force triggering Football Event Creation...');
    // Pass the db instance from the request
    await createDailyFootballEvents(req.db);
    res.json({ success: true, message: "Triggered. Check server logs for '✅ Created football prediction event'." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// TEMPORARY: Endpoint to force run migrations
router.get('/run-migrations', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting Database Migration...');
    // Run the latest migration
    await req.db.migrate.latest({
      directory: require('path').join(__dirname, '../migrations')
    });
    console.log('✅ Database migrated successfully');
    res.json({ success: true, message: 'Migrations completed successfully.' });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Add this DEBUG/REPAIR route
router.get('/fix-database', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔧 Starting Force Schema Repair...');
    
    // 1. Force Add 'external_id' column if missing
    // Note: "ADD COLUMN IF NOT EXISTS" is standard Postgres
    await req.db.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='external_id') THEN
          ALTER TABLE events ADD COLUMN external_id VARCHAR(255);
        END IF;
      END $$;
    `);
    console.log('✅ Verified external_id column');

    // 2. Force Add 'sport_match' event type
    const typeCheck = await req.db.raw("SELECT id FROM event_types WHERE name = 'sport_match'");
    if ((typeCheck.rows || typeCheck).length === 0) {
      await req.db.raw("INSERT INTO event_types (name, description) VALUES ('sport_match', 'Sports match predictions')");
      console.log('✅ Added sport_match event type');
    }

    res.json({ success: true, message: 'Schema repair completed successfully.' });

  } catch (error) {
    console.error('💥 Repair Failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
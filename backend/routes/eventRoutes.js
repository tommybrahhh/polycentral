const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { validateEntryFee } = require('../middleware/eventMiddleware');
const { createEvent, participateInEvent, betOnEvent, listActiveEvents, listParticipationHistory, getEventDetails, getHealthStatus, triggerManualResolution } = require('../controllers/eventController');

const router = express.Router();

// Event creation endpoint
router.post('/', authenticateToken, validateEntryFee, async (req, res) => {
  try {
    await createEvent(req.db, req, res);
  } catch (error) {
    console.error('❌ Event creation route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Participation endpoint for predictions
router.post('/:id/participate', authenticateToken, async (req, res) => {
  try {
    await participateInEvent(req.db, req, res);
  } catch (error) {
    console.error('❌ Event participation route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint for placing a bet on an event
router.post('/:id/bet', authenticateToken, async (req, res) => {
  try {
    await betOnEvent(req.db, req, res);
  } catch (error) {
    console.error('❌ Event betting route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET active events
router.get('/active', async (req, res) => {
  try {
    await listActiveEvents(req.db, req, res);
  } catch (error) {
    console.error('❌ Active events retrieval route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get event participation history
router.get('/:id/participations', async (req, res) => {
  try {
    await listParticipationHistory(req.db, req, res);
  } catch (error) {
    console.error('❌ Participation history route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific event details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    await getEventDetails(req.db, req, res);
  } catch (error) {
    console.error('❌ Event details route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check and root endpoint
router.get('/health', async (req, res) => {
  try {
    await getHealthStatus(req.db, req, res);
  } catch (error) {
    console.error('❌ Health check route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    await getHealthStatus(req.db, req, res);
  } catch (error) {
    console.error('❌ Root route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// For testing: manually trigger event resolution
router.post('/resolve', authenticateAdmin, async (req, res) => {
  try {
    await triggerManualResolution(req.db, req, res);
  } catch (error) {
    console.error('❌ Manual resolution route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
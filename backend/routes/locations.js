const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all locations
router.get('/', async (req, res) => {
  try {
    const locations = await db.getAllLocations();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new location (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    const location = await db.saveLocation(name);
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a location (admin only)
router.delete('/:name', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    await db.deleteLocationByName(name);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 
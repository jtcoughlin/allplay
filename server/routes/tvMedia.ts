import { Router } from 'express';
import { tvMediaService } from '../tvMediaService.js';

const router = Router();

/**
 * Test TV Media API connection
 */
router.get('/test', async (req, res) => {
  try {
    const isConnected = await tvMediaService.testConnection();
    res.json({ 
      connected: isConnected, 
      message: isConnected ? 'TV Media API connection successful' : 'TV Media API connection failed'
    });
  } catch (error) {
    console.error('TV Media API test error:', error);
    res.status(500).json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Get lineups by postal code
 */
router.get('/lineups/:postalCode', async (req, res) => {
  try {
    const { postalCode } = req.params;
    const lineups = await tvMediaService.getLineupsByPostalCode(postalCode);
    res.json(lineups);
  } catch (error) {
    console.error('Error fetching lineups:', error);
    res.status(500).json({ error: 'Failed to fetch lineups' });
  }
});

/**
 * Get channels for a lineup
 */
router.get('/lineups/:lineupId/channels', async (req, res) => {
  try {
    const { lineupId } = req.params;
    const channels = await tvMediaService.getChannelsForLineup(lineupId);
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * Get programs for a lineup
 */
router.get('/lineups/:lineupId/programs', async (req, res) => {
  try {
    const { lineupId } = req.params;
    const hours = parseInt(req.query.hours as string) || 6;
    const programs = await tvMediaService.getProgramsForLineup(lineupId, hours);
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

/**
 * Get YouTube TV programs (simplified endpoint)
 */
router.get('/youtube-tv', async (req, res) => {
  try {
    const postalCode = req.query.postalCode as string || '90210';
    const hours = parseInt(req.query.hours as string) || 6;
    
    const programs = await tvMediaService.getYouTubeTVPrograms(postalCode, hours);
    res.json(programs);
  } catch (error) {
    console.error('Error fetching YouTube TV programs:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube TV programs' });
  }
});

export default router;
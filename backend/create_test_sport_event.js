// backend/create_test_sport_event.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const knex = require('knex');
const knexConfig = require('./knexfile');
const { createEventWithDetails } = require('./services/eventService');
const { findNextUpcomingMatch } = require('./services/apiFootballService');
const fs = require('fs');

async function createTestSportEvent() {
  let db;
  try {
    const sqliteDbPath = path.join(__dirname, 'database.sqlite');
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('Creating database.sqlite file...');
      fs.writeFileSync(sqliteDbPath, '');
    }

    db = knex({
      ...knexConfig.development,
      connection: { filename: sqliteDbPath }
    });

    console.log('Database connection established for test event creation.');
    console.log('API_FOOTBALL_KEY:', process.env.API_FOOTBALL_KEY ? 'Loaded' : 'Not Loaded');

    // Run migrations to ensure schema is up-to-date
    console.log('Running migrations...');
    await db.migrate.latest({
      directory: path.join(__dirname, 'migrations')
    });
    console.log('Migrations complete.');

    console.log('Attempting to create a daily sport event...');
    const match = await findNextUpcomingMatch();

    if (!match) {
      console.log('No upcoming real sport match found by API. Creating a mock sport event instead.');
      
      const mockMatch = {
        fixture: {
          id: Date.now().toString(), // Unique ID
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          status: { short: 'NS' } // Not Started
        },
        teams: {
          home: { name: 'Mock Team A' },
          away: { name: 'Mock Team B' }
        },
        league: { name: 'Mock League' }
      };

      const homeTeam = mockMatch.teams.home.name;
      const awayTeam = mockMatch.teams.away.name;
      const eventTitle = `Who will win: ${homeTeam} vs ${awayTeam} - ${Date.now()}`;
      const external_id = mockMatch.fixture.id;

      const options = [
        { id: 'home', label: homeTeam, value: 'home' },
        { id: 'away', label: awayTeam, value: 'away' },
        { id: 'draw', label: 'Draw', value: 'draw' }
      ];

      const startTime = new Date();
      const endTime = new Date(mockMatch.fixture.date);

      const eventTypeResult = await db.raw('SELECT id FROM event_types WHERE name = ?', ['sport_match']);
      const eventTypeRows = eventTypeResult.rows || eventTypeResult; // Handle both PG and SQLite raw query results
      let eventTypeId;
      if (eventTypeRows.length > 0) {
        eventTypeId = eventTypeRows[0].id;
      } else {
        console.warn('Sport_match event type not found, creating it.');
        const { rows: [newType] } = await db.raw(
          'INSERT INTO event_types (name, description) VALUES (?, ?) RETURNING id',
          ['sport_match', 'Sports match predictions']
        );
        eventTypeId = newType.id;
      }

      const eventDetails = {
        title: eventTitle,
        description: `Mock sport match prediction: ${homeTeam} vs ${awayTeam}`,
        options: options,
        entry_fee: 100,
        startTime: startTime,
        endTime: endTime,
        location: 'Mock Stadium',
        capacity: 1000,
        eventTypeId: eventTypeId,
        crypto_symbol: null, // Not applicable for sport events
        initial_price: null, // Not applicable for sport events
        external_id: external_id
      };
      
      await createEventWithDetails(db, eventDetails);
      console.log(`Successfully created mock sport event: ${eventTitle}`);

    } else {
      const homeTeam = match.teams?.home?.name || 'Home Team';
      const awayTeam = match.teams?.away?.name || 'Away Team';
      const eventTitle = `Who will win: ${homeTeam} vs ${awayTeam}`;
      const external_id = match.fixture.id.toString();
      
      // Check if event for this match already exists
      const { rows: existing } = await db.raw('SELECT id FROM events WHERE external_id = ?', [external_id]);
      if (existing.length > 0) {
        console.log(`Event for match ${external_id} already exists. Skipping.`);
        return;
      }

      // Define the options for the bet
      const options = [
        { id: 'home', label: homeTeam, value: 'home' },
        { id: 'away', label: awayTeam, value: 'away' },
        { id: 'draw', label: 'Draw', value: 'draw' }
      ];
      
      const startTime = new Date();
      const endTime = new Date(match.fixture.date); // Event closes when the match starts
      
      // Use the main createEvent function, but pass the new details
      console.log(`Creating new sport event: ${eventTitle}`);
      await db.raw(
        `INSERT INTO events (title, start_time, end_time, event_type_id, status, resolution_status, entry_fee, options, external_id)
         VALUES (?, ?, ?, (SELECT id FROM event_types WHERE name = 'sport_match'), 'active', 'pending', 100, ?, ?)`,
        [eventTitle, startTime, endTime, JSON.stringify(options), external_id]
      );
      
      console.log(`Successfully created event for match: ${eventTitle}`);
    }
    console.log('Successfully attempted to create a daily sport event. Check your database for the new event.');
  } catch (error) {
    console.error('Error during test sport event creation:', error);
  } finally {
    if (db) {
      await db.destroy();
      console.log('Database connection closed.');
    }
    process.exit();
  }
}

createTestSportEvent();

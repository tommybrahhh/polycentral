const { db } = require('../backend/lib/database.js');

async function verifyAndFixEntryFees() {
  try {
    // Update existing records
    const updateResult = await db.query(
      'UPDATE events SET entry_fee = 100 WHERE entry_fee != 100'
    );
    
    console.log(`Updated ${updateResult.rowCount} records`);

    // Verify all entries
    const { rows } = await db.query('SELECT id, entry_fee FROM events');
    const invalidEntries = rows.filter(row => row.entry_fee !== 100);
    
    if (invalidEntries.length > 0) {
      throw new Error(`${invalidEntries.length} invalid entries found`);
    }

    console.log('All events have 100 point entry fee');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyAndFixEntryFees();
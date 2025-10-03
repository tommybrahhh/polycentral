const { db } = require('../backend/lib/database.js');

async function verifyAndFixEntryFees() {
  try {
    // Round to nearest 25-point increments with 100 minimum
    const updateResult = await db.query(
      `UPDATE events
       SET entry_fee =
         GREATEST(
           (FLOOR(GREATEST(entry_fee, 100) / 25) * 25),
           100
         )
       WHERE entry_fee < 100 OR entry_fee % 25 != 0`
    );
    
    console.log(`Adjusted ${updateResult.rowCount} records to valid 25-point increments`);

    // Verify all entries
    // Verify against database constraints
    const { rows } = await db.query(`
      SELECT id, entry_fee
      FROM events
      WHERE entry_fee < 100 OR entry_fee % 25 != 0`
    );
    const invalidEntries = rows.filter(row => {
      const valid = row.entry_fee >= 100 && row.entry_fee % 25 === 0;
      if (!valid) {
        console.log(`Invalid entry fee: Event ${row.id} has ${row.entry_fee} points`);
      }
      return !valid;
    });
    
    if (invalidEntries.length > 0) {
      const examples = invalidEntries.slice(0, 3).map(e => `Event ${e.id}=${e.entry_fee}`).join(', ');
      throw new Error(`${invalidEntries.length} invalid entries found (e.g. ${examples})`);
    }

    console.log('All entry fees are valid (≥100 points, 25-point increments)');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifyAndFixEntryFees();
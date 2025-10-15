const sqlite3 = require('sqlite3').verbose();

// Configuration
const DB_PATH = './database.json';

async function verifyProductionMetrics() {
  console.log('🔍 Verifying Production Metrics');
  console.log('================================');

  const db = new sqlite3.Database(DB_PATH);

  try {
    // 1. Check total events count
    db.get('SELECT COUNT(*) as count FROM events', (err, row) => {
      if (err) {
        console.error('❌ Error counting events:', err);
        return;
      }
      console.log(`📊 Total events: ${row.count}`);
    });

    // 2. Check active events
    db.get('SELECT COUNT(*) as count FROM events WHERE status = ?', ['active'], (err, row) => {
      if (err) {
        console.error('❌ Error counting active events:', err);
        return;
      }
      console.log(`📊 Active events: ${row.count}`);
    });

    // 3. Check completed events
    db.get('SELECT COUNT(*) as count FROM events WHERE status = ? AND resolution = ?', ['expired', 'resolved'], (err, row) => {
      if (err) {
        console.error('❌ Error counting completed events:', err);
        return;
      }
      console.log(`📊 Completed events: ${row.count}`);
    });

    // 4. Check pending events (expired but not resolved)
    db.get('SELECT COUNT(*) as count FROM events WHERE status = ? AND resolution = ?', ['expired', 'pending'], (err, row) => {
      if (err) {
        console.error('❌ Error counting pending events:', err);
        return;
      }
      console.log(`📊 Pending events: ${row.count}`);
      
      if (row.count > 0) {
        console.log('✅ Pending events found! Resolve button should appear');
        
        // Show pending events
        db.all('SELECT id, title, end_time FROM events WHERE status = ? AND resolution = ?', ['expired', 'pending'], (err, rows) => {
          if (err) {
            console.error('❌ Error fetching pending events:', err);
            return;
          }
          console.log('📋 Pending events details:');
          rows.forEach(event => {
            console.log(`   - Event ${event.id}: "${event.title}" (Ended: ${event.end_time})`);
          });
        });
      } else {
        console.log('ℹ️ No pending events found - resolve button will not appear');
        
        // Show recently expired events that are already resolved
        db.all('SELECT id, title, end_time, resolution FROM events WHERE status = ? ORDER BY end_time DESC LIMIT 5', ['expired'], (err, rows) => {
          if (err) {
            console.error('❌ Error fetching expired events:', err);
            return;
          }
          console.log('📋 Recently expired events:');
          rows.forEach(event => {
            console.log(`   - Event ${event.id}: "${event.title}" (Ended: ${event.end_time}, Resolution: ${event.resolution})`);
          });
        });
      }
    });

    // 5. Check total fees
    db.get('SELECT SUM(entry_fee) as total_fees FROM events WHERE status = ?', ['expired'], (err, row) => {
      if (err) {
        console.error('❌ Error calculating total fees:', err);
        return;
      }
      console.log(`💰 Total fees: $${row.total_fees || 0}`);
    });

    // 6. Check if any events need manual resolution (expired more than 24 hours ago but still pending)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    db.get(
      'SELECT COUNT(*) as count FROM events WHERE status = ? AND resolution = ? AND end_time < ?',
      ['expired', 'pending', twentyFourHoursAgo],
      (err, row) => {
        if (err) {
          console.error('❌ Error checking overdue pending events:', err);
          return;
        }
        console.log(`⏰ Events needing manual resolution (>24h expired): ${row.count}`);
      }
    );

    // Wait a moment for all queries to complete
    setTimeout(() => {
      db.close();
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('1. The "Resolve" button only appears when pendingEvents > 0');
      console.log('2. Events become "pending" when they expire but are not automatically resolved');
      console.log('3. Check if the automatic resolution cron job is running in production');
      console.log('4. You can manually create an event that will expire soon to test the functionality');
    }, 1000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
  }
}

verifyProductionMetrics();
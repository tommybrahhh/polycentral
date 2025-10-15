const { Pool } = require('pg');

// Configuration for PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://polycentral_db_user:9FvJxhgA784lGJvr29VDIc8jz27zBTmc@dpg-d30qu1ffte5s73eoi120-a/polycentral_db'
});

async function testProductionMetrics() {
  console.log('🔍 Testing Production Metrics (PostgreSQL)');
  console.log('==========================================');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');

    // 2. Check total events count
    console.log('2. Checking total events...');
    const totalEvents = await pool.query('SELECT COUNT(*) as count FROM events');
    console.log(`📊 Total events: ${totalEvents.rows[0].count}`);

    // 3. Check active events
    console.log('3. Checking active events...');
    const activeEvents = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE status = $1',
      ['active']
    );
    console.log(`📊 Active events: ${activeEvents.rows[0].count}`);

    // 4. Check completed events
    console.log('4. Checking completed events...');
    const completedEvents = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE status = $1 AND resolution_status = $2',
      ['expired', 'resolved']
    );
    console.log(`📊 Completed events: ${completedEvents.rows[0].count}`);

    // 5. Check pending events (expired but not resolved)
    console.log('5. Checking pending events...');
    const pendingEvents = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE status = $1 AND resolution_status = $2',
      ['expired', 'pending']
    );
    const pendingCount = parseInt(pendingEvents.rows[0].count);
    console.log(`📊 Pending events: ${pendingCount}`);

    if (pendingCount > 0) {
      console.log('✅ Pending events found! Resolve button should appear');
      
      // Show pending events details
      const pendingDetails = await pool.query(
        'SELECT id, title, end_time FROM events WHERE status = $1 AND resolution_status = $2',
        ['expired', 'pending']
      );
      
      console.log('📋 Pending events details:');
      pendingDetails.rows.forEach(event => {
        console.log(`   - Event ${event.id}: "${event.title}" (Ended: ${event.end_time})`);
      });
    } else {
      console.log('ℹ️ No pending events found - resolve button will not appear');
      
      // Show recently expired events that are already resolved
      const recentExpired = await pool.query(
        'SELECT id, title, end_time, resolution_status FROM events WHERE status = $1 ORDER BY end_time DESC LIMIT 5',
        ['expired']
      );
      
      console.log('📋 Recently expired events:');
      recentExpired.rows.forEach(event => {
        console.log(`   - Event ${event.id}: "${event.title}" (Ended: ${event.end_time}, Resolution: ${event.resolution_status})`);
      });
    }

    // 6. Check total fees
    console.log('6. Checking total fees...');
    const totalFees = await pool.query(
      'SELECT COALESCE(SUM(platform_fee), 0) as total_fees FROM events WHERE status = $1',
      ['expired']
    );
    console.log(`💰 Total fees: $${totalFees.rows[0].total_fees}`);

    // 7. Check if any events need manual resolution (expired more than 24 hours ago but still pending)
    console.log('7. Checking events needing manual resolution...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const overdueEvents = await pool.query(
      'SELECT COUNT(*) as count FROM events WHERE status = $1 AND resolution_status = $2 AND end_time < $3',
      ['expired', 'pending', twentyFourHoursAgo]
    );
    console.log(`⏰ Events needing manual resolution (>24h expired): ${overdueEvents.rows[0].count}`);

    // 8. Test the metrics endpoint logic
    console.log('8. Testing metrics endpoint logic...');
    const metrics = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM events) as total_events,
        (SELECT COUNT(*) FROM events WHERE resolution_status = 'pending') as active_events,
        (SELECT COUNT(*) FROM events WHERE resolution_status = 'resolved') as completed_events,
        (SELECT COALESCE(SUM(platform_fee), 0) FROM events) as total_fees,
        (SELECT COUNT(*) FROM events WHERE resolution_status = 'pending' AND end_time < NOW()) as pending_events
    `);
    
    const metricsData = metrics.rows[0];
    console.log('📊 Metrics endpoint would return:', {
      totalEvents: parseInt(metricsData.total_events),
      activeEvents: parseInt(metricsData.active_events),
      completedEvents: parseInt(metricsData.completed_events),
      totalFees: parseInt(metricsData.total_fees),
      pendingEvents: parseInt(metricsData.pending_events)
    });

    console.log('\n💡 DIAGNOSIS:');
    if (parseInt(metricsData.pending_events) === 0) {
      console.log('✅ The "Resolve" button is NOT appearing because there are 0 pending events');
      console.log('✅ This is expected behavior - the button only appears when pendingEvents > 0');
      console.log('✅ The system is working correctly!');
    } else {
      console.log('⚠️  The "Resolve" button SHOULD appear but might not be visible in the UI');
      console.log('✅ Check the frontend AdminControlPanel component for pendingEvents > 0 logic');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

// Check if we have database connection details
if (!process.env.DATABASE_URL) {
  console.log('ℹ️ DATABASE_URL environment variable not set');
  console.log('💡 Using default PostgreSQL connection string');
}

testProductionMetrics();
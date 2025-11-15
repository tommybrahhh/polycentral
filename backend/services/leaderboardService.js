// backend/services/leaderboardService.js
// Leaderboard service functions

// Get leaderboard data
async function getLeaderboard(db, page = 1, limit = 20) {
    // Validate and sanitize parameters
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20;
    
    // Ensure page is at least 1
    if (page < 1) page = 1;
    
    // Ensure limit is between 1 and 100
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    
    const offset = (page - 1) * limit;

    console.log(`Fetching leaderboard: page=${page}, limit=${limit}, offset=${offset}`);

    // Get paginated user data
    const usersResult = await db.raw(
        `SELECT id, username, points
         FROM users
         ORDER BY points DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );
    const users = Array.isArray(usersResult) ? usersResult : usersResult.rows;
    console.log(`Found ${users.length} users for leaderboard`);

    // Get total count of users
    const countResult = await db.raw(`SELECT COUNT(*) as total FROM users`);
    const total = Array.isArray(countResult) ? countResult[0].total : countResult.rows[0].total;
    console.log(`Total users in database: ${total}`);

    return {
        users,
        total: parseInt(total),
        page,
        limit,
        pages: Math.ceil(total / limit)
    };
}

module.exports = {
    getLeaderboard
};
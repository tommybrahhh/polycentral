// Validation middleware for entry fee
const validateEntryFee = (req, res, next) => {
    const { entry_fee } = req.body;
    
    if (typeof entry_fee !== 'number') {
        return res.status(400).json({ error: 'Entry fee must be a numeric value' });
    }
    if (entry_fee < 100) {
        return res.status(400).json({ error: 'Entry fee must be at least 100 points' });
    }
    if (entry_fee % 25 !== 0) {
        return res.status(400).json({ error: 'Entry fee must be divisible by 25' });
    }
    next();
};

module.exports = { validateEntryFee };
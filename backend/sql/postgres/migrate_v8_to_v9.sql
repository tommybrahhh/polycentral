-- Add entry fee check constraint for tournaments
ALTER TABLE tournaments
ADD CONSTRAINT entry_fee_check
CHECK (
    entry_fee >= 100
    AND entry_fee % 25 = 0
);
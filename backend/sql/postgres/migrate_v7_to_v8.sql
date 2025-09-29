-- Migration v7 to v8: Rename points_paid to amount
ALTER TABLE participants RENAME COLUMN points_paid TO amount;
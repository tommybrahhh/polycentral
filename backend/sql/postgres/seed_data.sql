-- Insert seed data
INSERT INTO event_types (name, description) VALUES ('prediction', 'Classic prediction') ON CONFLICT (name) DO NOTHING;
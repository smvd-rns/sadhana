-- Add role columns to temples table
ALTER TABLE temples
ADD COLUMN IF NOT EXISTS managing_director_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS managing_director_name TEXT,
ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS director_name TEXT,
ADD COLUMN IF NOT EXISTS central_voice_manager_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS central_voice_manager_name TEXT;

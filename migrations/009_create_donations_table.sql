-- Create donations table in secondary DB (Sadhana DB)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Donor Information
  donor_name TEXT NOT NULL,
  donor_email TEXT NOT NULL,
  donor_mobile TEXT NOT NULL,
  donor_address TEXT,
  donor_pan TEXT,
  
  -- Financial Details
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Payment Gateway Tracking (Easebuzz)
  payment_status TEXT CHECK (payment_status IN ('pending', 'captured', 'failed', 'refunded', 'user_cancelled')) DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT UNIQUE, -- Easebuzz Pay ID
  txnid TEXT UNIQUE,      -- Our internal Transaction ID (Order ID)
  
  -- Attribution (Link to Primary DB User)
  tag_user_id UUID NOT NULL,
  
  -- Extra Metadata (Full Easebuzz Response)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_tag_user_id ON donations(tag_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_payment_status ON donations(payment_status);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_metadata ON donations USING GIN (metadata);

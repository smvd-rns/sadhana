-- ============================================================================
-- UPDATE USER ZONES BASED ON STATE
-- ============================================================================
-- This script populates the 'zone' column for all users based on their state.
-- It covers all 28 states and 8 union territories of India.
-- ============================================================================

-- Update users' zone based on their state
UPDATE users 
SET zone = CASE 
    -- ========================================================================
    -- NORTH ZONE (8 states/UTs)
    -- ========================================================================
    WHEN state IN (
        'Delhi',
        'Haryana',
        'Punjab',
        'Himachal Pradesh',
        'Jammu and Kashmir',
        'Ladakh',
        'Chandigarh',
        'Uttarakhand'
    ) THEN 'North Zone'
    
    -- ========================================================================
    -- SOUTH ZONE (6 states/UTs)
    -- ========================================================================
    WHEN state IN (
        'Karnataka',
        'Tamil Nadu',
        'Kerala',
        'Andhra Pradesh',
        'Telangana',
        'Puducherry',
        'Lakshadweep',
        'Andaman and Nicobar Islands'
    ) THEN 'South Zone'
    
    -- ========================================================================
    -- EAST ZONE (4 states)
    -- ========================================================================
    WHEN state IN (
        'West Bengal',
        'Odisha',
        'Bihar',
        'Jharkhand'
    ) THEN 'East Zone'
    
    -- ========================================================================
    -- WEST ZONE (5 states/UTs)
    -- ========================================================================
    WHEN state IN (
        'Maharashtra',
        'Gujarat',
        'Goa',
        'Rajasthan',
        'Dadra and Nagar Haveli and Daman and Diu'
    ) THEN 'West Zone'
    
    -- ========================================================================
    -- CENTRAL ZONE (3 states)
    -- ========================================================================
    WHEN state IN (
        'Madhya Pradesh',
        'Chhattisgarh',
        'Uttar Pradesh'
    ) THEN 'Central Zone'
    
    -- ========================================================================
    -- NORTHEAST ZONE (8 states)
    -- ========================================================================
    WHEN state IN (
        'Assam',
        'Arunachal Pradesh',
        'Manipur',
        'Meghalaya',
        'Mizoram',
        'Nagaland',
        'Sikkim',
        'Tripura'
    ) THEN 'Northeast Zone'
    
    ELSE zone -- Keep existing value if state doesn't match
END
WHERE state IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the zone distribution
SELECT 
    zone,
    COUNT(*) as user_count,
    array_agg(DISTINCT state ORDER BY state) as states_in_zone
FROM users
WHERE zone IS NOT NULL
GROUP BY zone
ORDER BY zone;

-- ============================================================================
-- CHECK FOR UNMAPPED STATES
-- ============================================================================
-- Run this to find any states that weren't assigned a zone
SELECT DISTINCT state, COUNT(*) as count
FROM users
WHERE state IS NOT NULL AND zone IS NULL
GROUP BY state
ORDER BY state;

-- ============================================================================
-- ZONE SUMMARY
-- ============================================================================
-- Total states/UTs covered: 36
-- - North Zone: 8 (Delhi, Haryana, Punjab, Himachal Pradesh, J&K, Ladakh, Chandigarh, Uttarakhand)
-- - South Zone: 8 (Karnataka, Tamil Nadu, Kerala, Andhra Pradesh, Telangana, Puducherry, Lakshadweep, Andaman & Nicobar)
-- - East Zone: 4 (West Bengal, Odisha, Bihar, Jharkhand)
-- - West Zone: 5 (Maharashtra, Gujarat, Goa, Rajasthan, Dadra & Nagar Haveli and Daman & Diu)
-- - Central Zone: 3 (Madhya Pradesh, Chhattisgarh, Uttar Pradesh)
-- - Northeast Zone: 8 (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
-- ============================================================================

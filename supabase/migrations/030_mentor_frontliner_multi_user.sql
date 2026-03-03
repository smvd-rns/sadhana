-- Migration: Add multi-user columns for Mentor and Frontliner roles
-- These new array columns allow multiple users per role.
-- Old single-value columns (mentor_id, mentor_name, frontliner_id, frontliner_name) are kept for backwards compatibility.

ALTER TABLE centers
  ADD COLUMN IF NOT EXISTS mentor_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mentor_names TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frontliner_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS frontliner_names TEXT[] DEFAULT '{}';

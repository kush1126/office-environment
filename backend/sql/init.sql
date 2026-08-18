-- PostgreSQL initialization script
-- Run once on first container startup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Set timezone
SET timezone = 'Asia/Kolkata';

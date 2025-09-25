# Supabase Setup Guide

## Step 1: Create Free Supabase Account

1. Go to https://supabase.com
2. Sign up with GitHub/Google (free tier: 500MB database, 1GB file storage)
3. Create new project
4. Wait for project setup (2-3 minutes)

## Step 2: Get Your Project Credentials

After project creation, go to Settings > API:

- Project URL: `https://your-project-id.supabase.co`
- API Keys:
  - `anon/public` key (safe for client-side)
  - `service_role` key (server-side only, keep secret!)

## Step 3: Configure Database Tables

Go to SQL Editor and run:

```sql
-- Create trips table
CREATE TABLE trips (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID NOT NULL,
  image_path TEXT,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  trip_data JSONB NOT NULL,
  ai_insights JSONB,
  predictions JSONB,
  vehicle_model TEXT DEFAULT '2003 Honda Odyssey',
  total_profit DECIMAL,
  total_distance DECIMAL,
  gas_cost DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (for demo - restrict in production)
CREATE POLICY "Allow all operations" ON trips FOR ALL USING (true);

-- Create file storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-uploads', 'trip-uploads', true);

-- Create storage policy for public uploads
CREATE POLICY "Allow public uploads" ON storage.objects FOR ALL USING (bucket_id = 'trip-uploads');
```

## Step 4: Add Environment Variables

Create/update your .env.local file with:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Benefits:

- ✅ Free 500MB database + 1GB file storage
- ✅ Real-time updates and subscriptions
- ✅ Built-in auth and security
- ✅ Automatic backups
- ✅ Global CDN for fast file access
- ✅ SQL database with JSON support for complex trip data

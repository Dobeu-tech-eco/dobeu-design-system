/*
# Create projects and generations tables

1. New Tables
  - `projects`
    - `id` (serial, primary key)
    - `name` (text, not null) - project display name
    - `source_type` (text, not null) - one of: markdown, figma, repo
    - `source_ref` (text, not null) - original filename or repo URL
    - `repo_provider` (text, nullable) - github, gitlab, bitbucket, git
    - `repo_branch` (text, nullable) - branch that was analyzed
    - `status` (text, not null, default 'ready') - ready or failed
    - `warnings` (jsonb, not null, default '[]') - array of warning strings
    - `source_summary` (text, nullable) - human-readable summary of the source
    - `design_profile` (jsonb, not null) - the extracted DesignProfile
    - `created_at` (timestamptz, default now)
    - `updated_at` (timestamptz, default now)
  - `generations`
    - `id` (serial, primary key)
    - `project_id` (integer, FK to projects, cascade delete)
    - `design_system_id` (text, not null) - catalog system identifier
    - `design_system_name` (text, not null) - display name
    - `status` (text, not null, default 'complete') - complete or failed
    - `files` (jsonb, not null, default '[]') - array of generated files
    - `notes` (text, nullable) - AI-generated commentary
    - `created_at` (timestamptz, default now)

2. Security
  - Enable RLS on both tables.
  - Allow anon + authenticated full CRUD (single-tenant, no auth).

3. Notes
  - This is a single-tenant app with no user authentication.
  - All data is intentionally public/shared within the app instance.
  - The schema mirrors the existing Drizzle ORM definitions in lib/db.
*/

CREATE TABLE IF NOT EXISTS projects (
  id serial PRIMARY KEY,
  name text NOT NULL,
  source_type text NOT NULL,
  source_ref text NOT NULL,
  repo_provider text,
  repo_branch text,
  status text NOT NULL DEFAULT 'ready',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_summary text,
  design_profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generations (
  id serial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  design_system_id text NOT NULL,
  design_system_name text NOT NULL,
  status text NOT NULL DEFAULT 'complete',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Projects policies (single-tenant, public access)
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- Generations policies (single-tenant, public access)
DROP POLICY IF EXISTS "anon_select_generations" ON generations;
CREATE POLICY "anon_select_generations" ON generations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_generations" ON generations;
CREATE POLICY "anon_insert_generations" ON generations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_generations" ON generations;
CREATE POLICY "anon_update_generations" ON generations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_generations" ON generations;
CREATE POLICY "anon_delete_generations" ON generations FOR DELETE
  TO anon, authenticated USING (true);

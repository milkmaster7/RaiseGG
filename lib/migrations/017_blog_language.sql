-- Add language support to blog posts
ALTER TABLE ai_blog_posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Index for language filtering
CREATE INDEX IF NOT EXISTS idx_blog_language ON ai_blog_posts(language);

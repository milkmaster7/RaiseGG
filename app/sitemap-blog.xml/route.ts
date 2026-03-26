// Blog sitemap — served at /sitemap-blog.xml
// Mirrors esport.is's dual sitemap pattern (sitemap.xml + sitemap-news.xml)
import { NextResponse } from 'next/server'

const BASE = 'https://raisegg.gg'

export async function GET() {
  // TODO: replace with real blog posts from Supabase
  const posts: { slug: string; updatedAt: string }[] = []

  const urls = posts
    .map(
      (post) => `
    <url>
      <loc>${BASE}/blog/${post.slug}</loc>
      <lastmod>${post.updatedAt}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}

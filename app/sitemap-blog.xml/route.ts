// Blog sitemap — served at /sitemap-blog.xml
import { NextResponse } from 'next/server'
import { BLOG_POSTS } from '@/lib/blog'

const BASE = 'https://raisegg.gg'

export async function GET() {
  const posts = BLOG_POSTS.map((p) => ({ slug: p.slug, updatedAt: p.publishedAt }))

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

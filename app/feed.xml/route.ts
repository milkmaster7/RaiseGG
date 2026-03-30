import { getAllBlogPosts } from '@/lib/blog'

export async function GET() {
  const posts = await getAllBlogPosts()
  const BASE = 'https://raisegg.com'

  const items = posts
    .slice(0, 50)
    .map(
      (p) => `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      <description><![CDATA[${p.description}]]></description>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <category>${p.tag}</category>
      <author>hello@raisegg.com (RaiseGG)</author>
    </item>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>RaiseGG Blog — CS2, Dota 2 &amp; Deadlock Guides</title>
    <link>${BASE}/blog</link>
    <description>Guides, staking strategies and competitive tips for CS2, Dota 2 and Deadlock players.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}

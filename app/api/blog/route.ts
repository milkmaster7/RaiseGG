import { NextRequest, NextResponse } from 'next/server'
import { getAllBlogPosts, getBlogPostWithAI } from '@/lib/blog'

// GET /api/blog — list all posts, or fetch single post with ?slug=
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (slug) {
    const post = await getBlogPostWithAI(slug)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json(post)
  }

  const posts = await getAllBlogPosts()
  // Return posts without full content for the listing
  const listing = posts.map(({ content, ...rest }) => rest)
  return NextResponse.json(listing)
}

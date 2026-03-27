import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/_next/', '/embed/'],
      },
    ],
    sitemap: [
      'https://raisegg.gg/sitemap.xml',
      'https://raisegg.gg/sitemap-blog.xml',
    ],
  }
}

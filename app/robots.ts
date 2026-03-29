import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/api', '/admin/', '/admin', '/dashboard/', '/dashboard', '/_next/', '/embed/'],
      },
    ],
    sitemap: ['https://raisegg.com/sitemap.xml'],
  }
}

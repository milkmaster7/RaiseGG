'use client'

import { Youtube, Play } from 'lucide-react'

interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
}

interface Props {
  channelHandle?: string
  videos: YouTubeVideo[]
}

export function YouTubeSection({ channelHandle = 'RaiseGG', videos }: Props) {
  const channelUrl = `https://www.youtube.com/@${channelHandle}`

  if (videos.length === 0) {
    return (
      <section className="bg-space-800 border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Youtube className="w-6 h-6 text-red-500" />
            <h2 className="section-title">Watch RaiseGG</h2>
          </div>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Highlights, tutorials and big match moments — on our YouTube channel.
          </p>
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded transition-colors"
          >
            <Youtube className="w-5 h-5" />
            Subscribe on YouTube
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-space-800 border-y border-border py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Youtube className="w-6 h-6 text-red-500" />
            <h2 className="section-title">Watch RaiseGG</h2>
          </div>
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors"
          >
            <Youtube className="w-4 h-4" />
            Subscribe
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {videos.map((video) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group block"
            >
              <div className="relative aspect-video mb-4 overflow-hidden rounded bg-space-700">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-accent-purple transition-colors">
                {video.title}
              </h3>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

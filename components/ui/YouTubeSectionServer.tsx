import { YouTubeSection } from './YouTubeSection'

interface YouTubeVideo {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
}

async function fetchLatestVideos(
  channelId: string,
  apiKey: string,
  maxResults = 3
): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!data.items) return []
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
    }))
  } catch (_) {
    return []
  }
}

export async function YouTubeSectionServer() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID
  const apiKey    = process.env.YOUTUBE_API_KEY
  const handle    = process.env.NEXT_PUBLIC_YOUTUBE_HANDLE ?? 'RaiseGG'

  // If no API credentials configured, show subscribe card only
  if (!channelId || !apiKey) {
    return <YouTubeSection channelHandle={handle} videos={[]} />
  }

  const videos = await fetchLatestVideos(channelId, apiKey)
  return <YouTubeSection channelHandle={handle} videos={videos} />
}

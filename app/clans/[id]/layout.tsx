import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const { data: clan } = await supabase
    .from('clans')
    .select('name, tag, description, game_focus, region, member_count')
    .eq('id', id)
    .single()

  if (!clan) {
    return { title: 'Clan Not Found' }
  }

  const title = `${clan.name} [${clan.tag}] — RaiseGG Clan`
  const description = clan.description
    ? clan.description.slice(0, 150)
    : `${clan.name} is a ${clan.game_focus?.toUpperCase() ?? 'multi-game'} clan with ${clan.member_count ?? 0} members on RaiseGG.`

  return {
    title,
    description,
    alternates: { canonical: `https://raisegg.com/clans/${id}` },
    openGraph: {
      title,
      description,
      url: `https://raisegg.com/clans/${id}`,
      siteName: 'RaiseGG',
      type: 'website',
      images: [{ url: `/api/og?title=${encodeURIComponent(clan.name)}&sub=RaiseGG+Clan&color=7b61ff`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og?title=${encodeURIComponent(clan.name)}&sub=RaiseGG+Clan&color=7b61ff`],
    },
  }
}

export default function ClanDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}

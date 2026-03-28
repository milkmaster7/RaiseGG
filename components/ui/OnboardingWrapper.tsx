'use client'
import { OnboardingModal } from './OnboardingModal'

export function OnboardingWrapper({ hasBalance }: { hasBalance: boolean }) {
  return <OnboardingModal hasBalance={hasBalance} />
}

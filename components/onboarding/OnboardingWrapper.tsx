'use client'

import { useState, useEffect } from 'react'
import { OnboardingFlow } from './OnboardingFlow'
import { FirstMatchGuide } from './FirstMatchGuide'

interface Props {
  hasBalance: boolean
}

export function OnboardingWrapper({ hasBalance }: Props) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    // Don't show if user already has balance (they figured it out)
    if (hasBalance) return
    const done = localStorage.getItem('raisegg_onboarded')
    if (!done) {
      setShowOnboarding(true)
    } else {
      // Onboarding complete, check if first-match guide should show
      const guideComplete = localStorage.getItem('raisegg_first_match_complete')
      if (!guideComplete) {
        setShowGuide(true)
      }
    }
  }, [hasBalance])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // After onboarding flow, activate the first-match guide
    const guideComplete = localStorage.getItem('raisegg_first_match_complete')
    if (!guideComplete) {
      setShowGuide(true)
    }
  }

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {showGuide && !showOnboarding && <FirstMatchGuide />}
    </>
  )
}

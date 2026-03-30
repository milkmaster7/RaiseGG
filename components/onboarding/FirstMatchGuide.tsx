'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { GuideTooltip } from './GuideTooltip'

const STORAGE_KEY = 'raisegg_first_match_complete'
const DEPOSIT_KEY = 'raisegg_has_deposited'

type GuideStep = {
  id: number
  path: string
  title: string
  description: string
  actionLabel: string
  position: { top?: string; bottom?: string; left?: string; right?: string }
  arrow: 'top' | 'bottom' | 'left' | 'right'
  /** If true, this step requires a condition beyond just the path match */
  requiresDeposit?: boolean
  /** If true, this step shows after first match */
  requiresFirstMatch?: boolean
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 1,
    path: '/play',
    title: 'Welcome to the Lobby',
    description:
      'This is where you find matches. Browse open lobbies or click "Create Match" to start your first game. Pick your game, set a stake, and wait for an opponent.',
    actionLabel: 'Got it',
    position: { top: '180px', right: '24px' },
    arrow: 'top',
  },
  {
    id: 2,
    path: '/dashboard/wallet',
    title: 'Fund Your Wallet',
    description:
      'Deposit USDC or USDT to start staking. Minimum deposit is $1. Your funds are held in a Solana smart contract -- you stay in control at all times.',
    actionLabel: 'Got it',
    position: { top: '200px', left: '24px' },
    arrow: 'top',
  },
  {
    id: 3,
    path: '/play',
    title: "You're Ready to Play!",
    description:
      "You're funded and ready. Create a match with your preferred stake or join an open lobby. The winner takes the pot minus a small platform rake.",
    actionLabel: 'Let\'s go!',
    position: { top: '180px', right: '24px' },
    arrow: 'top',
    requiresDeposit: true,
  },
  {
    id: 4,
    path: '/dashboard',
    title: 'First Match Complete!',
    description:
      'Congratulations on completing your first stake match! Check your wallet for winnings. Keep playing to climb the leaderboard and unlock achievements.',
    actionLabel: 'Awesome!',
    position: { top: '120px', left: '24px' },
    arrow: 'top',
    requiresFirstMatch: true,
  },
]

export function FirstMatchGuide() {
  const pathname = usePathname()
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [dismissed, setDismissed] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if tutorial is already complete
    const complete = localStorage.getItem(STORAGE_KEY)
    if (complete) {
      setDismissed(true)
      return
    }

    // Check if onboarding flow is done (prerequisite)
    const onboarded = localStorage.getItem('raisegg_onboarded')
    if (!onboarded) {
      setDismissed(true)
      return
    }

    // Load saved step
    const savedStep = localStorage.getItem('raisegg_guide_step')
    const step = savedStep ? parseInt(savedStep) : 1
    setCurrentStep(step)
    setDismissed(false)
  }, [])

  // Determine which step to show based on current path and conditions
  useEffect(() => {
    if (dismissed || currentStep < 1) {
      setVisible(false)
      return
    }

    const stepDef = GUIDE_STEPS.find((s) => s.id === currentStep)
    if (!stepDef) {
      setVisible(false)
      return
    }

    // Check path match
    const pathMatches = pathname === stepDef.path || pathname.startsWith(stepDef.path + '/')

    // Check deposit condition
    if (stepDef.requiresDeposit) {
      const deposited = localStorage.getItem(DEPOSIT_KEY)
      if (!deposited) {
        setVisible(false)
        return
      }
    }

    // Check first match condition
    if (stepDef.requiresFirstMatch) {
      const firstMatch = localStorage.getItem('raisegg_first_match_done')
      if (!firstMatch) {
        setVisible(false)
        return
      }
    }

    if (pathMatches) {
      // Small delay for page transition
      const t = setTimeout(() => setVisible(true), 300)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [pathname, currentStep, dismissed])

  const advanceStep = useCallback(() => {
    const nextStep = currentStep + 1
    if (nextStep > GUIDE_STEPS.length) {
      // Tutorial complete
      localStorage.setItem(STORAGE_KEY, '1')
      setDismissed(true)
      setVisible(false)
    } else {
      setCurrentStep(nextStep)
      localStorage.setItem('raisegg_guide_step', String(nextStep))
      setVisible(false)
    }
  }, [currentStep])

  const skipTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
    setVisible(false)
  }, [])

  if (dismissed || !visible) return null

  const stepDef = GUIDE_STEPS.find((s) => s.id === currentStep)
  if (!stepDef) return null

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div className="fixed inset-0 z-[55] bg-black/30 pointer-events-none" />

      {/* Tooltip */}
      <div
        className="fixed z-[56]"
        style={{
          top: stepDef.position.top,
          bottom: stepDef.position.bottom,
          left: stepDef.position.left,
          right: stepDef.position.right,
        }}
      >
        <div
          className={`transition-all duration-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <GuideTooltip
            title={stepDef.title}
            description={stepDef.description}
            actionLabel={stepDef.actionLabel}
            onAction={advanceStep}
            onSkip={skipTutorial}
            currentStep={currentStep}
            totalSteps={GUIDE_STEPS.length}
            arrow={stepDef.arrow}
          />
        </div>
      </div>
    </>
  )
}

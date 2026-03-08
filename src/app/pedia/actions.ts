'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface OnboardingEvent {
  id: string
  event_type: string
  user_id: string | null
  metadata: {
    step: string
    action: 'view' | 'complete'
    duration_ms?: number
  }
  created_at: string
}

interface StepMetrics {
  step: string
  label: string
  views: number
  completions: number
  dropOffRate: number
  avgDurationSec: number | null
  medianDurationSec: number | null
}

interface DailyFunnel {
  date: string
  [step: string]: number | string
}

const STEP_ORDER = [
  'splash',
  'code_verify',
  'sign_in',
  'self_tags',
  'tag_someone_1',
  'tag_someone_2',
  'tag_someone_3',
]

const STEP_LABELS: Record<string, string> = {
  splash: 'Landing / Email',
  code_verify: 'Code Verification',
  sign_in: 'Sign In (Apple/Google)',
  columbia_only: 'Access Code Gate',
  self_tags: 'Pick Your Tags',
  tag_someone_1: 'Tag Someone #1',
  tag_someone_2: 'Tag Someone #2',
  tag_someone_3: 'Tag Someone #3',
}

export async function getPediaData(password: string) {
  if (password !== 'IN Ayen1234@') {
    return { error: 'Invalid password' }
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
    return { error: 'Service configuration error.' }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Fetch all onboarding_step events
    const { data: events, error: eventsError } = await supabase
      .from('cpedia_analytics_events')
      .select('id, event_type, user_id, metadata, created_at')
      .eq('event_type', 'onboarding_step')
      .order('created_at', { ascending: true })
      .limit(50000)

    if (eventsError) throw eventsError

    const typedEvents = (events || []) as OnboardingEvent[]

    // Also fetch onboarding_complete events for total completion count
    const { count: totalCompletions } = await supabase
      .from('cpedia_analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'onboarding_complete')

    // --- Compute step metrics ---
    const stepViews: Record<string, number> = {}
    const stepCompletions: Record<string, number> = {}
    const stepDurations: Record<string, number[]> = {}

    for (const event of typedEvents) {
      const step = event.metadata?.step
      const action = event.metadata?.action
      if (!step || !action) continue

      if (action === 'view') {
        stepViews[step] = (stepViews[step] || 0) + 1
      } else if (action === 'complete') {
        stepCompletions[step] = (stepCompletions[step] || 0) + 1
        if (event.metadata.duration_ms != null) {
          if (!stepDurations[step]) stepDurations[step] = []
          stepDurations[step].push(event.metadata.duration_ms)
        }
      }
    }

    const stepMetrics: StepMetrics[] = STEP_ORDER.map((step) => {
      const views = stepViews[step] || 0
      const completions = stepCompletions[step] || 0
      const dropOffRate = views > 0 ? ((views - completions) / views) * 100 : 0
      const durations = stepDurations[step] || []

      let avgDurationSec: number | null = null
      let medianDurationSec: number | null = null

      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0)
        avgDurationSec = Math.round((sum / durations.length) / 1000)

        const sorted = [...durations].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const medianMs = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid]
        medianDurationSec = Math.round(medianMs / 1000)
      }

      return {
        step,
        label: STEP_LABELS[step] || step,
        views,
        completions,
        dropOffRate: Math.round(dropOffRate * 10) / 10,
        avgDurationSec,
        medianDurationSec,
      }
    })

    // --- Daily funnel data (last 14 days) ---
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const dailyMap: Record<string, Record<string, number>> = {}
    for (let d = new Date(fourteenDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateKey = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York',
      })
      dailyMap[dateKey] = {}
      for (const step of STEP_ORDER) {
        dailyMap[dateKey][step] = 0
      }
    }

    for (const event of typedEvents) {
      const step = event.metadata?.step
      const action = event.metadata?.action
      if (!step || action !== 'view') continue

      const eventDate = new Date(event.created_at)
      if (eventDate < fourteenDaysAgo) continue

      const dateKey = eventDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York',
      })

      if (dailyMap[dateKey] && step in (dailyMap[dateKey] || {})) {
        dailyMap[dateKey][step]++
      }
    }

    const dailyFunnel: DailyFunnel[] = Object.entries(dailyMap).map(([date, steps]) => ({
      date,
      ...steps,
    }))

    // --- Unique user journey analysis ---
    // Group events by user_id to see where individual users dropped off
    const userJourneys: Record<string, Set<string>> = {}
    for (const event of typedEvents) {
      const uid = event.user_id || event.id // fallback for anonymous
      const step = event.metadata?.step
      const action = event.metadata?.action
      if (!step) continue

      if (!userJourneys[uid]) userJourneys[uid] = new Set()
      if (action === 'complete') {
        userJourneys[uid].add(step)
      }
    }

    // Figure out where users' last completed step was
    const lastStepCounts: Record<string, number> = {}
    for (const step of STEP_ORDER) lastStepCounts[step] = 0
    lastStepCounts['never_started'] = 0

    for (const completedSteps of Object.values(userJourneys)) {
      let lastStep = 'never_started'
      for (const step of STEP_ORDER) {
        if (completedSteps.has(step)) {
          lastStep = step
        }
      }
      lastStepCounts[lastStep] = (lastStepCounts[lastStep] || 0) + 1
    }

    // --- Summary stats ---
    const totalStarted = stepViews['splash'] || 0
    const totalFinished = totalCompletions || 0
    const overallCompletionRate = totalStarted > 0
      ? Math.round((totalFinished / totalStarted) * 1000) / 10
      : 0

    return {
      success: true,
      data: {
        stepMetrics,
        dailyFunnel,
        lastStepCounts,
        totalStarted,
        totalFinished,
        overallCompletionRate,
        totalEvents: typedEvents.length,
        timeZone: 'America/New_York',
      },
    }
  } catch (error: any) {
    console.error('Pedia Data Fetch Error:', error)
    return { error: error.message || 'Failed to fetch data' }
  }
}

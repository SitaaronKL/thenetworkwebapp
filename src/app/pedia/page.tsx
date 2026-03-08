'use client'

import { useState } from 'react'
import { getPediaData } from './actions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

interface StepMetrics {
  step: string
  label: string
  views: number
  completions: number
  dropOffRate: number
  avgDurationSec: number | null
  medianDurationSec: number | null
}

export default function PediaPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await getPediaData(password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setData(result.data)
      setIsAuthenticated(true)
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#003765] text-white">
        <form onSubmit={handleLogin} className="p-8 bg-[#00284d] rounded-2xl shadow-2xl w-full max-w-md border border-white/10">
          <h1 className="text-2xl font-bold mb-2 text-center">PDA</h1>
          <p className="text-sm text-white/50 mb-6 text-center">Columbiapedia Analytics</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full p-3 mb-4 bg-white/10 rounded-lg border border-white/20 focus:outline-none focus:border-white/50 text-white placeholder-white/30"
          />
          {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-[#003765] rounded-lg font-semibold transition-colors disabled:opacity-50 hover:bg-white/90"
          >
            {loading ? 'Loading...' : 'Enter'}
          </button>
        </form>
      </div>
    )
  }

  const stepMetrics: StepMetrics[] = data.stepMetrics || []

  // Funnel chart data
  const funnelData = stepMetrics.map((s: StepMetrics) => ({
    name: s.label,
    views: s.views,
    completions: s.completions,
    dropOff: s.views - s.completions,
  }))

  // Duration chart data
  const durationData = stepMetrics
    .filter((s: StepMetrics) => s.avgDurationSec !== null)
    .map((s: StepMetrics) => ({
      name: s.label,
      avg: s.avgDurationSec,
      median: s.medianDurationSec,
    }))

  // Color for drop-off severity
  const getDropOffColor = (rate: number) => {
    if (rate >= 50) return 'text-red-600 bg-red-50'
    if (rate >= 30) return 'text-orange-600 bg-orange-50'
    if (rate >= 15) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const formatDuration = (sec: number | null) => {
    if (sec === null) return '-'
    if (sec < 60) return `${sec}s`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  // Where users dropped off (last completed step)
  const lastStepData = Object.entries(data.lastStepCounts || {})
    .filter(([, count]) => (count as number) > 0)
    .map(([step, count]) => ({
      name: step === 'never_started'
        ? 'Never Started'
        : (stepMetrics.find((s: StepMetrics) => s.step === step)?.label || step),
      count: count as number,
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="min-h-screen bg-gray-50 text-black p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">PDA</h1>
            <p className="text-gray-500 mt-1">Columbiapedia Onboarding Analytics</p>
          </div>
          <button
            onClick={async () => {
              setLoading(true)
              const result = await getPediaData(password)
              if (!result.error) setData(result.data)
              setLoading(false)
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Started Onboarding</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.totalStarted}</p>
            <p className="text-xs text-gray-400 mt-2">Users who saw splash page</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completed Onboarding</h3>
            <p className="text-5xl font-bold mt-2 text-green-600">{data.totalFinished}</p>
            <p className="text-xs text-gray-400 mt-2">Reached main app</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</h3>
            <p className="text-5xl font-bold mt-2 text-blue-600">{data.overallCompletionRate}%</p>
            <p className="text-xs text-gray-400 mt-2">Start to finish</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Events</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.totalEvents.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">Onboarding step events tracked</p>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-1 text-gray-800">Onboarding Funnel</h3>
          <p className="text-sm text-gray-500 mb-6">Views vs completions at each step. Gap = drop-off.</p>
          <div className="h-80 w-full">
            {funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="views" fill="#3b82f6" name="Views" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completions" fill="#22c55e" name="Completions" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No onboarding data yet. Events will appear once users go through onboarding.
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step Metrics Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Step-by-Step Breakdown</h3>
            <p className="text-sm text-gray-500 mt-1">Where users drop off and how long they spend</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Step</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Views</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Completions</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Drop-off</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Avg Time</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Median Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {stepMetrics.map((step: StepMetrics, idx: number) => (
                  <tr key={step.step} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{step.label}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-medium">{step.views}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right font-medium">{step.completions}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDropOffColor(step.dropOffRate)}`}>
                        {step.dropOffRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatDuration(step.avgDurationSec)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatDuration(step.medianDurationSec)}</td>
                  </tr>
                ))}
                {stepMetrics.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Time Spent Per Step */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-1 text-gray-800">Time Spent Per Step</h3>
            <p className="text-sm text-gray-500 mb-6">Average and median seconds users spend on each step</p>
            <div className="h-64 w-full">
              {durationData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} label={{ value: 'seconds', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(value: any) => [`${value}s`, '']}
                    />
                    <Bar dataKey="avg" fill="#6366f1" name="Average" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="median" fill="#a78bfa" name="Median" radius={[4, 4, 0, 0]} />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No duration data yet
                </div>
              )}
            </div>
          </div>

          {/* Where Users Dropped Off */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-1 text-gray-800">Where Users Got Stuck</h3>
            <p className="text-sm text-gray-500 mb-6">Last completed step per unique user</p>
            <div className="h-64 w-full">
              {lastStepData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lastStepData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#9ca3af"
                      fontSize={11}
                      tickLine={false}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" fill="#ef4444" name="Users stuck here" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-1 text-gray-800">Daily Onboarding Activity (Last 14 Days)</h3>
          <p className="text-sm text-gray-500 mb-6">Step views per day (EST)</p>
          <div className="h-72 w-full">
            {data.dailyFunnel && data.dailyFunnel.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyFunnel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="splash" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Landing" />
                  <Line type="monotone" dataKey="sign_in" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Sign In" />
                  <Line type="monotone" dataKey="self_tags" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Self Tags" />
                  <Line type="monotone" dataKey="tag_someone_1" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Tag #1" />
                  <Line type="monotone" dataKey="tag_someone_3" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Tag #3 (final)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No daily data yet
              </div>
            )}
          </div>
        </div>

        {/* Visual funnel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Conversion Funnel</h3>
          <div className="space-y-2">
            {stepMetrics.map((step: StepMetrics, idx: number) => {
              const maxViews = stepMetrics[0]?.views || 1
              const widthPct = Math.max(5, (step.views / maxViews) * 100)
              return (
                <div key={step.step} className="flex items-center gap-4">
                  <div className="w-36 text-right text-sm text-gray-600 flex-shrink-0">
                    {step.label}
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: `hsl(${210 - idx * 25}, 70%, ${50 + idx * 5}%)`,
                      }}
                    >
                      <span className="text-white text-xs font-semibold">
                        {step.views} views / {step.completions} done
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-right flex-shrink-0">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getDropOffColor(step.dropOffRate)}`}>
                      {step.dropOffRate}%
                    </span>
                  </div>
                </div>
              )
            })}
            {stepMetrics.length === 0 && (
              <p className="text-center text-gray-400 py-8">No data yet. Events will appear once users go through onboarding.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { getAdminData, updateBetaStatus } from './actions'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [schoolFilter, setSchoolFilter] = useState('')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const TZ_EST = data?.timeZone || 'America/New_York'

  const chartData = useMemo(() => {
    if (!data) return []

    // Check if we have chartData from server (old format) - use it directly
    if (data.chartData && Array.isArray(data.chartData) && data.chartData.length > 0) {
      return data.chartData
    }

    // Otherwise, process recentData (new format). All date bucketing uses EST.
    const rawData = data.recentData || []
    const totalCount = data.totalCount || 0

    // Get the range (last 30 days) in EST for labels
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Create a map of date strings (in EST) to Date objects for proper sorting
    const dateMap = new Map<string, Date>()
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ_EST })
      dateMap.set(dateKey, new Date(d))
    }

    const dailyGrowth: Record<string, number> = {}

    // Initialize all days with 0
    dateMap.forEach((_, dateKey) => {
      dailyGrowth[dateKey] = 0
    })

    // Fill in actual counts from recentData; bucket each item by its date in EST
    if (rawData && Array.isArray(rawData)) {
      const sortedRawData = [...rawData].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateA - dateB
      })

      sortedRawData.forEach((item: any) => {
        if (item && item.created_at) {
          const itemDate = new Date(item.created_at)
          if (itemDate >= thirtyDaysAgo && itemDate <= now) {
            const dateKey = itemDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              timeZone: TZ_EST
            })
            if (dateKey in dailyGrowth) {
              dailyGrowth[dateKey]++
            }
          }
        }
      })
    }

    // To make it CUMULATIVE growth:
    // Calculate baseline: total users minus users who joined in last 30 days
    const usersInLast30Days = Array.isArray(rawData) ? rawData.length : 0
    const baseline = Math.max(0, totalCount - usersInLast30Days)

    // Convert to array and sort by actual date values
    const sortedEntries = Array.from(dateMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([dateKey]) => [dateKey, dailyGrowth[dateKey]] as [string, number])

    // Return daily added users (not cumulative)
    return sortedEntries.map(([date, dailyCount]) => {
      return { date, count: dailyCount, cumulative: 0 } // count is daily, cumulative for tooltip if needed
    })
  }, [data])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await getAdminData(password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setData(result.data)
      setIsAuthenticated(true)
      setLoading(false)
    }
  }

  const handleUpdateBetaStatus = async (userId: string, status: 'accepted' | 'rejected' | 'pending') => {
    const confirmMsg = `Are you sure you want to ${status} this beta tester?`
    if (!window.confirm(confirmMsg)) return

    const result = await updateBetaStatus(password, userId, status)
    if (result.success) {
      // Refresh data to show changes
      const updatedData = await getAdminData(password)
      if (!updatedData.error) {
        setData(updatedData.data)
      }
    } else {
      alert(result.error || 'Failed to update status')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full p-3 mb-4 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-white"
          />
          {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gray-50 text-black p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Waitlist Dashboard</h1>
            <p className="text-gray-500 mt-2">Growth & Acquisition Tracking</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-700"
          >
            Refresh Data
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Users</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.totalCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">
              {data.waitlistCount?.toLocaleString() || 0} waitlist + {data.profilesCount?.toLocaleString() || 0} profiles
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Webapp Profiles</h3>
            <p className="text-5xl font-bold mt-2 text-blue-600">{data.profilesCount?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-400 mt-2">Active users on platform</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">New Today (EST)</h3>
            <p className="text-5xl font-bold mt-2 text-green-600">+{data.todayCount.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">Since midnight America/New_York</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Top Source</h3>
            <p className="text-3xl font-bold mt-4 text-gray-900 truncate" title={data.sourceList[0]?.source}>
              {data.sourceList[0]?.source || 'N/A'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {data.sourceList[0]?.percentage}% of users
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100">
            <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Beta Testers</h3>
            <p className="text-5xl font-bold mt-2 text-purple-600">{data.betaTestersCount?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-400 mt-2">Interested in early access</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">% Beta Access Accepted</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.betaAcceptedPct ?? '0'}%</p>
            <p className="text-xs text-gray-400 mt-2">Of all users</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">% Who Share Invite Code</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.shareInvitePct ?? '0'}%</p>
            <p className="text-xs text-gray-400 mt-2">At least 1 signup via their code</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Avg Referrals per User</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.avgReferralsPerUser ?? '0'}</p>
            <p className="text-xs text-gray-400 mt-2">Waitlist referrals (converted)</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Schools Reached</h3>
            <p className="text-5xl font-bold mt-2 text-gray-900">{data.schoolsReached ?? 0}</p>
            <p className="text-xs text-gray-400 mt-2">Distinct schools on waitlist</p>
          </div>
        </div>

        {/* Top 3 Schools Closest to 20 Users */}
        {data.top3ClosestTo20 && data.top3ClosestTo20.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Top 3 Schools Closest to 20 Users</h3>
            <p className="text-sm text-gray-500 mb-4">Schools under 20 users, ranked by count</p>
            <div className="space-y-3">
              {data.top3ClosestTo20.map((school: { school: string; count: number; rank: number }, idx: number) => (
                <div key={school.school} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-blue-600">#{school.rank}</span>
                    <span className="text-sm font-medium text-gray-900">{school.school}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{school.count} users</span>
                    <span className="text-xs text-gray-400">({20 - school.count} to go)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts & Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Growth Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-1 text-gray-800">User Growth (Last 30 Days)</h3>
            <p className="text-sm text-gray-500 mb-6">Day buckets in EST</p>
            <div className="h-64 w-full">
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any) => [`Added: ${value} users`, 'Daily Signups']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No data available for the last 30 days
                </div>
              )}
            </div>
          </div>

          {/* Acquisition Sources */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Acquisition Sources</h3>
              {data.sourceList.length > 10 && (
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedTables)
                    if (newExpanded.has('sources')) {
                      newExpanded.delete('sources')
                    } else {
                      newExpanded.add('sources')
                    }
                    setExpandedTables(newExpanded)
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  {expandedTables.has('sources') ? 'Show Less' : `Show All (${data.sourceList.length})`}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Signups</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(expandedTables.has('sources') ? data.sourceList : data.sourceList.slice(0, 10)).map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.source}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-right font-medium">{item.count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.percentage}%</td>
                    </tr>
                  ))}
                  {data.sourceList.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Users by School - Ranked Table */}
        {data.schoolStats && data.schoolStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Users by School</h3>
                  <p className="text-sm text-gray-500 mt-1">Total user count per school (from waitlist + profiles), ranked by count</p>
                </div>
                {data.schoolStats.length > 10 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTables)
                      if (newExpanded.has('schools')) {
                        newExpanded.delete('schools')
                      } else {
                        newExpanded.add('schools')
                      }
                      setExpandedTables(newExpanded)
                    }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    {expandedTables.has('schools') ? 'Show Less' : `Show All (${data.schoolStats.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(expandedTables.has('schools') ? data.schoolStats : data.schoolStats.slice(0, 10)).map((row: { rank: number; school: string; count: number }) => (
                    <tr key={row.school} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center">#{row.rank}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.school}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-right font-medium">{row.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Time from 1st to 20th user by school (schools with 20+ only) */}
        {data.schoolTimeTo20 && data.schoolTimeTo20.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Time to 20 Users by School</h3>
                  <p className="text-sm text-gray-500 mt-1">Hours from 1st to 20th waitlist signup (EST). Only schools that have reached 20+.</p>
                </div>
                {data.schoolTimeTo20.length > 10 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTables)
                      if (newExpanded.has('timeTo20')) {
                        newExpanded.delete('timeTo20')
                      } else {
                        newExpanded.add('timeTo20')
                      }
                      setExpandedTables(newExpanded)
                    }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    {expandedTables.has('timeTo20') ? 'Show Less' : `Show All (${data.schoolTimeTo20.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">1st user (EST)</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">20th user (EST)</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Hours to 20</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(expandedTables.has('timeTo20') ? data.schoolTimeTo20 : data.schoolTimeTo20.slice(0, 10)).map((row: { school: string; first_at: string; twentieth_at: string; hours_to_20: number }) => (
                    <tr key={row.school} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.school}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row.first_at ? new Date(row.first_at).toLocaleString('en-US', { timeZone: data?.timeZone || 'America/New_York' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row.twentieth_at ? new Date(row.twentieth_at).toLocaleString('en-US', { timeZone: data?.timeZone || 'America/New_York' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {row.hours_to_20 != null ? (row.hours_to_20 >= 24 ? `${(row.hours_to_20 / 24).toFixed(1)} days` : `${row.hours_to_20} hrs`) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AB Campaign Performance */}
        {data.campaignAnalytics && data.campaignAnalytics.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Campaign Performance</h3>
                  <p className="text-sm text-gray-500 mt-1">AB Marketing Campaign Analytics</p>
                </div>
                {data.campaignAnalytics.length > 10 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTables)
                      if (newExpanded.has('campaigns')) {
                        newExpanded.delete('campaigns')
                      } else {
                        newExpanded.add('campaigns')
                      }
                      setExpandedTables(newExpanded)
                    }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    {expandedTables.has('campaigns') ? 'Show Less' : `Show All (${data.campaignAnalytics.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Variant</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Signups</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(expandedTables.has('campaigns') ? data.campaignAnalytics : data.campaignAnalytics.slice(0, 10)).map((campaign: any) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{campaign.campaign_name}</div>
                        <div className="text-xs text-gray-500">{campaign.campaign_code}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{campaign.school || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${campaign.variant === 'A' ? 'bg-blue-100 text-blue-800' :
                          campaign.variant === 'B' ? 'bg-purple-100 text-purple-800' :
                            campaign.variant === 'C' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {campaign.variant}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                        {campaign.signup_count}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {campaign.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Signups Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Recent Signups</h3>
                {!schoolFilter && (
                  <p className="text-xs text-gray-500 mt-1">
                    Showing top {expandedTables.has('recentSignups') ? data.recentSignups.length : Math.min(100, data.recentSignups.length)} most recent signups
                    {data.recentSignups.length > 100 && !expandedTables.has('recentSignups') && ` (of ${data.recentSignups.length} total)`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {schoolFilter && (
                  <span className="text-sm text-gray-600 font-medium">
                    Showing {data.recentSignups.filter((user: any) => {
                      const school = (user.school || '').toLowerCase();
                      return school.includes(schoolFilter.toLowerCase());
                    }).length} user{data.recentSignups.filter((user: any) => {
                      const school = (user.school || '').toLowerCase();
                      return school.includes(schoolFilter.toLowerCase());
                    }).length !== 1 ? 's' : ''} from "{schoolFilter}"
                  </span>
                )}
                {data.recentSignups.length > 100 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTables)
                      if (newExpanded.has('recentSignups')) {
                        newExpanded.delete('recentSignups')
                      } else {
                        newExpanded.add('recentSignups')
                      }
                      setExpandedTables(newExpanded)
                    }}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    {expandedTables.has('recentSignups') ? 'Show Less (Top 100)' : `Show All (${data.recentSignups.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="school-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by School
                </label>
                <input
                  id="school-filter"
                  type="text"
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  placeholder="Type school name (e.g., Fordham University)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {schoolFilter && (
                <button
                  onClick={() => setSchoolFilter('')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Beta Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {(expandedTables.has('recentSignups') ? data.recentSignups : data.recentSignups.slice(0, 100))
                  .filter((user: any) => {
                    if (!schoolFilter) return true;
                    const school = (user.school || '').toLowerCase().trim();
                    const filter = schoolFilter.toLowerCase().trim();
                    // More precise matching: exact match or school starts with filter
                    return school === filter || school.startsWith(filter) || school.includes(` ${filter}`);
                  })
                  .map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleString('en-US', { timeZone: data?.timeZone || 'America/New_York' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.school || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.campaign_code ? (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {user.campaign_code}
                        </span>
                      ) : user.referred_by_code ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Referral
                        </span>
                      ) : (
                        <span className="text-gray-400">Direct</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.interested_in_beta ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.beta_status === 'accepted' ? 'bg-green-100 text-green-800' :
                              user.beta_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {user.beta_status || 'pending'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateBetaStatus(user.id, 'accepted')}
                              className="p-1 hover:bg-green-100 rounded text-green-600"
                              title="Accept"
                            >
                              ✅
                            </button>
                            <button
                              onClick={() => handleUpdateBetaStatus(user.id, 'rejected')}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Reject"
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(expandedTables.has('recentSignups') ? data.recentSignups : data.recentSignups.slice(0, 100))
                  .filter((user: any) => {
                    if (!schoolFilter) return false;
                    const school = (user.school || '').toLowerCase();
                    return school.includes(schoolFilter.toLowerCase());
                  }).length === 0 && schoolFilter && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      No users found for "{schoolFilter}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Beta Testers List */}
        {data.betaTesters && data.betaTesters.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-purple-100 overflow-hidden">
            <div className="p-6 border-b border-purple-100 bg-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🧪</span>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900">Beta Testers</h3>
                    <p className="text-sm text-purple-600">Users interested in early access & giving feedback</p>
                  </div>
                </div>
                {data.betaTesters.length > 10 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedTables)
                      if (newExpanded.has('betaTesters')) {
                        newExpanded.delete('betaTesters')
                      } else {
                        newExpanded.add('betaTesters')
                      }
                      setExpandedTables(newExpanded)
                    }}
                    className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                  >
                    {expandedTables.has('betaTesters') ? 'Show Less' : `Show All (${data.betaTesters.length})`}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(expandedTables.has('betaTesters') ? data.betaTesters : data.betaTesters.slice(0, 10)).map((user: any) => (
                    <tr key={user.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.school || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleString('en-US', { timeZone: data?.timeZone || 'America/New_York' })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.beta_status === 'accepted' ? 'bg-green-100 text-green-800' :
                              user.beta_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {user.beta_status || 'pending'}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateBetaStatus(user.id, 'accepted')}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleUpdateBetaStatus(user.id, 'rejected')}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

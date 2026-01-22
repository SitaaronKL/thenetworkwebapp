'use client'

import { useState, useMemo } from 'react'
import { getAdminData } from './actions'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)

  const chartData = useMemo(() => {
    if (!data) return []
    
    // Check if we have chartData from server (old format) - use it directly
    if (data.chartData && Array.isArray(data.chartData) && data.chartData.length > 0) {
      return data.chartData
    }
    
    // Otherwise, process recentData (new format)
    const rawData = data.recentData || []
    const totalCount = data.totalCount || 0
    
    // Get the range (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Create a map of date strings to Date objects for proper sorting
    const dateMap = new Map<string, Date>()
    for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        dateMap.set(dateKey, new Date(d))
    }

    const dailyGrowth: Record<string, number> = {}
    
    // Initialize all days with 0
    dateMap.forEach((_, dateKey) => {
        dailyGrowth[dateKey] = 0
    })

    // Fill in actual counts from recentData (sorted by created_at first)
    if (rawData && Array.isArray(rawData)) {
      // Sort by created_at to ensure chronological order
      const sortedRawData = [...rawData].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return dateA - dateB
      })

      sortedRawData.forEach((item: any) => {
          if (item && item.created_at) {
            const itemDate = new Date(item.created_at)
            // Only count items within the 30-day window
            if (itemDate >= thirtyDaysAgo && itemDate <= now) {
              const dateKey = itemDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
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
    
    // Calculate cumulative values
    let runningTotal = baseline
    return sortedEntries.map(([date, dailyCount]) => {
        runningTotal += dailyCount
        return { date, count: runningTotal }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
             <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">New Today</h3>
             <p className="text-5xl font-bold mt-2 text-green-600">+{data.todayCount.toLocaleString()}</p>
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
        </div>

        {/* Charts & Sources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Growth Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-6 text-gray-800">User Growth (Last 30 Days)</h3>
                <div className="h-64 w-full">
                    {chartData && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
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
                <h3 className="text-lg font-bold mb-6 text-gray-800">Acquisition Sources</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-3 text-sm font-semibold text-gray-500">Source</th>
                                <th className="pb-3 text-sm font-semibold text-gray-500 text-right">Signups</th>
                                <th className="pb-3 text-sm font-semibold text-gray-500 text-right">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.sourceList.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-3 text-sm font-medium text-gray-900">{item.source}</td>
                                    <td className="py-3 text-sm text-gray-600 text-right">{item.count}</td>
                                    <td className="py-3 text-sm text-gray-400 text-right">{item.percentage}%</td>
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

        {/* Recent Signups Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Recent Signups</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">School</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {data.recentSignups.map((user: any) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.email}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleString()}
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
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  )
}

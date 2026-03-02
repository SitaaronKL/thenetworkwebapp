'use client'

import { useState } from 'react'
import { getDinnersAwaitingVenue, setVenue } from './actions'

interface DinnerRow {
  id: string
  vibe: string
  date: string
  area: string
  maxSize: number
  hostName: string
  acceptedCount: number
  createdAt: string
}

export default function VenueAdminPage() {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dinners, setDinners] = useState<DinnerRow[]>([])

  // Modal state
  const [selectedDinner, setSelectedDinner] = useState<DinnerRow | null>(null)
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await getDinnersAwaitingVenue(password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDinners(result.data || [])
      setIsAuthenticated(true)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    const result = await getDinnersAwaitingVenue(password)
    if (!result.error) {
      setDinners(result.data || [])
    }
    setLoading(false)
  }

  const openModal = (dinner: DinnerRow) => {
    setSelectedDinner(dinner)
    setVenueName('')
    setVenueAddress('')
    setSuccessMsg('')
  }

  const handleSubmitVenue = async () => {
    if (!selectedDinner || !venueName.trim()) return

    setSubmitting(true)
    const result = await setVenue(
      password,
      selectedDinner.id,
      venueName.trim(),
      venueAddress.trim()
    )
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg(`Venue "${venueName.trim()}" suggested! Notifications sent.`)
      setVenueName('')
      setVenueAddress('')
      // Refresh list after short delay so user sees success message
      setTimeout(async () => {
        setSelectedDinner(null)
        setSuccessMsg('')
        await handleRefresh()
      }, 1500)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // --- Login screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2 text-center">Venue Admin</h1>
          <p className="text-gray-400 text-sm text-center mb-6">Suggest restaurants for DNNRS dinners</p>
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

  // --- Dashboard ---
  return (
    <div className="min-h-screen bg-gray-50 text-black p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Venue Admin</h1>
            <p className="text-gray-500 mt-1">
              {dinners.length} dinner{dinners.length !== 1 ? 's' : ''} awaiting venue
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/admin900"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-700"
            >
              Dashboard
            </a>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Empty state */}
        {dinners.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-lg">No dinners awaiting venue</p>
            <p className="text-gray-300 text-sm mt-2">
              Dinners appear here when all seats fill up (status: picking_time)
            </p>
          </div>
        )}

        {/* Dinner cards */}
        <div className="space-y-4">
          {dinners.map((dinner) => (
            <button
              key={dinner.id}
              onClick={() => openModal(dinner)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{dinner.vibe}</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {formatDate(dinner.date)} &middot; {dinner.area}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Host: {dinner.hostName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    Picking time
                  </span>
                  <p className="text-gray-500 text-sm mt-2 font-medium">
                    {dinner.acceptedCount} / {dinner.maxSize}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedDinner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {successMsg ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">&#10003;</div>
                <p className="text-gray-900 font-semibold">{successMsg}</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Suggest Venue</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {selectedDinner.vibe} &middot; {formatDate(selectedDinner.date)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDinner(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restaurant name
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Carbone"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address or Maps link
                    </label>
                    <input
                      type="text"
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      placeholder="181 Thompson St, New York, NY"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    onClick={handleSubmitVenue}
                    disabled={!venueName.trim() || submitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Suggesting...' : 'Suggest Venue'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client';

import { useState, useEffect } from 'react';
import { getPartyAdminData, getPartyStats, deleteRsvp } from './actions';
import Link from 'next/link';

interface Party {
  id: string;
  slug: string;
  title: string;
  presenter_name: string | null;
  status: string;
  allow_rsvp: boolean;
  barcode_mode: string;
  created_at: string;
  updated_at: string;
  event_date: string | null;
  event_time: string | null;
  venue_address: string | null;
}

interface PartyStats {
  party_id: string;
  total_rsvps: number;
  going_count: number;
  maybe_count: number;
  declined_count: number;
  with_tickets: number;
}

interface RsvpDetail {
  id: string;
  waitlist_id?: string; // For waitlist entries
  user_id: string | null;
  status: string;
  ticket_code: string | null;
  rsvped_at: string;
  source: string | null;
  user_name: string | null;
  user_email: string | null;
  waitlist_name: string | null;
  waitlist_email: string | null;
}

export default function PartyAdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = useState<string | null>(null);
  const [partyStats, setPartyStats] = useState<Record<string, PartyStats>>({});
  const [rsvpDetails, setRsvpDetails] = useState<Record<string, RsvpDetail[]>>({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const ADMIN_PASSWORD = 'Superman1234@';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
      loadParties();
    } else {
      setError('Invalid password');
    }
    setLoading(false);
  };

  const loadParties = async () => {
    try {
      const result = await getPartyAdminData(ADMIN_PASSWORD);
      if (result.error) {
        setError(result.error);
        return;
      }
      setParties(result.data?.parties || []);
    } catch (err: any) {
      console.error('Error loading parties:', err);
      setError(err.message || 'Failed to load parties');
    }
  };

  const loadPartyStats = async (partyId: string) => {
    if (partyStats[partyId]) return; // Already loaded

    setLoadingStats(true);
    setError(''); // Clear previous errors
    try {
      const result = await getPartyStats(ADMIN_PASSWORD, partyId);
      
      if (result.error) {
        console.error('Error loading party stats:', result.error);
        setError(result.error);
        return;
      }

      if (result.data) {
        setPartyStats(prev => ({ ...prev, [partyId]: result.data!.stats }));
        setRsvpDetails(prev => ({ ...prev, [partyId]: result.data!.rsvps }));
      }
    } catch (err: any) {
      console.error('Error loading party stats:', err);
      const errorMessage = err?.message || err?.toString() || 'Failed to load party stats';
      setError(errorMessage);
      console.error('Full error object:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (selectedParty) {
      loadPartyStats(selectedParty);
    }
  }, [selectedParty]);

  const handleDeleteRsvp = async (rsvp: RsvpDetail) => {
    if (!confirm(`Are you sure you want to delete ${rsvp.user_name || rsvp.waitlist_name || rsvp.user_email || rsvp.waitlist_email}?`)) {
      return;
    }

    setDeletingId(rsvp.id);
    try {
      const result = await deleteRsvp(
        ADMIN_PASSWORD,
        rsvp.id,
        rsvp.source || 'waitlist',
        rsvp.waitlist_id,
        rsvp.waitlist_email || rsvp.user_email || undefined
      );

      if (result.error) {
        alert(result.error);
        return;
      }

      // Refresh the stats
      if (selectedParty) {
        setPartyStats(prev => {
          const newStats = { ...prev };
          delete newStats[selectedParty];
          return newStats;
        });
        setRsvpDetails(prev => {
          const newDetails = { ...prev };
          delete newDetails[selectedParty];
          return newDetails;
        });
        loadPartyStats(selectedParty);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete RSVP');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <form onSubmit={handleLogin} className="p-8 bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-center">Party Admin Access</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full p-3 mb-4 bg-gray-800 rounded border border-gray-700 focus:outline-none focus:border-amber-500 text-white"
            autoFocus
          />
          {error && <p className="text-red-400 mb-4 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 rounded font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  const stats = selectedParty ? partyStats[selectedParty] : null;
  const rsvps = selectedParty ? rsvpDetails[selectedParty] || [] : [];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Party Admin Dashboard</h1>
            <p className="text-gray-400">Manage parties, view statistics, and track RSVPs</p>
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setSelectedParty(null);
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Parties List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Parties List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">All Parties</h2>
              <div className="space-y-2">
                {parties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => setSelectedParty(party.id)}
                    className={`w-full text-left p-4 rounded border transition-colors ${
                      selectedParty === party.id
                        ? 'bg-amber-600 border-amber-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-semibold">{party.title}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {party.slug} • {party.status}
                    </div>
                    {partyStats[party.id] && (
                      <div className="text-xs text-gray-500 mt-2">
                        {partyStats[party.id].total_rsvps} RSVPs
                      </div>
                    )}
                  </button>
                ))}
                {parties.length === 0 && (
                  <p className="text-gray-500 text-sm">No parties found</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Party Details */}
          <div className="lg:col-span-2">
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {selectedParty ? (
              <div className="space-y-6">
                {/* Party Info */}
                {parties.find(p => p.id === selectedParty) && (
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">
                          {parties.find(p => p.id === selectedParty)?.title}
                        </h2>
                        <p className="text-gray-400 mt-1">
                          Slug: <code className="text-amber-400">/{parties.find(p => p.id === selectedParty)?.slug}</code>
                        </p>
                      </div>
                      <Link
                        href={`/party/${parties.find(p => p.id === selectedParty)?.slug}`}
                        target="_blank"
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-sm transition-colors"
                      >
                        View Public Page
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Status</div>
                        <div className="text-lg font-semibold mt-1">
                          {parties.find(p => p.id === selectedParty)?.status}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Barcode Mode</div>
                        <div className="text-lg font-semibold mt-1">
                          {parties.find(p => p.id === selectedParty)?.barcode_mode}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Venue</div>
                        <div className="text-lg font-semibold mt-1">
                          {parties.find(p => p.id === selectedParty)?.venue_address || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Time</div>
                        <div className="text-lg font-semibold mt-1">
                          {parties.find(p => p.id === selectedParty)?.event_time || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistics */}
                {stats && (
                  <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                    <h3 className="text-xl font-bold mb-4">Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-800 p-4 rounded">
                        <div className="text-xs text-gray-500 uppercase mb-1">Total RSVPs</div>
                        <div className="text-2xl font-bold">{stats.total_rsvps}</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-800 p-4 rounded">
                        <div className="text-xs text-gray-400 uppercase mb-1">Going</div>
                        <div className="text-2xl font-bold text-green-400">{stats.going_count}</div>
                      </div>
                      <div className="bg-yellow-900/30 border border-yellow-800 p-4 rounded">
                        <div className="text-xs text-gray-400 uppercase mb-1">Maybe</div>
                        <div className="text-2xl font-bold text-yellow-400">{stats.maybe_count}</div>
                      </div>
                      <div className="bg-red-900/30 border border-red-800 p-4 rounded">
                        <div className="text-xs text-gray-400 uppercase mb-1">Declined</div>
                        <div className="text-2xl font-bold text-red-400">{stats.declined_count}</div>
                      </div>
                      <div className="bg-amber-900/30 border border-amber-800 p-4 rounded">
                        <div className="text-xs text-gray-400 uppercase mb-1">With Tickets</div>
                        <div className="text-2xl font-bold text-amber-400">{stats.with_tickets}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* RSVP List */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">RSVP List</h3>
                    {loadingStats && <span className="text-sm text-gray-400">Loading...</span>}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Ticket Code</th>
                          <th className="text-left p-2">Source</th>
                          <th className="text-left p-2">RSVP Date</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rsvps.map((rsvp) => (
                          <tr key={rsvp.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="p-2">
                              {rsvp.user_name || rsvp.waitlist_name || 'N/A'}
                            </td>
                            <td className="p-2 text-gray-400">
                              {rsvp.user_email || rsvp.waitlist_email || 'N/A'}
                            </td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                rsvp.status === 'going' ? 'bg-green-900/50 text-green-400' :
                                rsvp.status === 'maybe' ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-red-900/50 text-red-400'
                              }`}>
                                {rsvp.status}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-amber-400">
                              {rsvp.ticket_code || '—'}
                            </td>
                            <td className="p-2 text-gray-400">
                              {rsvp.source || 'N/A'}
                            </td>
                            <td className="p-2 text-gray-400">
                              {new Date(rsvp.rsvped_at).toLocaleDateString()}
                            </td>
                            <td className="p-2">
                              <button
                                onClick={() => handleDeleteRsvp(rsvp)}
                                disabled={deletingId === rsvp.id}
                                className="px-3 py-1 bg-red-900/50 hover:bg-red-900/70 border border-red-800 text-red-400 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingId === rsvp.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {rsvps.length === 0 && !loadingStats && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-500">
                              No RSVPs yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-12 border border-gray-800 text-center">
                <p className="text-gray-400">Select a party from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

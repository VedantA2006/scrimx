import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { HiSearch, HiCollection, HiUserGroup, HiCalendar, HiCash, HiLightningBolt, HiViewGrid } from 'react-icons/hi';

const STATUS_CONFIG = {
  draft:               { label: 'Draft',              color: 'text-dark-400 bg-dark-800 border-dark-700' },
  published:           { label: 'Published',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  registrations_open:  { label: 'Reg. Open',          color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  registrations_closed:{ label: 'Reg. Closed',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  check_in:            { label: 'Check-In',           color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  live:                { label: 'Live',               color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  completed:           { label: 'Completed',          color: 'text-dark-500 bg-dark-900 border-dark-700' },
};

const AllTournamentsPage = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/tournaments/public');
        if (res.success) {
          setTournaments(res.data);
          setFiltered(res.data);
        }
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter whenever search or statusFilter changes
  useEffect(() => {
    let result = [...tournaments];
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (search.trim()) result = result.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [search, statusFilter, tournaments]);

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white">All Tournaments</h1>
            <p className="text-dark-400 mt-2">Browse every tournament hosted on ScrimX — from draft to completed.</p>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tournaments..."
                className="input-field pl-10 w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-52"
            >
              <option value="all">All Statuses</option>
              <option value="registrations_open">Registration Open</option>
              <option value="published">Published</option>
              <option value="check_in">Check-In</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 bg-dark-900 rounded-2xl border border-surface-border animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-surface-border rounded-2xl text-center">
              <HiViewGrid className="text-5xl text-dark-600 mb-3" />
              <p className="text-dark-400 font-medium">No tournaments found.</p>
              {(search || statusFilter !== 'all') && (
                <button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-3 text-neon-cyan text-sm hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(t => {
                const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.draft;
                return (
                  <div
                    key={t._id}
                    onClick={() => navigate(`/tournaments/${t.shortCode || t._id}`)}
                    className="group bg-dark-900 border border-surface-border rounded-2xl overflow-hidden hover:border-neon-cyan/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)] transition-all cursor-pointer"
                  >
                    {/* Banner */}
                    <div className="relative h-32 bg-gradient-to-br from-dark-800 to-dark-700 overflow-hidden">
                      {t.banner ? (
                        <img
                          src={t.banner}
                          alt={t.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <HiCollection className="text-5xl text-dark-700" />
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-3 left-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded-full ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                      {/* Entry Fee */}
                      {t.finance?.entryFee > 0 && (
                        <div className="absolute top-3 right-3 bg-dark-950/80 text-neon-cyan text-xs font-bold px-2 py-1 rounded-lg">
                          ₹{t.finance.entryFee}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-white text-base leading-tight group-hover:text-neon-cyan transition-colors">{t.title}</h3>
                          {t.subtitle && <p className="text-xs text-dark-400 mt-0.5">{t.subtitle}</p>}
                        </div>
                        <span className="shrink-0 text-[10px] bg-dark-800 border border-surface-border text-dark-300 px-2 py-1 rounded uppercase tracking-wider">
                          {t.game}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400 mt-3">
                        <span className="flex items-center gap-1">
                          <HiUserGroup className="text-neon-cyan" />
                          {t.participation?.maxTeams || '—'} Teams
                        </span>
                        <span className="flex items-center gap-1">
                          <HiLightningBolt className="text-yellow-400" />
                          {t.format?.toUpperCase() || 'SQUAD'}
                        </span>
                        {t.finance?.totalPrizePool > 0 && (
                          <span className="flex items-center gap-1">
                            <HiCash className="text-green-400" />
                            ₹{t.finance.totalPrizePool.toLocaleString()}
                          </span>
                        )}
                        {t.schedule?.matchStartDate && (
                          <span className="flex items-center gap-1">
                            <HiCalendar className="text-primary-400" />
                            {new Date(t.schedule.matchStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/tournaments/${t.shortCode || t._id}`); }}
                        className="mt-4 w-full py-2 rounded-xl bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/20 text-sm font-bold transition-all"
                      >
                        View Tournament →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Count */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-dark-500 text-sm mt-8">
              Showing {filtered.length} of {tournaments.length} tournaments
            </p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AllTournamentsPage;

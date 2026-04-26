import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrimCard from '../components/ui/ScrimCard';
import { SkeletonCard } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { HiSearch, HiFilter, HiX, HiCollection, HiViewGrid, HiMenu, HiChevronLeft, HiChevronRight, HiArrowRight } from 'react-icons/hi';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    format: searchParams.get('format') || '',
    mode: searchParams.get('mode') || '',
    skillTier: searchParams.get('skillTier') || '',
    minPrize: searchParams.get('minPrize') || '',
    maxFee: searchParams.get('maxFee') || '',
    sort: searchParams.get('sort') || '-date',
    featured: searchParams.get('featured') || '',
    isElite: searchParams.get('isElite') || '',
  });

  const [activeTab, setActiveTab] = useState('all');
  const priceDebounceRef = useRef(null);

  const fetchScrims = async (page = 1, overrideFilters = null) => {
    setLoading(true);
    try {
      const activeFilters = overrideFilters || filters;
      const params = { page, limit: 12 };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const data = await api.get('/scrims', { params });
      setScrims(data.scrims);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch scrims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrims();
  }, []);

  // UX B2: Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchScrims(1), 600);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchScrims(1);
  };

  // UX B1: Auto-apply filter dropdowns
  const updateFilter = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // For price inputs, debounce
    if (key === 'minPrize' || key === 'maxFee') {
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current);
      priceDebounceRef.current = setTimeout(() => fetchScrims(1, newFilters), 500);
    } else {
      fetchScrims(1, newFilters);
    }
  };

  const clearFilters = () => {
    const newFilters = { search: '', format: '', mode: '', skillTier: '', minPrize: '', maxFee: '', sort: '-date', featured: '', isElite: activeTab === 'featured' ? 'true' : '' };
    setFilters(newFilters);
    fetchScrims(1, newFilters);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const newFilters = { ...filters, isElite: tab === 'featured' ? 'true' : '' };
    setFilters(newFilters);
    fetchScrims(1, newFilters);
  };

  const hasActiveFilters = filters.format || filters.mode || filters.skillTier || filters.minPrize || filters.maxFee || filters.featured;

  // BUG A5: Smart pagination
  const buildPageNumbers = () => {
    const total = pagination.pages || 1;
    const current = pagination.page || 1;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set([1, total]);
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
      result.push(sorted[i]);
    }
    return result;
  };

  const totalScrims = pagination.total || scrims.length;

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white">Scrim Marketplace</h1>
              <p className="text-dark-400 mt-2">Discover and join premium BGMI scrims</p>
            </div>
            {/* Tabs */}
            <div className="flex bg-dark-900 border border-surface-border p-1 rounded-xl">
              <button
                onClick={() => handleTabChange('all')}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Normal Scrims
              </button>
              <button
                onClick={() => handleTabChange('featured')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'featured'
                    ? 'bg-gradient-to-r from-neon-cyan/20 to-primary-600 border border-neon-cyan/50 text-white shadow-lg shadow-neon-cyan/20'
                    : 'text-dark-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-neon-cyan">⚡</span> Featured Scrims
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search scrims by name, organizer, mode..."
                  className="input-field pl-10 pr-24"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs px-3 py-1.5">
                  Search
                </button>
              </div>
            </form>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-ghost text-sm px-4 py-2 flex items-center gap-2 ${hasActiveFilters ? 'border-neon-cyan/40 text-neon-cyan' : ''}`}
              >
                <HiFilter />
                Filters {hasActiveFilters && '•'}
              </button>

              <select
                value={filters.sort}
                onChange={(e) => { 
                  const newFilters = { ...filters, sort: e.target.value };
                  setFilters(newFilters); 
                  fetchScrims(1, newFilters); 
                }}
                className="input-field text-sm w-44"
              >
                <option value="-date">Newest First</option>
                <option value="date_asc">Starting Soon</option>
                <option value="prize_desc">Highest Prize</option>
                <option value="prize_asc">Lowest Prize</option>
                <option value="fee_asc">Lowest Fee</option>
                <option value="fee_desc">Highest Fee</option>
              </select>
            </div>
          </div>

          {/* BUG A2: Live count banner instead of fake stats */}
          {!loading && (
            <div className="mb-6 flex items-center gap-2 text-sm text-dark-400">
              <span className="text-lg">🎮</span>
              <span><span className="text-white font-bold">{totalScrims}</span> scrims available right now</span>
            </div>
          )}

          {/* Filter Panel — UX B1: auto-apply on change, no Apply button */}
          {showFilters && (
            <div className="card mb-6 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="text-dark-400 hover:text-white">
                  <HiX />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Format</label>
                  <select value={filters.format} onChange={(e) => updateFilter('format', e.target.value)} className="input-field text-sm">
                    <option value="">All Formats</option>
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                    <option value="squad">Squad</option>
                    <option value="tdm">TDM</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Mode</label>
                  <select value={filters.mode} onChange={(e) => updateFilter('mode', e.target.value)} className="input-field text-sm">
                    <option value="">All Modes</option>
                    <option value="tpp">TPP</option>
                    <option value="fpp">FPP</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Skill Tier</label>
                  <select value={filters.skillTier} onChange={(e) => updateFilter('skillTier', e.target.value)} className="input-field text-sm">
                    <option value="">All Tiers</option>
                    <option value="open">Open</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Min Prize</label>
                  <input type="number" value={filters.minPrize} onChange={(e) => updateFilter('minPrize', e.target.value)} placeholder="₹0" className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-1 block">Max Entry Fee</label>
                  <input type="number" value={filters.maxFee} onChange={(e) => updateFilter('maxFee', e.target.value)} placeholder="₹999" className="input-field text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-sm text-dark-400 hover:text-white">Clear all</button>
                )}
              </div>
            </div>
          )}

          {/* Results Header — BUG A3: functional view toggle */}
          <div className="flex items-center justify-between mb-4 mt-8">
             <h2 className="text-xl font-bold text-white">All Scrims</h2>
             <div className="flex bg-dark-900 border border-surface-border rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
                >
                  <HiViewGrid className="text-lg" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary-600/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
                >
                  <HiMenu className="text-lg" />
                </button>
             </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : scrims.length === 0 ? (
            <EmptyState
              icon={<HiCollection className="text-3xl text-dark-500" />}
              title="No scrims found"
              description="Try adjusting your filters or check back later for new scrims"
              action={hasActiveFilters && (
                <button onClick={clearFilters} className="btn-ghost text-sm px-4 py-2">Clear Filters</button>
              )}
            />
          ) : (
            <>
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                  : 'flex flex-col gap-4'
              }>
                {scrims.map((scrim) => (
                  <ScrimCard key={scrim._id} scrim={scrim} />
                ))}
              </div>

              {/* UX B7: Tournament promo — full-width banner below grid */}
              <div className="mt-6 p-4 bg-dark-900 border border-surface-border rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-sm font-bold text-white">Looking for bigger prizes?</p>
                    <p className="text-xs text-dark-400">Browse tournaments with larger prize pools and more competition.</p>
                  </div>
                </div>
                <Link to="/tournaments" className="btn-ghost text-xs px-4 py-2 whitespace-nowrap inline-flex items-center gap-1">
                  Browse Tournaments <HiArrowRight />
                </Link>
              </div>

              {/* BUG A5: Smart pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {/* Prev */}
                  <button
                    onClick={() => fetchScrims(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                      pagination.page <= 1 ? 'bg-dark-800 text-dark-600 cursor-not-allowed' : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <HiChevronLeft />
                  </button>

                  {buildPageNumbers().map((page, idx) => (
                    page === '...' ? (
                      <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-dark-500 text-sm">…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => fetchScrims(page)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                          page === pagination.page
                            ? 'bg-primary-600 text-white'
                            : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}

                  {/* Next */}
                  <button
                    onClick={() => fetchScrims(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                      pagination.page >= pagination.pages ? 'bg-dark-800 text-dark-600 cursor-not-allowed' : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'
                    }`}
                  >
                    <HiChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MarketplacePage;

import React, { useEffect, useState } from 'react';
import { HiFire, HiUserGroup, HiClock, HiCurrencyDollar } from 'react-icons/hi';
import api from '../../lib/api';

const FeaturedCarousel = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/boosts/featured');
        if (res.success && res.items) {
          setItems(res.items);
        }
      } catch (err) {
        console.error('Failed to fetch featured items', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading) return null; // or a skeleton loader

  if (items.length === 0) {
    return (
      <div className="w-full bg-dark-950 py-10 relative border-y border-orange-500/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-dark-400 text-sm">No featured events at the moment.</p>
        </div>
      </div>
    );
  }

  // Duplicate items for continuous seamless scroll
  const displayItems = [...items, ...items, ...items, ...items, ...items, ...items].slice(0, 20);

  const calculateTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    if (d > 0) return `${d}d ${h}h`;
    return `${h}h ${m}m`;
  };

  const getTheme = (idx) => {
    const themes = [
      { border: 'border-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
      { border: 'border-purple-500/50', text: 'text-purple-400', bg: 'bg-purple-500/10' },
      { border: 'border-orange-500/50', text: 'text-orange-400', bg: 'bg-orange-500/10' },
      { border: 'border-pink-500/50', text: 'text-pink-400', bg: 'bg-pink-500/10' },
      { border: 'border-green-500/50', text: 'text-green-400', bg: 'bg-green-500/10' },
    ];
    return themes[idx % themes.length];
  };

  return (
    <div className="w-full bg-dark-950 py-10 px-4 flex justify-center">
      <div className="w-full max-w-[1400px] border border-blue-500/20 rounded-[32px] p-6 md:p-8 bg-dark-900/30 backdrop-blur-sm relative overflow-hidden">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <HiFire className="text-orange-500" />
              Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Scrims & Tournaments</span>
            </h2>
            <p className="text-dark-400 text-sm mt-1">Boosted scrims and tournaments, get more visibility and more players.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/30">
              ⚡ Only {Math.max(0, 10 - items.length)} slots left
            </span>
            <a href="/marketplace" className="text-sm font-semibold text-white border border-surface-border hover:border-white/40 px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              View All &gt;
            </a>
          </div>
        </div>

        {/* Carousel Area */}
        <div className="relative w-full flex overflow-x-hidden group py-4 -mx-4 px-4">
          {/* Fading Edges */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-dark-900/50 to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-dark-900/50 to-transparent z-20 pointer-events-none" />
          
          <div className="animate-marquee flex gap-6 group-hover:[animation-play-state:paused]">
            {displayItems.map((item, idx) => {
              const theme = getTheme(idx);
              const isPrizeHighlight = item.prizePool > 0;
              
              return (
                <div 
                  key={`${item._id}-${idx}`} 
                  className={`relative w-[280px] sm:w-[320px] h-[400px] flex-shrink-0 bg-dark-950 border ${theme.border} rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-lg flex flex-col group/card`}
                >
                  {/* Banner Image */}
                  <div className="h-[180px] w-full relative bg-dark-800">
                    <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                      FEATURED
                    </div>
                    {item.banner ? (
                      <img src={item.banner} alt="banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                        <span className="text-5xl font-black text-white/5 uppercase tracking-widest">{item.title.substring(0, 3)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-transparent" />
                  </div>

                  {/* Content Area */}
                  <div className="p-4 pt-0 flex-1 flex flex-col relative z-10">
                    {/* Tag */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme.text}`}>
                      {item.type}
                    </span>
                    
                    {/* Title & Verified */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 overflow-hidden">
                        <h3 className="text-lg font-bold text-white truncate flex items-center gap-1.5">
                          {item.title}
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        </h3>
                        <p className="text-[10px] text-dark-400 truncate">By {item.organizerName}</p>
                      </div>
                      
                      {/* Highlight Box (Prize or Entry) */}
                      <div className={`flex-shrink-0 flex flex-col items-center justify-center border ${theme.border} ${theme.bg} rounded-lg px-3 py-1.5 min-w-[70px] group-hover/card:scale-105 transition-transform`}>
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${theme.text}`}>
                          {isPrizeHighlight ? 'PRIZE POOL' : 'ENTRY FEE'}
                        </span>
                        <span className="text-sm font-black text-white">
                          {isPrizeHighlight ? `₹${item.prizePool.toLocaleString()}` : (item.entryFee > 0 ? `₹${item.entryFee}` : 'FREE')}
                        </span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 my-4 border-y border-white/5 py-3">
                      <div>
                        <p className="text-[9px] text-dark-500 uppercase font-semibold mb-0.5">Entry Fee</p>
                        <p className="text-xs font-bold text-white">{item.entryFee > 0 ? `₹${item.entryFee}` : 'FREE'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-dark-500 uppercase font-semibold flex items-center gap-1 mb-0.5"><HiUserGroup className="text-blue-400" /> Joined</p>
                        <p className="text-xs font-bold text-white">{item.playersJoined}/{item.totalSlots}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-dark-500 uppercase font-semibold flex items-center gap-1 mb-0.5"><HiClock className="text-green-400" /> Starts In</p>
                        <p className="text-xs font-bold text-white">{calculateTimeLeft(item.startDate || item.highlightExpiresAt)}</p>
                      </div>
                    </div>

                    <div className="flex-1" />

                    {/* Footer Map info & Button */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-dark-400 font-medium">
                        {item.map} <span className="mx-1 text-dark-600">|</span> {item.format.charAt(0).toUpperCase() + item.format.slice(1)} <span className="mx-1 text-dark-600">|</span> {item.mode.toUpperCase()}
                      </p>
                      <a href={`/${item.type === 'scrim' ? 'marketplace' : 'tournaments'}/${item._id}`} className={`text-[10px] font-bold text-white border ${theme.border} hover:${theme.bg} px-4 py-1.5 rounded-full transition-colors`}>
                        View Details
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-center gap-2 mt-4 mb-8">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className={`h-1 rounded-full ${i === 0 ? 'w-8 bg-cyan-500' : 'w-8 bg-dark-600'}`}></div>
          ))}
        </div>

        {/* Boost Banner */}
        <div className="mt-4 border border-blue-500/20 bg-[#0A0D14] rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              🚀
            </div>
            <div>
              <h4 className="text-white font-bold text-lg">Boost Your Scrim / Tournament</h4>
              <p className="text-xs text-dark-400 mt-0.5">Get more visibility, more players and grow your community.</p>
            </div>
          </div>
          <a href="/organizer/plans" className="w-full md:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 transition-all whitespace-nowrap text-center text-sm tracking-wide">
            Boost Now ➔
          </a>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
          width: fit-content;
        }
      `}} />
    </div>
  );
};

export default FeaturedCarousel;

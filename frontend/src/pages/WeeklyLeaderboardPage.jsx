import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { HiLightningBolt, HiClock, HiShieldCheck, HiExclamation, HiChevronDown, HiChevronUp } from 'react-icons/hi';

const WeeklyLeaderboardPage = () => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [countdown, setCountdown] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const weekEndRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [current, hist] = await Promise.all([
          api.get('/weekly-leaderboard/current'),
          api.get('/weekly-leaderboard/history')
        ]);
        setData(current);
        setHistory(hist.history || []);
        weekEndRef.current = new Date(current.weekEnd);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (!weekEndRef.current) return;
      const diff = weekEndRef.current.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown({ d: 0, h: 0, m: 0, s: 0 });
        return;
      }
      setCountdown({
        d: Math.floor(diff / (86400000)),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

  const getStatusBadge = (entry) => {
    if (entry.qualified) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">✅ Qualified</span>;
    if (entry.isFlagged) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30" title={entry.flagReason}>🚩 Flagged</span>;
    if (!entry.meetsMinimum) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">⏳ Need {3 - entry.weeklyMatches} more</span>;
    return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-dark-700 text-dark-400 border border-surface-border">In Progress</span>;
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return <span className="text-yellow-400 font-black text-lg">🥇</span>;
    if (rank === 2) return <span className="text-gray-300 font-black text-lg">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
    return <span className="text-dark-400 font-bold">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-dark-900 rounded-2xl" />
            <div className="h-12 bg-dark-900 rounded-xl w-2/3" />
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-dark-900 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-900 via-dark-850 to-dark-900 border border-surface-border p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.08),transparent_60%)]" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-black text-white flex items-center gap-3">
                  <HiLightningBolt className="text-neon-cyan" /> Weekly Leaderboard
                </h1>
                <p className="text-dark-400 mt-2 text-sm md:text-base">Top 16 teams qualify for Sunday's ₹5,000 free-entry tournament</p>
                {data && (
                  <p className="text-dark-500 text-xs mt-1 font-mono">{formatDate(data.weekStart)} — {formatDate(data.weekEnd)}</p>
                )}
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-3">
                <HiClock className="text-neon-cyan text-xl" />
                <div className="flex gap-2">
                  {[
                    { val: countdown.d, label: 'D' },
                    { val: countdown.h, label: 'H' },
                    { val: countdown.m, label: 'M' },
                    { val: countdown.s, label: 'S' }
                  ].map((t, i) => (
                    <div key={i} className="bg-dark-950 border border-surface-border rounded-lg px-3 py-2 text-center min-w-[48px]">
                      <div className="text-xl font-display font-black text-neon-cyan">{String(t.val).padStart(2, '0')}</div>
                      <div className="text-[9px] text-dark-500 font-bold uppercase tracking-wider">{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Minimum matches warning */}
            <div className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2">
              <HiExclamation className="text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300">Teams must play at least 3 scrims this week to qualify</span>
            </div>
          </div>
        </div>

        {/* Qualification Banner */}
        <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-bold text-sm md:text-base">🏆 Top 16 qualify for Sunday ₹5,000 Tournament — Free Entry</p>
          <p className="text-dark-400 text-xs mt-1">{data?.qualifiedCount || 0} teams qualified so far</p>
        </div>

        {/* Main Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider w-16">Rank</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider">Team</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider">Matches</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider">Kills</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider">Points</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-bold text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.entries?.length > 0 ? data.entries.map((entry) => (
                  <tr
                    key={entry.team}
                    className={`border-b border-surface-border/50 hover:bg-dark-850/50 transition-colors ${
                      entry.rank <= 16 ? 'border-l-2 border-l-green-500/50' : ''
                    } ${entry.rank <= 3 ? 'bg-dark-900/30' : ''}`}
                  >
                    <td className="py-3 px-4">{getRankDisplay(entry.rank)}</td>
                    <td className="py-3 px-4">
                      <Link to={`/teams/${entry.team}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded bg-dark-800 overflow-hidden flex-shrink-0">
                          {entry.teamLogo ? (
                            <img src={entry.teamLogo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-dark-500 text-[10px] font-bold">{entry.teamTag}</div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-neon-cyan transition-colors">{entry.teamName}</div>
                          {entry.teamTag && <div className="text-[10px] text-dark-500 font-mono">[{entry.teamTag}]</div>}
                        </div>
                      </Link>
                    </td>
                    <td className={`text-center py-3 px-4 font-bold ${entry.weeklyMatches < 3 ? 'text-red-400' : 'text-white'}`}>
                      {entry.weeklyMatches}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-red-400">{entry.weeklyKills}</td>
                    <td className={`text-center py-3 px-4 font-bold ${entry.rank <= 3 ? 'text-neon-cyan text-lg' : 'text-neon-cyan'}`}>
                      {entry.weeklyPoints}
                    </td>
                    <td className="text-center py-3 px-4">{getStatusBadge(entry)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-dark-400">No entries yet this week. Play scrims to appear here!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Anti-cheat note */}
          <div className="px-4 py-3 border-t border-surface-border">
            <p className="text-[11px] text-dark-500 italic flex items-center gap-1">
              <HiShieldCheck className="text-dark-400" />
              Teams with abnormal kill rates are flagged and excluded from qualification pending admin review. Minimum 3 scrims required.
            </p>
          </div>
        </div>

        {/* Past Weeks History */}
        {history.length > 0 && (
          <div className="card">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <HiClock className="text-neon-cyan" /> Past Weeks
            </h3>
            <div className="space-y-2">
              {history.map((week, idx) => {
                const topTeam = week.entries?.[0];
                const isExpanded = expandedWeek === idx;
                return (
                  <div key={idx} className="border border-surface-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedWeek(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-850/50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-white font-bold text-sm">Week of {formatDate(week.weekStart)}</span>
                        {topTeam && (
                          <span className="text-dark-400 text-xs ml-3">
                            🏆 {topTeam.teamName} — {topTeam.weeklyPoints} pts
                          </span>
                        )}
                      </div>
                      {isExpanded ? <HiChevronUp className="text-dark-400" /> : <HiChevronDown className="text-dark-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-surface-border/50">
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-dark-500">
                              <th className="text-left py-1">Rank</th>
                              <th className="text-left py-1">Team</th>
                              <th className="text-center py-1">Matches</th>
                              <th className="text-center py-1">Kills</th>
                              <th className="text-center py-1">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {week.entries?.slice(0, 5).map((e, i) => (
                              <tr key={i} className="border-t border-surface-border/30">
                                <td className="py-1.5 text-dark-400 font-bold">#{e.rank || i + 1}</td>
                                <td className="py-1.5 text-white font-medium">{e.teamName}</td>
                                <td className="py-1.5 text-center text-dark-300">{e.weeklyMatches}</td>
                                <td className="py-1.5 text-center text-red-400">{e.weeklyKills}</td>
                                <td className="py-1.5 text-center text-neon-cyan font-bold">{e.weeklyPoints}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default WeeklyLeaderboardPage;

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const PlayerStats = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const { results: myResults } = await api.get('/results/my');
        setResults(myResults || []);
      } catch (err) {
        toast.error(err.message || 'Failed to fetch player stats');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, []);

  const totalKills = results.reduce((sum, r) => sum + (r.myKills || 0), 0);
  const totalScrims = results.length;
  const bestFinish = results.length > 0 ? Math.min(...results.filter(r => r.teamPlace).map(r => r.teamPlace)) : '-';
  const top3Count = results.filter(r => r.teamPlace <= 3).length;
  const winCount = results.filter(r => r.teamPlace === 1).length;

  const killTrendData = [...results].reverse().map(r => ({
    name: r.scrimTitle ? (r.scrimTitle.length > 10 ? r.scrimTitle.substring(0, 10) + '...' : r.scrimTitle) : 'Scrim',
    kills: r.myKills || 0,
    date: new Date(r.scrimDate).toLocaleDateString()
  }));

  const maxPlace = results.length > 0 ? Math.max(...results.filter(r => r.teamPlace).map(r => r.teamPlace), 20) : 20;

  const placeTrendData = [...results].reverse().map(r => ({
    name: r.scrimTitle ? (r.scrimTitle.length > 10 ? r.scrimTitle.substring(0, 10) + '...' : r.scrimTitle) : 'Scrim',
    place: r.teamPlace || 20,
    invertedPlace: r.teamPlace ? (maxPlace - r.teamPlace + 1) : 0 // invert so #1 is tallest
  }));

  const getPlaceColor = (place) => {
    if (place === 1) return '#FFD700'; // Gold
    if (place <= 3) return '#10B981'; // Green
    return '#6B7280'; // Gray
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-dark-900 rounded-xl border border-surface-border"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-dark-900 rounded-xl border border-surface-border"></div>
          <div className="h-64 bg-dark-900 rounded-xl border border-surface-border"></div>
        </div>
        <div className="h-96 bg-dark-900 rounded-xl border border-surface-border"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Stats</h1>
      </div>

      {/* Top stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-dark-900 border border-surface-border p-4 rounded-xl flex flex-col justify-center text-center">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">Total Kills</p>
          <p className="text-2xl font-bold text-red-500">{totalKills}</p>
        </div>
        <div className="bg-dark-900 border border-surface-border p-4 rounded-xl flex flex-col justify-center text-center">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">Total Scrims</p>
          <p className="text-2xl font-bold text-primary-500">{totalScrims}</p>
        </div>
        <div className="bg-dark-900 border border-surface-border p-4 rounded-xl flex flex-col justify-center text-center">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">Best Finish</p>
          <p className="text-2xl font-bold text-yellow-500">{bestFinish !== Infinity ? `#${bestFinish}` : '-'}</p>
        </div>
        <div className="bg-dark-900 border border-surface-border p-4 rounded-xl flex flex-col justify-center text-center">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">Top 3 Finishes</p>
          <p className="text-2xl font-bold text-green-400">{top3Count}</p>
        </div>
        <div className="bg-dark-900 border border-surface-border p-4 rounded-xl flex flex-col justify-center text-center">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">Wins</p>
          <p className="text-2xl font-bold text-neon-cyan">{winCount}</p>
        </div>
      </div>

      {/* Charts row */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-dark-850 border border-surface-border rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Kill Performance (Last 10 Scrims)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={killTrendData.slice(-10)}>
                  <XAxis dataKey="name" stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '0.5rem' }}
                    itemStyle={{ color: '#F87171' }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Line type="monotone" dataKey="kills" stroke="#F87171" strokeWidth={3} dot={{ r: 4, fill: '#F87171' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-dark-850 border border-surface-border rounded-xl p-5">
            <h3 className="text-white font-medium mb-4">Finish Positions</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placeTrendData.slice(-10)}>
                  <XAxis dataKey="name" stroke="#4B5563" fontSize={12} tickLine={false} axisLine={false} />
                  {/* Hide YAxis since it's inverted values */}
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', borderRadius: '0.5rem' }}
                    cursor={{ fill: '#1F2937' }}
                    formatter={(value, name, props) => [`#${props.payload.place}`, 'Position']}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Bar dataKey="invertedPlace" radius={[4, 4, 0, 0]}>
                    {placeTrendData.slice(-10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getPlaceColor(entry.place)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {/* History table */}
      <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border">
          <h2 className="text-white font-medium">Match History</h2>
        </div>
        
        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-dark-300">
              <thead className="text-xs uppercase bg-dark-850/50 text-dark-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Scrim</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-center">Finish</th>
                  <th className="px-5 py-3 font-medium text-center">Kills</th>
                  <th className="px-5 py-3 font-medium text-center">Points</th>
                  <th className="px-5 py-3 font-medium text-right">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-dark-850/30 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{res.scrimTitle}</td>
                    <td className="px-5 py-4">{new Date(res.scrimDate).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex justify-center items-center w-8 h-8 rounded-full font-bold ${
                        res.teamPlace === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                        res.teamPlace === 2 ? 'bg-gray-300/20 text-gray-300 border border-gray-300/30' :
                        res.teamPlace === 3 ? 'bg-orange-600/20 text-orange-500 border border-orange-600/30' :
                        'bg-dark-800 text-dark-400'
                      }`}>
                        {res.teamPlace || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-red-400 font-medium">{res.myKills}</td>
                    <td className="px-5 py-4 text-center text-neon-cyan font-medium">{res.totalPoints}</td>
                    <td className="px-5 py-4 text-right text-green-400 font-medium">
                      {res.prizeWon > 0 ? `₹${res.prizeWon}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-medium text-white mb-1">No match history yet</h3>
            <p className="text-dark-400 text-sm">Join a scrim and complete it to start tracking your performance stats.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default PlayerStats;

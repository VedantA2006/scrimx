import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { HiFire, HiStar, HiUserGroup, HiDesktopComputer, HiDeviceMobile, HiLightningBolt } from 'react-icons/hi';

const LeaderboardPage = () => {
  const [activeTab, setActiveTab] = useState('teams');
  
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [season, setSeason] = useState(null);

  const [playerLeaderboard, setPlayerLeaderboard] = useState([]);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerFetched, setPlayerFetched] = useState(false);

  const [weeklyData, setWeeklyData] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyFetched, setWeeklyFetched] = useState(false);

  useEffect(() => {
    const fetchTeamLeaderboard = async () => {
      try {
        const data = await api.get('/results/leaderboard?limit=50');
        setTeamLeaderboard(data.leaderboard);
      } catch (err) {
        console.error(err);
      } finally {
        setTeamLoading(false);
      }
    };
    fetchTeamLeaderboard();
    api.get('/seasons/current').then(res => setSeason(res.season)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'players' && !playerFetched) {
      const fetchPlayerLeaderboard = async () => {
        setPlayerLoading(true);
        try {
          const data = await api.get('/results/leaderboard/players?limit=50');
          setPlayerLeaderboard(data.leaderboard);
          setPlayerFetched(true);
        } catch (err) {
          console.error(err);
        } finally {
          setPlayerLoading(false);
        }
      };
      fetchPlayerLeaderboard();
    }
  }, [activeTab, playerFetched]);

  useEffect(() => {
    if (activeTab === 'weekly' && !weeklyFetched) {
      setWeeklyLoading(true);
      api.get('/weekly-leaderboard/current')
        .then(res => { setWeeklyData(res); setWeeklyFetched(true); })
        .catch(() => {})
        .finally(() => setWeeklyLoading(false));
    }
  }, [activeTab, weeklyFetched]);

  const getDeviceIcon = (device) => {
    if (device === 'mobile') return <HiDeviceMobile className="text-dark-400" title="Mobile" />;
    if (device === 'tablet') return <HiDeviceMobile className="w-5 h-5 rotate-90 text-dark-400" title="Tablet" />;
    if (device === 'emulator') return <HiDesktopComputer className="text-dark-400" title="Emulator" />;
    return <span className="text-dark-600">—</span>;
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto flex-1 w-full">
        {/* Season Banner */}
        {season && (
          <div className="mb-8 relative overflow-hidden rounded-2xl border border-neon-cyan/20 bg-gradient-to-r from-dark-900 via-primary-900/20 to-dark-900 p-6 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.08),transparent_50%)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full">CURRENT SEASON</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-black text-white">{season.name}</h2>
                <p className="text-dark-300 text-sm mt-1">{season.description || 'Compete, climb the ranks, and earn rewards.'}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-neon-cyan">{teamLeaderboard.length}</p>
                  <p className="text-[10px] text-dark-400 uppercase tracking-wider">Teams</p>
                </div>
                {season.endDate && (
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{Math.max(0, Math.ceil((new Date(season.endDate) - new Date()) / (1000 * 60 * 60 * 24)))}</p>
                    <p className="text-[10px] text-dark-400 uppercase tracking-wider">Days Left</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 flex items-center justify-center mx-auto mb-4 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
            <HiStar className="text-3xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-3">Global Leaderboard</h1>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto">The top performing BGMI entities across all tracked ScrimX tournaments this season.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="bg-dark-900 border border-surface-border p-1 rounded-xl inline-flex">
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'teams' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-dark-400 hover:text-white'
              }`}
            >
              Team Rankings
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'players' ? 'bg-red-500/20 text-red-400' : 'text-dark-400 hover:text-white'
              }`}
            >
              Player Kills
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                activeTab === 'weekly' ? 'bg-yellow-500/20 text-yellow-400' : 'text-dark-400 hover:text-white'
              }`}
            >
              ⚡ Weekly
            </button>
          </div>
        </div>

        {/* --- TEAMS TAB --- */}
        {activeTab === 'teams' && (
          teamLoading ? (
            <div className="animate-pulse space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-850 rounded-xl w-full" />)}
            </div>
          ) : (
            <>
              {/* Top 3 Podium Teams */}
              {teamLeaderboard.length >= 3 && (
                <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-16 px-4 hidden sm:flex animate-in fade-in zoom-in duration-500">
                  <PodiumCardTeam team={teamLeaderboard[1]} rank={2} height="h-32" color="from-gray-400" bgColor="bg-gray-400/10" borderColor="border-gray-400/30" />
                  <PodiumCardTeam team={teamLeaderboard[0]} rank={1} height="h-44" color="from-yellow-400" bgColor="bg-yellow-400/10" borderColor="border-yellow-400/30" />
                  <PodiumCardTeam team={teamLeaderboard[2]} rank={3} height="h-24" color="from-orange-400" bgColor="bg-orange-400/10" borderColor="border-orange-400/30" />
                </div>
              )}

              {/* Team List */}
              <div className="card overflow-hidden p-0 border-surface-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-900 border-b border-surface-border text-dark-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold w-16 text-center">Rank</th>
                        <th className="p-4 font-semibold">Team</th>
                        <th className="p-4 font-semibold text-center hidden sm:table-cell">No.of Scrims</th>
                        <th className="p-4 font-semibold text-center border-l border-surface-border">Total Position Points</th>
                        <th className="p-4 font-semibold text-center border-x border-surface-border bg-dark-850/50 text-red-400">Total Kill Points</th>
                        <th className="p-4 font-semibold text-center border-r border-surface-border bg-neon-cyan/5 text-neon-cyan">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {teamLeaderboard.map((team, index) => {
                        const positionPoints = Math.max(0, team.seasonPoints - team.totalKills);
                        return (
                          <tr key={team._id} className="hover:bg-dark-850 transition-colors group">
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                                index === 0 ? 'bg-yellow-500/10 text-yellow-500' :
                                index === 1 ? 'bg-gray-400/10 text-gray-400' :
                                index === 2 ? 'bg-orange-500/10 text-orange-500' :
                                'text-dark-400 bg-dark-800'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="p-4">
                              <Link to={`/teams/${team._id}`} className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-xl bg-dark-800 border border-surface-border flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-neon-cyan transition-colors">
                                  {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <HiUserGroup className="text-dark-500" />}
                                </div>
                                <div>
                                  <p className="text-white font-bold group-hover:text-neon-cyan transition-colors">{team.name}</p>
                                  {team.tag && <p className="text-xs text-dark-400 uppercase tracking-widest">{team.tag}</p>}
                                </div>
                              </Link>
                            </td>
                            <td className="p-4 text-center text-dark-300 hidden sm:table-cell">{team.totalScrims}</td>
                            <td className="p-4 text-center font-bold text-yellow-400 border-l border-surface-border bg-dark-850/10">{positionPoints}</td>
                            <td className="p-4 text-center font-bold text-red-400 border-x border-surface-border bg-dark-850/20">{team.totalKills}</td>
                            <td className="p-4 text-center font-bold text-neon-cyan border-r border-surface-border bg-neon-cyan/5 text-lg drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">{team.seasonPoints}</td>
                          </tr>
                        );
                      })}
                      {teamLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan="6" className="p-0">
                            <div className="text-center py-24">
                              <HiStar className="text-5xl text-dark-700 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-white mb-2">No team rankings yet</h3>
                              <p className="text-dark-400 text-sm max-w-sm mx-auto">Leaderboard rankings will appear here once scrims are completed and results are declared.</p>
                              <Link to="/marketplace" className="btn-primary text-sm px-6 py-2 mt-6 inline-block">Browse Scrims</Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}

        {/* --- PLAYERS TAB --- */}
        {activeTab === 'players' && (
          playerLoading ? (
            <div className="animate-pulse space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-850 rounded-xl w-full" />)}
            </div>
          ) : (
            <>
              {/* Top 3 Podium Players */}
              {playerLeaderboard.length >= 3 && (
                <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-16 px-4 hidden sm:flex animate-in fade-in zoom-in duration-500">
                  <PodiumCardPlayer player={playerLeaderboard[1]} rank={2} height="h-32" color="from-gray-400" bgColor="bg-gray-400/10" borderColor="border-gray-400/30" />
                  <PodiumCardPlayer player={playerLeaderboard[0]} rank={1} height="h-44" color="from-red-400" bgColor="bg-red-400/10" borderColor="border-red-400/30" icon={<HiFire className="text-red-500 mb-1" />} />
                  <PodiumCardPlayer player={playerLeaderboard[2]} rank={3} height="h-24" color="from-orange-400" bgColor="bg-orange-400/10" borderColor="border-orange-400/30" />
                </div>
              )}

              {/* Player List */}
              <div className="card overflow-hidden p-0 border-surface-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-900 border-b border-surface-border text-dark-400 text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold w-16 text-center">Rank</th>
                        <th className="p-4 font-semibold">Player</th>
                        <th className="p-4 font-semibold text-center">Device</th>
                        <th className="p-4 font-semibold text-center hidden sm:table-cell">Scrims Played</th>
                        <th className="p-4 font-semibold text-center border-l border-surface-border bg-red-500/5 text-red-400">Total Kills</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {playerLeaderboard.map((player, index) => (
                        <tr key={player.userId} className="hover:bg-dark-850 transition-colors group">
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                              index === 0 ? 'bg-red-500/10 text-red-500' :
                              index === 1 ? 'bg-gray-400/10 text-gray-400' :
                              index === 2 ? 'bg-orange-500/10 text-orange-500' :
                              'text-dark-400 bg-dark-800'
                            }`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-dark-800 border border-surface-border flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-red-400 transition-colors text-lg font-black text-dark-500">
                                {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : player.ign?.[0]?.toUpperCase() || player.username?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-bold group-hover:text-red-400 transition-colors flex items-center gap-2">
                                  {player.ign || player.username} {index === 0 && <HiFire className="text-red-500" />}
                                </p>
                                <p className="text-xs text-dark-400 tracking-wide">{player.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getDeviceIcon(player.device)}
                              <span className="text-xs text-dark-400 capitalize hidden sm:inline">{player.device || ''}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center text-dark-300 hidden sm:table-cell">{player.totalScrims}</td>
                          <td className="p-4 text-center font-bold text-red-400 border-l border-surface-border bg-red-500/5 text-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]">
                            {player.totalKills}
                          </td>
                        </tr>
                      ))}
                      {playerLeaderboard.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-0">
                            <div className="text-center py-24">
                              <HiFire className="text-5xl text-dark-700 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-white mb-2">No kill data yet</h3>
                              <p className="text-dark-400 text-sm max-w-sm mx-auto">Results will appear here once scrims are completed and kills are declared.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        )}

        {/* --- WEEKLY TAB --- */}
        {activeTab === 'weekly' && (
          weeklyLoading ? (
            <div className="animate-pulse space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-dark-850 rounded-xl w-full" />)}
            </div>
          ) : (
            <div className="mt-8">
              <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center mb-6">
                <HiLightningBolt className="text-4xl text-neon-cyan mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white mb-2">Weekly Leaderboard Preview</h3>
                <p className="text-dark-400 text-sm max-w-lg mx-auto mb-4">Top 16 teams at the end of the week automatically qualify for the Sunday ₹5,000 Tournament.</p>
                <Link to="/weekly-leaderboard" className="btn-neon inline-block">View Full Leaderboard & Countdown</Link>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-border bg-dark-900/50">
                        <th className="text-left p-4 text-dark-500 font-bold text-xs uppercase tracking-wider w-16">Rank</th>
                        <th className="text-left p-4 text-dark-500 font-bold text-xs uppercase tracking-wider">Team</th>
                        <th className="text-center p-4 text-dark-500 font-bold text-xs uppercase tracking-wider">Matches</th>
                        <th className="text-center p-4 text-dark-500 font-bold text-xs uppercase tracking-wider">Kills</th>
                        <th className="text-center p-4 text-neon-cyan font-bold text-xs uppercase tracking-wider">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyData?.entries?.slice(0, 10).map((entry, idx) => (
                        <tr key={entry.team} className="border-b border-surface-border/50 hover:bg-dark-850 transition-colors">
                          <td className="p-4 font-bold text-dark-400">#{entry.rank || idx + 1}</td>
                          <td className="p-4 font-bold text-white flex items-center gap-2">
                            {entry.teamLogo && <img src={entry.teamLogo} className="w-6 h-6 rounded object-cover" />}
                            {entry.teamName}
                          </td>
                          <td className="p-4 text-center text-dark-300">{entry.weeklyMatches}</td>
                          <td className="p-4 text-center text-red-400 font-bold">{entry.weeklyKills}</td>
                          <td className="p-4 text-center text-neon-cyan font-bold">{entry.weeklyPoints}</td>
                        </tr>
                      ))}
                      {!weeklyData?.entries?.length && (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-dark-400">No teams have played this week yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <Footer />
    </div>
  );
};

const PodiumCardTeam = ({ team, rank, height, color, bgColor, borderColor }) => (
  <Link to={`/teams/${team._id}`} className="flex-1 max-w-[200px] flex flex-col items-center group">
    <div className="text-center mb-3">
      <div className={`w-16 h-16 mx-auto rounded-2xl bg-dark-800 border-2 ${borderColor} group-hover:border-neon-cyan transition-colors flex items-center justify-center overflow-hidden mb-2 relative`}>
        {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <HiUserGroup className="text-dark-500 text-2xl" />}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-dark-950 border border-surface-border flex items-center justify-center text-xs font-bold bg-gradient-to-br ${color} to-dark-600 bg-clip-text text-transparent`}>
          {rank}
        </div>
      </div>
      <p className="font-bold text-white truncate px-2 group-hover:text-neon-cyan transition-colors">{team.name}</p>
      <p className="text-sm font-bold bg-gradient-to-r from-neon-cyan to-primary-500 bg-clip-text text-transparent">{team.seasonPoints} pts</p>
    </div>
    <div className={`w-full ${height} ${bgColor} border-t-2 ${borderColor} rounded-t-xl relative overflow-hidden flex items-center justify-center`}>
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-t ${color} to-transparent`} />
      <span className={`text-6xl font-black opacity-10 bg-gradient-to-b ${color} bg-clip-text text-transparent z-10 block`}>{rank}</span>
    </div>
  </Link>
);

const PodiumCardPlayer = ({ player, rank, height, color, bgColor, borderColor, icon }) => (
  <div className="flex-1 max-w-[200px] flex flex-col items-center group cursor-default">
    <div className="text-center mb-3 flex flex-col items-center">
      {icon}
      <div className={`w-16 h-16 mx-auto rounded-full bg-dark-800 border-2 ${borderColor} group-hover:border-red-400 transition-colors flex items-center justify-center overflow-hidden mb-2 relative`}>
        {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-dark-500">{player.ign?.[0]?.toUpperCase() || player.username?.[0]?.toUpperCase()}</span>}
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-dark-950 border border-surface-border flex items-center justify-center text-xs font-bold bg-gradient-to-br ${color} to-dark-600 bg-clip-text text-transparent`}>
          {rank}
        </div>
      </div>
      <p className="font-bold text-white truncate px-2 group-hover:text-red-400 transition-colors">{player.ign || player.username}</p>
      <p className="text-sm font-bold text-red-400">{player.totalKills} kills</p>
    </div>
    <div className={`w-full ${height} ${bgColor} border-t-2 ${borderColor} rounded-t-xl relative overflow-hidden flex items-center justify-center`}>
      <div className={`absolute inset-0 opacity-20 bg-gradient-to-t ${color} to-transparent`} />
      <span className={`text-6xl font-black opacity-10 bg-gradient-to-b ${color} bg-clip-text text-transparent z-10 block`}>{rank}</span>
    </div>
  </div>
);

export default LeaderboardPage;

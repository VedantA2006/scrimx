import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { HiSearch, HiUserGroup, HiPlus } from 'react-icons/hi';

const FindTeam = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTeams();
  }, [search]);

  const fetchTeams = async () => {
    try {
      const { teams } = await api.get(`/teams/public?search=${search}&limit=20`);
      setTeams(teams);
    } catch (err) {
      toast.error('Failed to fetch public teams');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <HiUserGroup className="text-neon-cyan" /> Find a Team
            </h1>
            <p className="text-dark-400 mt-1">Browse public rosters recruiting players right now.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              placeholder="Search team name or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-surface-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader /></div>
        ) : teams.length === 0 ? (
          <div className="card text-center py-16">
            <HiUserGroup className="text-4xl text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg text-white font-bold mb-2">No teams found</h3>
            <p className="text-dark-400">There are no public teams currently recruiting matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
              <div key={team._id} className="card hover:border-neon-cyan/50 transition-colors flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-xl bg-dark-800 border-2 border-surface-border flex items-center justify-center overflow-hidden mb-3">
                  {team.logo ? <img src={team.logo} className="w-full h-full object-cover"/> : <HiUserGroup className="text-2xl text-dark-500" />}
                </div>
                <h3 className="text-lg font-bold text-white mb-1"><Link className="hover:text-neon-cyan" to={`/teams/${team._id}`}>{team.name}</Link></h3>
                <Badge variant="primary" className="mb-4">{team.tag}</Badge>
                
                <div className="flex gap-4 text-sm text-dark-400 mb-3">
                  <div className="text-center">
                    <p className="font-bold text-white">{team.members?.length || 0}/4</p>
                    <p className="text-xs">Roster</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-yellow-400">{team.wins || 0}</p>
                    <p className="text-xs">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-red-400">{team.totalKills || 0}</p>
                    <p className="text-xs">Kills</p>
                  </div>
                </div>

                {team.seasonPoints > 0 && (
                  <div className="w-full px-4 py-2 bg-neon-cyan/5 border-t border-surface-border rounded-b-lg mb-3 flex items-center justify-between">
                    <span className="text-[10px] text-dark-400 uppercase tracking-wider">Season Points</span>
                    <span className="text-sm font-bold text-neon-cyan">{team.seasonPoints}</span>
                  </div>
                )}

                <Link to={`/teams/${team._id}`} className="btn-neon w-full px-4 py-2 text-sm flex items-center justify-center gap-2">
                  <HiPlus /> View & Apply
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FindTeam;

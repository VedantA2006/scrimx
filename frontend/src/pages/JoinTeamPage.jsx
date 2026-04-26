import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Loader from '../components/ui/Loader';
import { HiUserGroup, HiUsers, HiCheckCircle } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const JoinTeamPage = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const data = await api.get(`/teams/invite-link/${inviteCode}`);
        setTeam(data.team);
      } catch (err) {
        setError(err.message || 'Invalid invite link');
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    setJoining(true);
    try {
      await api.post(`/teams/invite-link/${inviteCode}/join`);
      toast.success('Successfully joined the team!');
      setJoined(true);
      setTimeout(() => navigate(`/teams/${team._id}`), 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to join team');
    } finally {
      setJoining(false);
    }
  };

  const isMember = team && user && team.members?.some(m => {
    const uid = m.user?._id || m.user;
    return String(uid) === String(user._id || user.id);
  });

  if (loading) return <><Navbar /><div className="min-h-screen bg-dark-950 pt-20 flex justify-center items-center"><Loader size="lg" /></div></>;

  if (error || !team) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="pt-32 text-center px-4">
          <div className="max-w-md mx-auto card">
            <div className="text-5xl mb-4">🔗</div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite Link</h1>
            <p className="text-dark-400 mb-6">{error || 'This invite link is invalid or has expired.'}</p>
            <Link to="/marketplace" className="btn-primary text-sm">Go to Marketplace</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="card text-center">
            {/* Team Logo */}
            <div className="w-24 h-24 rounded-2xl bg-dark-800 border-2 border-surface-border mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {team.logo ? (
                <img src={team.logo} className="w-full h-full object-cover" alt={team.name} />
              ) : (
                <HiUserGroup className="text-4xl text-dark-500" />
              )}
            </div>

            <h1 className="text-2xl font-display font-bold text-white mb-1">{team.name}</h1>
            <p className="text-dark-400 text-sm mb-1 font-mono">[{team.tag}]</p>
            {team.bio && <p className="text-dark-300 text-sm mb-4">{team.bio}</p>}

            <div className="flex items-center justify-center gap-2 text-dark-400 text-sm mb-6">
              <HiUsers />
              <span>{team.members?.length || 0} members</span>
            </div>

            <div className="border-t border-surface-border pt-4">
              <p className="text-sm text-dark-300 mb-4">You've been invited to join this team</p>

              {joined ? (
                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold py-3">
                  <HiCheckCircle className="text-xl" />
                  Joined! Redirecting...
                </div>
              ) : isMember ? (
                <div className="space-y-3">
                  <p className="text-sm text-dark-400">You're already a member of this team.</p>
                  <Link to={`/teams/${team._id}`} className="btn-primary w-full block text-center py-2.5 text-sm">
                    View Team
                  </Link>
                </div>
              ) : !isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-sm text-dark-400">Login to join this team.</p>
                  <Link to="/login" className="btn-neon w-full block text-center py-2.5 text-sm">
                    Login to Join
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="btn-neon w-full py-3 text-sm"
                >
                  {joining ? 'Joining...' : 'Join Team'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinTeamPage;

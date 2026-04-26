import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineX, HiOutlineCheck, HiOutlineLockClosed, HiOutlineUserGroup } from 'react-icons/hi';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LCQJoinPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/tournaments/join-invite/${token}`);
        if (res.success) setDetails(res.data);
        else setError(res.message || 'Invalid invite link.');
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired invite link.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please log in to join.');
      navigate('/login');
      return;
    }
    setJoining(true);
    try {
      const res = await api.post(`/tournaments/join-invite/${token}`);
      if (res.success) {
        setJoined(true);
        toast.success(res.message);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join. Please try again.';
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-dark-900 border border-red-500/30 rounded-2xl p-10 text-center">
        <HiOutlineX className="mx-auto text-5xl text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invalid Invite</h2>
        <p className="text-sm text-dark-400">{error}</p>
      </div>
    </div>
  );

  const { group, tournament, stage, expiresAt } = details;
  const spotsLeft = group.teamsLimit - group.filledSlots;
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">

        {/* Tournament Banner */}
        {tournament?.banner && (
          <div className="relative rounded-2xl overflow-hidden h-36 border border-surface-border">
            <img src={tournament.banner} alt={tournament.title} className="w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-950 to-transparent" />
            <div className="absolute bottom-4 left-5">
              <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">{tournament.game}</p>
              <h1 className="text-xl font-black text-white">{tournament.title}</h1>
            </div>
          </div>
        )}

        {/* Invite Card */}
        <div className="bg-dark-900 border border-orange-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/10">

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500/20 to-pink-600/10 px-6 py-5 border-b border-orange-500/20 flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500/20 border border-orange-500/30">
              <HiOutlineLockClosed className="text-2xl text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-0.5">Last Chance Qualifier · Invite Only</p>
              <h2 className="text-lg font-black text-white">{group.name}</h2>
              {stage && <p className="text-xs text-dark-400 mt-0.5">{stage.name}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-surface-border border-b border-surface-border">
            <div className="py-4 px-6 text-center">
              <p className="text-xs text-dark-400 uppercase tracking-widest mb-1">Capacity</p>
              <p className="text-2xl font-black text-white">{group.teamsLimit}</p>
              <p className="text-[10px] text-dark-500">Total Slots</p>
            </div>
            <div className="py-4 px-6 text-center">
              <p className="text-xs text-dark-400 uppercase tracking-widest mb-1">Filled</p>
              <p className="text-2xl font-black text-orange-400">{group.filledSlots}</p>
              <p className="text-[10px] text-dark-500">Teams Joined</p>
            </div>
            <div className="py-4 px-6 text-center">
              <p className="text-xs text-dark-400 uppercase tracking-widest mb-1">Open</p>
              <p className={`text-2xl font-black ${spotsLeft > 0 ? 'text-green-400' : 'text-red-400'}`}>{spotsLeft}</p>
              <p className="text-[10px] text-dark-500">Slots Left</p>
            </div>
          </div>

          {/* Invite Expiry */}
          <div className="px-6 py-3 bg-dark-950 border-b border-surface-border flex items-center justify-between">
            <span className="text-xs text-dark-400">Link expires on</span>
            <span className="text-xs font-bold text-white">{expiryDate}</span>
          </div>

          {/* CTA */}
          <div className="p-6">
            {joined ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <HiOutlineCheck className="text-3xl text-green-400" />
                </div>
                <p className="text-white font-bold text-lg">You're In!</p>
                <p className="text-sm text-dark-400 text-center">Your team has been added to {group.name}. Good luck!</p>
              </div>
            ) : spotsLeft === 0 ? (
              <div className="text-center py-4">
                <p className="text-red-400 font-bold">This group is full.</p>
                <p className="text-sm text-dark-400 mt-1">All slots have been claimed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {!user && (
                  <div className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2.5 text-center font-medium">
                    You need to be logged in as a team captain to join.
                  </div>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining || !user}
                  className="w-full py-3.5 rounded-xl font-black text-base text-white bg-gradient-to-r from-orange-500 to-pink-600 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                >
                  <HiOutlineUserGroup className="text-xl" />
                  {joining ? 'Joining...' : 'Join as My Team'}
                </button>
                <p className="text-[10px] text-dark-500 text-center">
                  This will add your team to {group.name}. Only one slot per team.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LCQJoinPage;

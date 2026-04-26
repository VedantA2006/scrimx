import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { HiCheckCircle, HiExclamation, HiClock, HiArrowLeft } from 'react-icons/hi';

const PrivateJoinLinkPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState('loading'); // loading | valid | used | expired | full | unauthorized | error | success
  const [data, setData] = useState(null);
  const [consuming, setConsuming] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setState('login_required');
      return;
    }
    validateToken();
  }, [token, isAuthenticated]);

  const validateToken = async () => {
    setState('loading');
    try {
      const res = await api.get(`/join-requests/invite/${token}/validate`);
      if (res.valid) {
        setState('valid');
        setData(res.joinRequest);
      } else {
        setState(res.reason || 'error');
      }
    } catch (err) {
      const reason = err.reason || 'error';
      setState(reason);
    }
  };

  const handleConfirm = async () => {
    setConsuming(true);
    try {
      const res = await api.post(`/join-requests/invite/${token}/consume`);
      setResult(res);
      setState('success');
    } catch (err) {
      setState('error');
    } finally {
      setConsuming(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Loading */}
        {state === 'loading' && (
          <div className="card text-center py-16 animate-fade-in">
            <div className="w-16 h-16 border-4 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto mb-4" />
            <p className="text-dark-300">Validating invite link...</p>
          </div>
        )}

        {/* Login required */}
        {state === 'login_required' && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <HiExclamation className="text-3xl text-yellow-400" />
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">Login Required</h2>
            <p className="text-dark-400 text-sm mb-6">You need to be logged in to use this invite link</p>
            <Link to={`/login?redirect=/join/${token}`} className="btn-neon w-full">
              Login to Continue
            </Link>
          </div>
        )}

        {/* Valid - show scrim info + confirm */}
        {state === 'valid' && data && (
          <div className="space-y-4 animate-fade-in">
            {/* Scrim card */}
            <div className="card overflow-hidden">
              {data.scrim?.banner && (
                <div className="-mx-6 -mt-6 mb-4 h-32 bg-cover bg-center" style={{ backgroundImage: `url(${data.scrim.banner})` }}>
                  <div className="w-full h-full bg-gradient-to-b from-transparent to-surface-light" />
                </div>
              )}
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-white mb-1">{data.scrim?.title}</h2>
                <div className="flex items-center justify-center gap-3 text-xs text-dark-400 mb-4">
                  <span className="capitalize">{data.scrim?.format} • {data.scrim?.mode?.toUpperCase()}</span>
                  <span>•</span>
                  <span>{data.scrim?.date ? new Date(data.scrim.date).toLocaleDateString() : ''} @ {data.scrim?.startTime}</span>
                </div>
                <div className="flex items-center justify-center gap-4 py-3 border-t border-b border-surface-border">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">{data.scrim?.filledSlots || 0}/{data.scrim?.slotCount || 0}</p>
                    <p className="text-[10px] text-dark-400">Slots Filled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team info */}
            <div className="card">
              <h3 className="text-sm font-semibold text-dark-300 mb-3">Your Team</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white">
                  {data.team?.name?.[0]?.toUpperCase() || 'T'}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{data.team?.name}</p>
                  {data.team?.tag && <p className="text-xs text-dark-400">[{data.team.tag}]</p>}
                </div>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={consuming}
              className="btn-neon w-full text-base py-3.5 font-bold"
            >
              {consuming ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                  Confirming...
                </span>
              ) : (
                '✅ Confirm My Slot'
              )}
            </button>

            <p className="text-[10px] text-dark-500 text-center">
              By confirming, your team will be registered for this scrim
            </p>
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <HiCheckCircle className="text-5xl text-green-400" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">Slot Confirmed!</h2>
            {result?.slotNumber && (
              <div className="inline-block bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-6 py-2 mb-4">
                <span className="text-lg font-bold">Slot #{result.slotNumber}</span>
              </div>
            )}
            <p className="text-dark-400 text-sm mb-6">Your team is now registered for this scrim</p>
            <div className="flex gap-3">
              <Link to="/dashboard/requests" className="btn-ghost flex-1 text-sm">My Requests</Link>
              <Link to="/marketplace" className="btn-primary flex-1 text-sm">Browse Scrims</Link>
            </div>
          </div>
        )}

        {/* Error states */}
        {['used', 'expired', 'full', 'unauthorized', 'error', 'converted'].includes(state) && (
          <div className="card text-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              {state === 'expired' ? <HiClock className="text-3xl text-red-400" /> : <HiExclamation className="text-3xl text-red-400" />}
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              {state === 'used' && 'Link Already Used'}
              {state === 'expired' && 'Link Expired'}
              {state === 'full' && 'Scrim Full'}
              {state === 'unauthorized' && 'Not Authorized'}
              {state === 'converted' && 'Already Confirmed'}
              {state === 'error' && 'Something Went Wrong'}
            </h2>
            <p className="text-dark-400 text-sm mb-6">
              {state === 'used' && 'This invite link has already been used to register.'}
              {state === 'expired' && 'This invite link has expired. Contact the organizer for a new one.'}
              {state === 'full' && 'All slots have been filled for this scrim.'}
              {state === 'unauthorized' && 'This invite link is not meant for your account.'}
              {state === 'converted' && 'This slot has already been confirmed.'}
              {state === 'error' && 'Invalid or expired invite link. Please contact the organizer.'}
            </p>
            <div className="flex gap-3">
              <Link to="/dashboard/inbox" className="btn-ghost flex-1 text-sm">
                <HiArrowLeft className="inline mr-1" /> Contact Organizer
              </Link>
              <Link to="/marketplace" className="btn-primary flex-1 text-sm">Browse Scrims</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivateJoinLinkPage;

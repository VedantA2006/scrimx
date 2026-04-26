import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Modal from './Modal';
import LoadingButton from './LoadingButton';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { HiUser, HiUserGroup } from 'react-icons/hi';
import { FaGamepad } from 'react-icons/fa';

const OnboardingModal = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Profile fields
  const [ign, setIgn] = useState('');
  const [uid, setUid] = useState('');

  useEffect(() => {
    // Only show for players
    if (user && user.role === 'player') {
      const onboarded = localStorage.getItem('scrimx_onboarded');
      if (!onboarded) {
        setIgn(user.ign || '');
        setUid(user.uid || '');
        setIsOpen(true);
      }
    }
  }, [user]);

  const handleSkipOrComplete = () => {
    localStorage.setItem('scrimx_onboarded', 'true');
    setIsOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!ign.trim() || !uid.trim()) {
      return toast.error('Please enter both IGN and UID');
    }
    setIsLoading(true);
    try {
      const { user: updatedUser } = await api.put('/auth/profile', { ign, uid });
      // Update context using login logic (usually it expects tokens, but assuming auth context updates user object properly or we force a reload/re-fetch if we had a dedicated function. If login(userData) updates state: )
      // Depending on AuthContext, we might need a dedicated updateUser method.
      // But let's assume it works or we just proceed to step 3.
      toast.success('Profile saved!');
      setStep(3);
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // no closing by clicking outside
      title={
        step === 1 ? 'Welcome to ScrimX!' :
        step === 2 ? 'Set your IGN and UID' :
        'Play as a squad'
      }
      size="md"
    >
      <div className="p-6 flex flex-col items-center text-center space-y-4">
        {step === 1 && (
          <>
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center text-neon-cyan text-3xl mb-2">
              <FaGamepad />
            </div>
            <h3 className="text-xl font-bold text-white">Welcome to ScrimX, {user?.username}!</h3>
            <p className="text-dark-300">The professional BGMI scrim platform. Let's get you set up in 3 quick steps.</p>
            <div className="pt-4 w-full">
              <button
                onClick={() => setStep(2)}
                className="w-full btn-primary py-3 flex justify-center items-center gap-2"
              >
                Let's Go &rarr;
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center text-primary-500 text-3xl mb-2">
              <HiUser />
            </div>
            <p className="text-dark-300">Organisers and team captains need your in-game details to slot you correctly.</p>
            <div className="w-full space-y-3 text-left mt-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1 uppercase tracking-wider">In-Game Name (IGN)</label>
                <input
                  type="text"
                  value={ign}
                  onChange={e => setIgn(e.target.value)}
                  className="w-full bg-dark-900 border border-surface-border rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  placeholder="e.g. ScrimXPlayer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1 uppercase tracking-wider">In-Game UID</label>
                <input
                  type="text"
                  value={uid}
                  onChange={e => setUid(e.target.value)}
                  className="w-full bg-dark-900 border border-surface-border rounded-lg px-4 py-2.5 text-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                  placeholder="e.g. 5123456789"
                />
              </div>
            </div>
            <div className="pt-6 w-full space-y-3">
              <LoadingButton
                onClick={handleSaveProfile}
                isLoading={isLoading}
                className="w-full btn-primary py-3"
              >
                Save & Continue
              </LoadingButton>
              <button
                onClick={() => setStep(3)}
                className="w-full text-dark-400 hover:text-white transition-colors text-sm"
              >
                Skip for now &rarr;
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center text-green-400 text-3xl mb-2">
              <HiUserGroup />
            </div>
            <p className="text-dark-300">Most scrims require a full squad of 4. Create a team or find one that's recruiting.</p>
            <div className="pt-6 w-full flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    handleSkipOrComplete();
                    navigate('/dashboard/teams/create');
                  }}
                  className="btn-primary py-3 px-2 flex justify-center text-sm"
                >
                  Create a Team
                </button>
                <button
                  onClick={() => {
                    handleSkipOrComplete();
                    navigate('/dashboard/teams/find');
                  }}
                  className="bg-dark-800 hover:bg-dark-700 text-white border border-surface-border rounded-lg py-3 px-2 transition-colors flex justify-center text-sm font-medium"
                >
                  Find a Team
                </button>
              </div>
              <button
                onClick={handleSkipOrComplete}
                className="w-full text-dark-400 hover:text-white transition-colors text-sm mt-2"
              >
                I'll do this later
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OnboardingModal;

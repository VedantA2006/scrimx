import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ScrimCard from '../components/ui/ScrimCard';
import Badge from '../components/ui/Badge';
import Loader, { PageLoader, SkeletonCard } from '../components/ui/Loader';
import EmptyState from '../components/ui/EmptyState';
import { HiCheckCircle, HiCalendar, HiUsers, HiStar, HiLink, HiChatAlt2, HiPlay } from 'react-icons/hi';
import { FaDiscord, FaTelegram, FaInstagram, FaYoutube } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const OrganizerStorefront = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState(null);
  const [scrims, setScrims] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('scrims');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrimsLoading, setScrimsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrganizer = async () => {
      try {
        const data = await api.get(`/organizers/${slug}`);
        setOrganizer(data.organizer);
        fetchScrims(data.organizer._id);
        fetchReviews(data.organizer._id);
      } catch (err) {
        setError(err.message || 'Organizer not found');
        setLoading(false);
      }
    };

    const fetchScrims = async (orgId) => {
      try {
        const data = await api.get('/scrims', { params: { organizer: orgId, limit: 12 } });
        setScrims(data.scrims);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setScrimsLoading(false);
      }
    };

    const fetchReviews = async (orgId) => {
      try {
        const data = await api.get(`/reviews/organizer/${orgId}`);
        setReviews(data.reviews);
      } catch (err) {
        console.error('Failed to fetch reviews', err);
      }
    };

    fetchOrganizer();
  }, [slug]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return toast.error('Review comment cannot be empty');
    if (!user) return toast.error('You must be logged in to leave a review');
    try {
      setSubmittingReview(true);
      const res = await api.post(`/reviews/${organizer._id}`, { rating: newRating, comment: newComment });
      toast.success('Review submitted!');
      setReviews([res.review, ...reviews]);
      setNewComment('');
      setNewRating(5);
      
      // Update local organizer state to reflect new rating blindly (or fetchOrganizer)
      setOrganizer({
         ...organizer,
         organizerProfile: {
             ...organizer.organizerProfile,
             ratingCount: organizer.organizerProfile.ratingCount + 1,
             rating: ((organizer.organizerProfile.rating * organizer.organizerProfile.ratingCount) + newRating) / (organizer.organizerProfile.ratingCount + 1)
         }
      });
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <><Navbar /><PageLoader /></>;

  if (error || !organizer) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Organizer Not Found</h1>
          <p className="text-dark-400 mb-4">{error}</p>
          <Link to="/marketplace" className="btn-primary text-sm">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const profile = organizer.organizerProfile;
  const accentColor = profile.brandAccent || '#00f0ff';

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 mt-16 group">
        {profile.banner ? (
          <img src={profile.banner} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-dark-900 overflow-hidden relative">
            <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)` }} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-24 relative z-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Profile */}
          <div className="lg:col-span-1">
            <div className="card text-center relative border-t-4" style={{ borderColor: accentColor }}>
              {/* Logo */}
              <div
                className="w-32 h-32 mx-auto rounded-3xl -mt-16 mb-4 border-4 border-dark-950 bg-dark-800 flex items-center justify-center overflow-hidden shadow-2xl relative"
              >
                {profile.logo ? (
                  <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">{organizer.username?.[0]?.toUpperCase()}</span>
                )}
                {profile.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-dark-950 rounded-full p-1">
                    <HiCheckCircle className="text-2xl text-neon-cyan" />
                  </div>
                )}
              </div>

              {/* Name & verification */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-xl font-display font-bold text-white">{profile.displayName || organizer.username}</h1>
                {profile.isVerified && <Badge variant="neon" size="sm">Verified</Badge>}
              </div>
              <p className="text-sm text-dark-400 mb-6">@{profile.slug}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-y border-surface-border">
                <div className="text-center">
                  <p className="text-xs text-dark-500 mb-1">Ongoing</p>
                  <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                    <HiPlay className="text-neon-cyan" /> {profile.ongoingScrims || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-dark-500 mb-1">Completed</p>
                  <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                    <HiCheckCircle className="text-green-500" /> {profile.completedScrims || 0}
                  </p>
                </div>
                <div className="text-center border-t border-surface-border pt-3 mt-1">
                  <p className="text-xs text-dark-500 mb-1">Total</p>
                  <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                    <HiCalendar className="text-primary-400" /> {profile.totalScrimsHosted || 0}
                  </p>
                </div>
                <div className="text-center border-t border-surface-border pt-3 mt-1">
                  <p className="text-xs text-dark-500 mb-1">Rating</p>
                  <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                    <HiStar className="text-yellow-500" /> {profile.rating > 0 ? profile.rating.toFixed(1) : 'New'}
                  </p>
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-dark-300 leading-relaxed mb-6">
                {profile.bio || "This organizer hasn't added a bio yet."}
              </p>

              {/* Socials */}
              <div className="flex justify-center gap-3">
                {profile.discord && (
                  <a href={profile.discord} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors">
                    <FaDiscord size={18} />
                  </a>
                )}
                {profile.telegram && (
                  <a href={profile.telegram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:text-[#0088cc] hover:bg-[#0088cc]/10 transition-colors">
                    <FaTelegram size={18} />
                  </a>
                )}
                {profile.instagram && (
                  <a href={profile.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors">
                    <FaInstagram size={18} />
                  </a>
                )}
                {profile.youtube && (
                  <a href={profile.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:text-[#FF0000] hover:bg-[#FF0000]/10 transition-colors">
                    <FaYoutube size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Main Content (Tabs) */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-6 border-b border-surface-border mb-6">
              <button
                onClick={() => setActiveTab('scrims')}
                className={`py-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'scrims' ? 'border-neon-cyan text-white' : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                <HiPlay size={20} /> Active Scrims
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-3 font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'reviews' ? 'border-neon-cyan text-white' : 'border-transparent text-dark-400 hover:text-white'
                }`}
              >
                <HiChatAlt2 size={20} /> Reviews
                <span className="bg-dark-800 text-xs px-2 py-0.5 rounded-full">{profile.ratingCount || 0}</span>
              </button>
            </div>

            {activeTab === 'scrims' ? (
              <>

            {scrimsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : scrims.length === 0 ? (
              <EmptyState
                icon={<HiCalendar className="text-3xl text-dark-500" />}
                title="No active scrims"
                description={`${profile.displayName || organizer.username} doesn't have any active public scrims right now.`}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {scrims.map(scrim => (
                  <ScrimCard key={scrim._id} scrim={scrim} />
                ))}
              </div>
            )}
              </>
            ) : (
              <div className="space-y-6">
                {/* Add Review Box */}
                {user && user._id !== organizer._id && (
                  <div className="card border-neon-cyan/20 p-5">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                      <HiStar className="text-yellow-500" /> Write a Review
                    </h3>
                    <form onSubmit={handleReviewSubmit}>
                      <div className="mb-4">
                        <label className="text-sm text-dark-400 mb-2 block">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              className="text-2xl transition-colors"
                            >
                              <HiStar className={star <= newRating ? 'text-yellow-500' : 'text-dark-700'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4">
                        <textarea
                          placeholder="Share your experience playing in this organizer's scrims..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="input-field min-h-[100px] resize-y"
                          maxLength={500}
                        />
                      </div>
                      <div className="flex justify-end">
                        <button 
                          type="submit" 
                          disabled={submittingReview} 
                          className="btn-primary"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Review List */}
                {reviews.length === 0 ? (
                  <EmptyState 
                    icon={<HiChatAlt2 className="text-3xl text-dark-500" />}
                    title="No reviews yet"
                    description="Be the first to share your experience with this organizer."
                  />
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review._id} className="card p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-dark-800 border border-surface-border overflow-hidden">
                              {review.player?.avatar ? (
                                <img src={review.player.avatar} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary-500/20 text-primary-400 font-bold">
                                  {review.player?.username?.[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-bold">{review.player?.username}</p>
                              {review.player?.ign && <p className="text-xs text-dark-400">IGN: {review.player.ign}</p>}
                            </div>
                          </div>
                          <div className="flex text-yellow-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <HiStar key={star} className={star <= review.rating ? 'opacity-100' : 'text-dark-700'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-dark-300 text-sm">{review.comment}</p>
                        <p className="text-xs text-dark-500 mt-3">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OrganizerStorefront;

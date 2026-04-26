import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Badge from './Badge';
import { HiCalendar, HiClock, HiUsers, HiCurrencyDollar, HiStar, HiCheckCircle, HiFire, HiShare } from 'react-icons/hi';

const statusConfig = {
  draft: { label: 'Draft', variant: 'default' },
  published: { label: 'Published', variant: 'info' },
  registrations_open: { label: 'Open', variant: 'success' },
  full: { label: 'Registrations Completed', variant: 'warning' },
  locked: { label: 'Locked', variant: 'orange' },
  live: { label: 'LIVE', variant: 'danger' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

const formatMap = { solo: 'Solo', duo: 'Duo', squad: 'Squad', tdm: 'TDM' };
const modeMap = { tpp: 'TPP', fpp: 'FPP' };

const ScrimCard = ({ scrim, registration, result, isOrganizerView, onPublish, onDelete, onReleaseIdp, onHighlight, onPromote }) => {
  const navigate = useNavigate();
  const status = statusConfig[scrim.status] || statusConfig.draft;
  let dynamicStatusLabel = status.label;
  let dynamicStatusVariant = status.variant;

  if (['published', 'registrations_open', 'full', 'locked'].includes(scrim.status)) {
    try {
      const scrimDate = new Date(scrim.date);
      const [hours, minutes] = (scrim.startTime || '00:00').split(':').map(Number);
      scrimDate.setHours(hours, minutes, 0, 0);
      const numMatches = scrim.numberOfMatches || 1;
      const durationMs = numMatches * 45 * 60 * 1000; // 45 minutes per match
      const endTime = new Date(scrimDate.getTime() + durationMs);

      const now = new Date();
      if (now > endTime) {
        dynamicStatusLabel = 'Awaiting Results';
        dynamicStatusVariant = 'warning';
      } else if (now >= scrimDate && now <= endTime) {
        dynamicStatusLabel = 'LIVE';
        dynamicStatusVariant = 'danger';
      }
    } catch (e) {}
  }

  const organizerName = scrim.organizer?.organizerProfile?.displayName || scrim.organizer?.username || 'Unknown';
  const isVerified = scrim.organizer?.organizerProfile?.isVerified;
  const isElite = scrim.isElite || scrim.organizer?.organizerProfile?.plan === 'elite';
  const slotsRemaining = scrim.slotCount - scrim.filledSlots;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/scrims/${scrim._id}`;
    navigator.clipboard.writeText(url);
    toast.success('Scrim link copied!');
  };

  const getBorderColor = () => {
    if (scrim.status === 'registrations_open') return 'border-l-green-500';
    if (scrim.status === 'full' || scrim.status === 'locked') return 'border-l-orange-500';
    if (scrim.status === 'live') return 'border-l-red-500';
    if (scrim.status === 'completed') return 'border-l-dark-600';
    return 'border-l-dark-700';
  };

  return (
    <Link to={isOrganizerView ? `/organizer/scrims/${scrim._id}` : `/scrims/${scrim._id}`} className="block group">
      <div 
        className={`card-hover overflow-hidden h-full flex flex-col transition-all duration-300 border-l-[4px] ${getBorderColor()} ${
          isElite 
            ? 'bg-gradient-to-b from-dark-900 to-dark-950 ring-2 ring-neon-cyan/60 shadow-[0_0_20px_rgba(45,212,191,0.15)] hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] hover:ring-neon-cyan relative' 
            : 'bg-dark-900 ring-1 ring-surface-border hover:ring-neon-cyan/40'
        }`}
      >
        {isElite && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-cyan via-primary-500 to-neon-purple z-20"></div>
        )}
        {/* Banner */}
        <div className="relative h-40 bg-gradient-to-br from-primary-900/50 to-dark-800 overflow-hidden">
          {scrim.banner ? (
            <img src={scrim.banner} alt={scrim.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-800/30 via-dark-800 to-neon-purple/20 flex items-center justify-center">
              <span className="text-4xl opacity-20">🎮</span>
            </div>
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant={dynamicStatusVariant} size="sm" dot>{dynamicStatusLabel}</Badge>
            {scrim.isFeatured && <Badge variant="neon" size="sm"><HiStar className="mr-1" />Featured</Badge>}
          </div>

          {/* Top Right: Prize Pool & Share */}
          <div className="absolute top-3 right-3 flex gap-2">
             {scrim.prizePool > 0 && (
               <div className="px-2.5 py-1 rounded-lg bg-dark-950/60 backdrop-blur-sm border border-neon-cyan/20 pointer-events-none">
                 <span className="text-sm font-bold text-neon-cyan">₹{scrim.prizePool.toLocaleString()}</span>
               </div>
             )}
             <button onClick={handleShare} className="p-1.5 rounded-lg bg-dark-950/60 backdrop-blur-sm border border-surface-border text-white hover:text-neon-cyan transition-colors" title="Share Scrim">
               <HiShare />
             </button>
          </div>

          {/* Format badges */}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/10 text-white backdrop-blur-sm uppercase">
              {formatMap[scrim.format] || scrim.format}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-white/10 text-white backdrop-blur-sm uppercase">
              {modeMap[scrim.mode] || scrim.mode}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base font-bold text-white mb-1 line-clamp-1 group-hover:text-neon-cyan transition-colors">
            {scrim.title}
          </h3>

          {/* Organizer */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-dark-500">by</span>
            <span className={`text-xs font-bold ${isElite ? 'text-neon-cyan filter drop-shadow-[0_0_2px_rgba(45,212,191,0.5)]' : 'text-dark-500'}`}>{organizerName}</span>
            {isVerified && <HiCheckCircle className="text-neon-cyan text-sm" />}
            {isElite && (
              <span className="ml-1 bg-gradient-to-r from-neon-cyan to-primary-600 text-dark-950 font-black px-2 py-0.5 rounded text-[9px] tracking-wider uppercase shadow-lg shadow-neon-cyan/30 flex items-center gap-1">
                <HiFire className="text-[10px]" /> PRO
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 text-sm text-dark-300">
              <HiCalendar className="text-dark-500" />
              <span>{formatDate(scrim.date)}</span>
              <span className="text-dark-600">•</span>
              <HiClock className="text-dark-500" />
              <span>{scrim.startTime}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-dark-400">
              <HiUsers className="text-dark-500" />
              <span>{scrim.filledSlots}/{scrim.slotCount} slots</span>
              {slotsRemaining <= 5 && slotsRemaining > 0 && (
                <span className="text-orange-400 flex items-center gap-0.5">
                  <HiFire className="text-[10px]" /> {slotsRemaining} left
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-border">
            <div className="flex items-center gap-1">
              <HiCurrencyDollar className="text-dark-500" />
              <span className={`text-sm font-bold ${scrim.entryFee > 0 ? 'text-green-400' : 'text-dark-400'}`}>
                {scrim.entryFee > 0 ? `₹${scrim.entryFee}` : 'Free'}
              </span>
              {scrim.entryFee > 0 && <span className="text-[10px] text-dark-500">entry</span>}
            </div>
            {scrim.numberOfMatches > 1 && (
              <span className="text-[10px] text-dark-400 bg-dark-800 px-2 py-0.5 rounded-full">
                {scrim.numberOfMatches} matches
              </span>
            )}
          </div>

          {isOrganizerView && (
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-surface-border/50">
              {scrim.status === 'draft' && (
                <button onClick={(e) => { e.preventDefault(); onPublish && onPublish(scrim._id); }} className="flex-1 bg-neon-cyan text-dark-950 font-bold text-xs py-1.5 rounded hover:bg-[#60E0E0] transition-colors">Publish</button>
              )}
              {['published', 'registrations_open', 'full'].includes(scrim.status) && !scrim.isTrending && (
                <button onClick={(e) => { e.preventDefault(); onHighlight && onHighlight(scrim._id); }} className="flex-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold text-[10px] md:text-xs py-1.5 rounded hover:bg-yellow-500 hover:text-white transition-colors">Highlight</button>
              )}
              {['published', 'registrations_open', 'full'].includes(scrim.status) && !scrim.isFeatured && (
                <button onClick={(e) => { e.preventDefault(); onPromote && onPromote(scrim._id); }} className="flex-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold text-[10px] md:text-xs py-1.5 rounded hover:bg-orange-500 hover:text-white transition-colors">Promote</button>
              )}
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/organizer/scrims/${scrim._id}/edit`); }} 
                className="flex-1 bg-dark-800 text-white border border-surface-border font-bold text-[10px] md:text-xs py-1.5 rounded hover:bg-dark-700 transition-colors"
              >
                Edit
              </button>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete && onDelete(scrim._id); }} 
                className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold text-[10px] md:text-xs py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"
              >
                Delete
              </button>
            </div>
          )}

          {/* Registration Status Strip */}
          {registration && (
            (() => {
              const isPending = registration.paymentStatus === 'pending_verification' || registration.status === 'pending';
              const isApproved = registration.status === 'approved';
              const isRejected = registration.status === 'rejected';
              if (!isPending && !isApproved && !isRejected) return null;
              const stripClass = isPending
                ? 'bg-amber-500/10 border-t border-amber-500/20'
                : isApproved
                ? 'bg-green-500/10 border-t border-green-500/20'
                : 'bg-red-500/10 border-t border-red-500/20';
              const textClass = isPending ? 'text-amber-400' : isApproved ? 'text-green-400' : 'text-red-400';
              return (
                <div className={`mt-3 -mx-4 -mb-4 px-4 flex items-center justify-between h-9 ${stripClass}`}>
                  <span className={`text-xs font-bold flex items-center gap-1 ${textClass}`}>
                    {isPending && '⏳ Awaiting organiser approval'}
                    {isApproved && `✅ Confirmed${registration.slotNumber ? ` · Slot #${registration.slotNumber}` : ''}`}
                    {isRejected && '❌ Slot request rejected'}
                  </span>
                </div>
              );
            })()
          )}

          {/* Result Strip */}
          {result && (
            <div className="mt-3 -mx-4 -mb-4 px-4 flex items-center justify-between h-9 bg-dark-900 border-t border-surface-border">
              <span className="text-xs font-bold text-dark-300 flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  result.place === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                  result.place <= 3 ? 'bg-green-500/20 text-green-400' :
                  'bg-dark-800 text-dark-400'
                }`}>#{result.place}</span>
                <span className="text-neon-cyan">{result.totalPoints} pts</span>
                <span className="text-red-400">{result.totalKills} kills</span>
              </span>
              {result.prizeWon > 0 && <span className="text-xs font-bold text-green-400">+₹{result.prizeWon}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ScrimCard;

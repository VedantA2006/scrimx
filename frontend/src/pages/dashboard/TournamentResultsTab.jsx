import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineCurrencyRupee, HiOutlinePlus, HiOutlineTrash,
  HiOutlineSave, HiOutlineRefresh, HiOutlineStar,
  HiOutlineLightningBolt, HiOutlineCheckCircle, HiOutlineExclamation,
  HiOutlineX, HiOutlineUserGroup, HiOutlineGlobe, HiOutlineChatAlt2,
  HiPaperAirplane,
} from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const POSITION_LABELS = ['Champion', 'Runner-up', '3rd Place', '4th Place', '5th Place', '6th Place', '7th Place', '8th Place'];
const defaultPositions = [
  { position: 1, percentage: 50, label: 'Champion' },
  { position: 2, percentage: 30, label: 'Runner-up' },
  { position: 3, percentage: 15, label: '3rd Place' },
];
const medals = ['🥇', '🥈', '🥉'];

// ─── Redirect to Chat ────────────────────────────────────────────────────────
const RedirectToChat = ({ captainId }) => {
  const navigate = useNavigate();
  const fetchedRef = useRef(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    const openConv = async () => {
      setLoading(true);
      try {
        const res = await api.post('/chat/conversations/direct', { userId: captainId });
        const c = res.conversation;
        // Navigate to inbox with query param
        navigate(`/organizer/inbox?conv=${c._id}`);
      } catch (err) {
        const msg = err.response?.data?.message || 'Could not open chat.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    
    openConv();
  }, [captainId, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
      <span className="ml-3 text-sm text-dark-400">Opening chat in Inbox...</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
      <p className="text-red-400 text-sm">{error}</p>
      <button
        onClick={() => { fetchedRef.current = false; setError(null); }}
        className="text-xs font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-4 py-2 rounded-lg hover:bg-neon-cyan/20 transition-all"
      >
        Retry
      </button>
    </div>
  );

  return null;
};

// ─── Team Detail Modal ────────────────────────────────────────────────────────
const TeamModal = ({ team, onClose }) => {
  const [tab, setTab] = useState('details');
  if (!team) return null;

  // captain user ID — could be populated object or raw ID
  const captainId = team.captain?._id || team.captain;
  const captainName = team.captain?.username || team.members?.find(m => m.role === 'captain')?.ign || 'Captain';


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-yellow-500/20 to-orange-600/10 border-b border-surface-border px-5 pt-4 pb-4">
          <button onClick={onClose} className="absolute top-3 right-3 text-dark-400 hover:text-white transition-colors">
            <HiOutlineX className="text-xl" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src={team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&size=48&background=1a1d24&color=facc15&bold=true`}
              alt={team.name}
              className="w-12 h-12 rounded-xl object-cover border-2 border-yellow-500/40 bg-dark-800 shrink-0"
            />
            <div>
              <h3 className="text-lg font-black text-white">{team.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {team.tag && <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">{team.tag}</span>}
                {captainId && <span className="text-[10px] text-dark-400">Captain: <span className="text-white">{captainName}</span></span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-surface-border border-b border-surface-border">
          {[
            { label: 'Members', val: team.members?.length || 0 },
            { label: 'Wins', val: team.wins || 0 },
            { label: 'Points', val: team.totalPoints || 0 },
          ].map(s => (
            <div key={s.label} className="py-2.5 px-4 text-center">
              <p className="text-base font-black text-white">{s.val}</p>
              <p className="text-[10px] text-dark-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border bg-dark-950">
          {[
            { id: 'details', label: 'Team Details', icon: HiOutlineUserGroup },
            { id: 'chat', label: 'Chat with Captain', icon: HiOutlineChatAlt2, disabled: !captainId },
          ].map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              disabled={disabled}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                tab === id ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Icon /> {label}
            </button>
          ))}
        </div>

        {/* Details Tab */}
        {tab === 'details' && (
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            <p className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <HiOutlineUserGroup /> Roster
            </p>
            {(team.members || []).length === 0 && (
              <p className="text-dark-500 text-sm italic text-center py-6">No member info available</p>
            )}
            {(team.members || []).map((m, i) => (
              <div key={i} className="flex items-center gap-3 bg-dark-800 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-dark-700 border border-surface-border flex items-center justify-center text-xs font-bold text-dark-300 shrink-0">
                  {(m.ign || m.user?.username || '?')[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{m.ign || m.user?.username || 'Unknown'}</p>
                  {m.uid && <p className="text-[10px] text-dark-500">UID: {m.uid}</p>}
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  m.role === 'captain'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-dark-700 text-dark-400 border-dark-600'
                }`}>{m.role || 'player'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && captainId && (
          <RedirectToChat captainId={captainId} />
        )}

      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TournamentResultsTab = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');

  const [totalPrizePool, setTotalPrizePool] = useState(0);
  const [positionDeltas, setPositionDeltas] = useState(defaultPositions);
  const [bonusRewards, setBonusRewards] = useState({ mvpPercent: 0, topFraggerPercent: 0, perKillAmount: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [resultStatus, setResultStatus] = useState(null); // 'provisional'|'final'|null
  const [loading, setLoading] = useState(true);

  const [groupName, setGroupName] = useState('');
  const [groupTeams, setGroupTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => { fetchAll(); }, [id, groupId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prizeRes, slotsRes] = await Promise.all([
        api.get(`/tournaments/${id}/prize-config`),
        api.get(`/tournaments/${id}/slots`),
      ]);

      if (prizeRes.success) {
        setTotalPrizePool(prizeRes.data.tournament?.finance?.totalPrizePool || 0);
        if (prizeRes.data.config?.positionDeltas?.length) {
          setPositionDeltas(prizeRes.data.config.positionDeltas);
          setBonusRewards(prizeRes.data.config.bonusRewards || { mvpPercent: 0, topFraggerPercent: 0, perKillAmount: 0 });
        }
      }

      if (slotsRes.success && groupId) {
        const groups = slotsRes.data?.groups || [];
        const g = groups.find(g => g._id === groupId);
        if (g) setGroupName(g.name);
        const gSlots = (slotsRes.data?.slots || [])
          .filter(s => s.groupId?.toString() === groupId && s.occupyingTeam)
          .sort((a, b) => a.slotNumber - b.slotNumber);
        setGroupTeams(gSlots.map(s => s.occupyingTeam));
      }

      // Fetch existing result status
      if (groupId) {
        try {
          const rRes = await api.get(`/tournaments/${id}/groups/${groupId}/results`);
          if (rRes.success && rRes.data) setResultStatus(rRes.data.status);
          else setResultStatus(null);
        } catch { setResultStatus(null); }
      }
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  };

  const sumPositions = positionDeltas.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
  const totalPercent = sumPositions + Number(bonusRewards.mvpPercent || 0) + Number(bonusRewards.topFraggerPercent || 0);
  const remaining = 100 - totalPercent;
  const isOver = totalPercent > 100;
  const getAmount = pct => totalPrizePool ? Math.round((totalPrizePool * pct) / 100) : null;

  const addPosition = () => {
    const next = positionDeltas.length + 1;
    setPositionDeltas(p => [...p, { position: next, percentage: 0, label: POSITION_LABELS[next - 1] || `#${next} Place` }]);
  };
  const removePosition = idx => setPositionDeltas(p => p.filter((_, i) => i !== idx).map((x, i) => ({ ...x, position: i + 1 })));
  const updatePosition = (idx, field, val) => setPositionDeltas(p => p.map((x, i) => i === idx ? { ...x, [field]: val } : x));

  const handleSave = async () => {
    if (isOver) return toast.error(`Total is ${totalPercent}% — cannot exceed 100%.`);
    setSaving(true);
    try {
      await api.post(`/tournaments/${id}/prize-config`, {
        positionDeltas: positionDeltas.map(p => ({ ...p, percentage: Number(p.percentage) })),
        bonusRewards: { mvpPercent: Number(bonusRewards.mvpPercent), topFraggerPercent: Number(bonusRewards.topFraggerPercent), perKillAmount: Number(bonusRewards.perKillAmount) }
      });
      toast.success('✅ Prize distribution saved!');
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    if (!groupId) return toast.error('No group selected.');
    setPublishing(true);
    try {
      const res = await api.post(`/tournaments/${id}/results/publish`, { groupId });
      toast.success(res.message || '🏆 Results published!');
      setResultStatus('final');
      setPublished(true); setTimeout(() => setPublished(false), 4000);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to publish.'); }
    finally { setPublishing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {selectedTeam && <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />}

      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-5">
          <div>
            {groupId && groupName && (
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-1">🏆 {groupName} — Prize Pool</p>
            )}
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <HiOutlineCurrencyRupee className="text-yellow-400" /> Prize Pool Distribution
            </h2>
            <p className="text-sm text-dark-400 mt-1">Assign prize percentages per position. Click any team to see their details.</p>
          </div>
          <div className="flex items-center gap-2">
            {resultStatus && (
              <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border ${
                resultStatus === 'final'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              }`}>
                {resultStatus === 'final' ? '✅ Published' : '⏳ Provisional'}
              </span>
            )}
            <button onClick={fetchAll} className="p-2 text-dark-400 hover:text-white border border-surface-border rounded-lg transition-colors">
              <HiOutlineRefresh className="text-xl" />
            </button>
          </div>
        </div>

        <div className={`grid gap-6 ${groupId && groupTeams.length > 0 ? 'lg:grid-cols-5' : 'grid-cols-1'}`}>

          {/* LEFT — Prize Config Editor */}
          <div className={`space-y-5 ${groupId && groupTeams.length > 0 ? 'lg:col-span-3' : ''}`}>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Prize Pool', val: totalPrizePool > 0 ? `₹${totalPrizePool.toLocaleString()}` : 'Not Set', color: 'text-yellow-400', border: 'border-yellow-500/20' },
                { label: 'Allocated', val: `${totalPercent.toFixed(1)}%`, color: isOver ? 'text-red-400' : 'text-white', border: isOver ? 'border-red-500/30' : 'border-surface-border' },
                { label: 'Remaining', val: `${remaining.toFixed(1)}%`, color: remaining < 0 ? 'text-red-400' : remaining === 0 ? 'text-green-400' : 'text-neon-cyan', border: remaining === 0 ? 'border-green-500/30' : 'border-surface-border' },
              ].map(s => (
                <div key={s.label} className={`bg-dark-950 border ${s.border} rounded-xl p-3 text-center`}>
                  <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                </div>
              ))}
            </div>

            {isOver && (
              <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                <HiOutlineExclamation className="shrink-0" /> Total exceeds 100%. Reduce percentages before saving.
              </div>
            )}

            {/* Positions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineStar className="text-yellow-400" /> Position Prizes
                </h3>
                <button onClick={addPosition} className="flex items-center gap-1.5 text-xs font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1.5 rounded-lg hover:bg-neon-cyan/20 transition-all">
                  <HiOutlinePlus /> Add
                </button>
              </div>
              <div className="space-y-2">
                {positionDeltas.map((pos, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-dark-950 border border-surface-border rounded-xl px-3 py-2.5 group">
                    <div className="w-7 text-center shrink-0">{idx < 3 ? <span className="text-base">{medals[idx]}</span> : <span className="text-xs font-bold text-dark-400">#{idx + 1}</span>}</div>
                    <input type="text" value={pos.label} onChange={e => updatePosition(idx, 'label', e.target.value)}
                      className="flex-1 bg-dark-800 border border-surface-border rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-neon-cyan/40 min-w-0" />
                    <div className="flex items-center gap-1 bg-dark-800 border border-surface-border rounded-lg px-2 py-1.5 w-20 shrink-0">
                      <input type="number" min="0" max="100" step="0.5" value={pos.percentage}
                        onChange={e => updatePosition(idx, 'percentage', e.target.value)}
                        className="w-full bg-transparent text-sm text-white outline-none text-right" />
                      <span className="text-dark-500 text-xs">%</span>
                    </div>
                    {totalPrizePool > 0 && (
                      <div className="w-20 text-right shrink-0">
                        <span className={`text-xs font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-dark-400'}`}>
                          ₹{getAmount(pos.percentage)?.toLocaleString() || 0}
                        </span>
                      </div>
                    )}
                    <button onClick={() => removePosition(idx)} className="opacity-0 group-hover:opacity-100 text-dark-600 hover:text-red-400 transition-all p-1 shrink-0">
                      <HiOutlineTrash className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus Rewards */}
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                <HiOutlineLightningBolt className="text-purple-400" /> Bonus Rewards
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'mvpPercent', label: 'MVP', icon: '🏆', suffix: '%' },
                  { key: 'topFraggerPercent', label: 'Top Fragger', icon: '🎯', suffix: '%' },
                  { key: 'perKillAmount', label: 'Per Kill', icon: '💀', suffix: '₹' },
                ].map(({ key, label, icon, suffix }) => (
                  <div key={key} className="bg-dark-950 border border-surface-border rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1.5">{icon} {label}</p>
                    <div className="flex items-center gap-1 bg-dark-800 border border-surface-border rounded-lg px-2 py-1.5">
                      <input type="number" min="0" step="0.5" value={bonusRewards[key]}
                        onChange={e => setBonusRewards(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-transparent text-sm text-white outline-none" />
                      <span className="text-dark-500 text-xs shrink-0">{suffix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-dark-400 mb-1">
                <span>Distribution</span>
                <span className={isOver ? 'text-red-400 font-bold' : 'text-white'}>{totalPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : totalPercent === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-yellow-500 to-neon-cyan'}`}
                  style={{ width: `${Math.min(totalPercent, 100)}%` }} />
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex items-center gap-3 pt-2 border-t border-surface-border">
              {/* Save Results */}
              <button
                onClick={handleSave}
                disabled={saving || isOver}
                className={`flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 ${saved ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-yellow-500 hover:bg-yellow-400 text-dark-950 shadow-yellow-500/20'}`}
              >
                {saving ? <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" /> : saved ? <HiOutlineCheckCircle className="text-lg" /> : <HiOutlineSave className="text-lg" />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Results'}
              </button>

              {/* Publish Results */}
              {groupId && (
                <button
                  onClick={handlePublish}
                  disabled={publishing || resultStatus === 'final'}
                  className={`flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 ${
                    resultStatus === 'final'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-not-allowed'
                      : published
                      ? 'bg-green-500 text-white shadow-green-500/20'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-purple-500/20'
                  }`}
                >
                  {publishing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiOutlineGlobe className="text-lg" />}
                  {publishing ? 'Publishing...' : resultStatus === 'final' ? '✅ Published' : 'Publish Results'}
                </button>
              )}

              {remaining > 0 && !isOver && (
                <p className="text-xs text-yellow-400 ml-auto">{remaining.toFixed(1)}% unallocated</p>
              )}
            </div>
          </div>

          {/* RIGHT — Teams List */}
          {groupId && groupTeams.length > 0 && (
            <div className="lg:col-span-2">
              <div className="bg-dark-950 border border-yellow-500/20 rounded-2xl overflow-hidden sticky top-0">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-4 py-4 border-b border-yellow-500/20">
                  <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-0.5">🏆 Grand Finals Teams</p>
                  <h3 className="text-white font-bold">{groupName}</h3>
                  <p className="text-xs text-dark-400 mt-0.5">{groupTeams.length} teams · Click any team for details</p>
                </div>

                <div className="divide-y divide-surface-border max-h-[560px] overflow-y-auto custom-scrollbar">
                  {groupTeams.map((team, idx) => {
                    const prizePos = positionDeltas.find(p => p.position === idx + 1);
                    const prizePct = prizePos?.percentage || 0;
                    const prizeAmt = totalPrizePool && prizePct ? Math.round((totalPrizePool * prizePct) / 100) : null;

                    return (
                      <button
                        key={team._id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-dark-800/60 active:scale-[0.99] ${
                          idx === 0 ? 'bg-yellow-500/5' : idx === 1 ? 'bg-gray-500/5' : idx === 2 ? 'bg-amber-700/5' : ''
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-7 text-center shrink-0">
                          {idx < 3 ? <span className="text-base">{medals[idx]}</span> : <span className="text-xs font-bold text-dark-500">#{idx + 1}</span>}
                        </div>

                        {/* Logo */}
                        <img
                          src={team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&size=32&background=1a1d24&color=facc15&bold=true`}
                          alt={team.name}
                          className="w-8 h-8 rounded-lg object-cover border border-surface-border bg-dark-800 shrink-0"
                        />

                        {/* Name */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-sm font-bold truncate ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-white'}`}>
                            {team.name}
                          </p>
                          {prizePos && <p className="text-[10px] text-dark-500 truncate">{prizePos.label}</p>}
                        </div>

                        {/* Prize */}
                        <div className="text-right shrink-0">
                          {prizePct > 0 ? (
                            <>
                              <p className={`text-xs font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-neon-cyan'}`}>
                                {prizeAmt !== null ? `₹${prizeAmt.toLocaleString()}` : `${prizePct}%`}
                              </p>
                              <p className="text-[10px] text-dark-600">{prizePct}% of pool</p>
                            </>
                          ) : (
                            <span className="text-[10px] text-dark-600">—</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {totalPrizePool > 0 && (
                  <div className="px-4 py-3 border-t border-yellow-500/20 flex justify-between items-center bg-yellow-500/5">
                    <span className="text-xs text-dark-400 font-bold">Total Distributed</span>
                    <span className="text-sm font-black text-yellow-400">
                      ₹{Math.round((totalPrizePool * Math.min(totalPercent, 100)) / 100).toLocaleString()}
                      <span className="text-[10px] text-dark-400 font-normal ml-1">of ₹{totalPrizePool.toLocaleString()}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TournamentResultsTab;

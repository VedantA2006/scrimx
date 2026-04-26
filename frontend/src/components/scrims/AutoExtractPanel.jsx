import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { fileToBase64 } from '../../utils/imageUtils';
import { HiCloudUpload, HiRefresh, HiCheckCircle, HiExclamationCircle, HiChevronDown, HiChevronRight, HiTrash } from 'react-icons/hi';
import Badge from '../ui/Badge';
import Loader from '../ui/Loader';

const AutoExtractPanel = ({ scrim, registrations, selectedMatchIdx, setSelectedMatchIdx, onImport }) => {

    const [session, setSession] = useState(null);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [extracting, setExtracting] = useState(false);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [elapsedTime, setElapsedTime] = useState(0);
    const pollInterval = React.useRef(null);
    const timerInterval = React.useRef(null);

    useEffect(() => {
        if (selectedMatchIdx !== 'total') {
            fetchSession();
        } else {
            setSession(null);
        }
    }, [selectedMatchIdx]);


    useEffect(() => {
        if (session && session.status === 'processing') {
            pollInterval.current = setInterval(fetchSessionDataOnly, 3000);
            
            // Sync timer to backend startedAt, or fallback local tick
            if (session.startedAt) {
                const initDiff = Math.floor((new Date() - new Date(session.startedAt)) / 1000);
                setElapsedTime(initDiff > 0 ? initDiff : 0);
            }
            timerInterval.current = setInterval(() => {
                setElapsedTime(prev => {
                    if (session?.startedAt) return Math.floor((new Date() - new Date(session.startedAt)) / 1000);
                    return prev + 1;
                });
            }, 1000);
        }
        if (session && (session.status === 'failed' || session.status === 'extracted' || session.status === 'imported')) {
            clearInterval(pollInterval.current);
            clearInterval(timerInterval.current);
            if (session.startedAt && session.completedAt) {
                 const diff = Math.floor((new Date(session.completedAt) - new Date(session.startedAt)) / 1000);
                 setElapsedTime(diff > 0 ? diff : 0);
            }
        }
        return () => {
             clearInterval(pollInterval.current);
             clearInterval(timerInterval.current);
        };
    }, [session?.status, session?.startedAt, session?.completedAt]);

    const fetchSession = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/extractions/scrim/${scrim._id}/match/${selectedMatchIdx}/session?_t=${Date.now()}`);
            setSession(res.session);
            if (res.session && (res.session.status === 'extracted' || res.session.status === 'imported')) {
                await fetchResults(res.session._id);
            }
        } catch (err) {
            console.error('Extraction session fetch err:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionDataOnly = async () => {
        try {
            const res = await api.get(`/extractions/scrim/${scrim._id}/match/${selectedMatchIdx}/session?_t=${Date.now()}`);
            setSession(res.session);
            if (res.session && (res.session.status === 'extracted' || res.session.status === 'imported')) {
                clearInterval(pollInterval.current);
                await fetchResults(res.session._id);
                setExtracting(false);
                toast.success('Extraction complete!');
            } else if (res.session && res.session.status === 'failed') {
                clearInterval(pollInterval.current);
                setExtracting(false);
                toast.error('Extraction failed. See details below.');
            }
        } catch (err) { console.error('Poll error:', err); }
    }

    const fetchResults = async (sessionId) => {
        try {
            const res = await api.get(`/extractions/session/${sessionId}/results`);
            setTeams(res.teams);
            setPlayers(res.players);
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const base64 = await fileToBase64(file);
            const res = await api.post(`/extractions/session/${session._id}/upload`, { imageUrl: base64 });
            if (res.success) {
                toast.success('Screenshot attached.');
                fetchSessionDataOnly();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to upload screenshot');
        }
    };

    const handleDeleteScreenshot = async (url) => {
        try {
            setLoading(true);
            const res = await api.post(`/extractions/session/${session._id}/screenshot/remove`, { imageUrl: url });
            if (res.success) {
                toast.success('Screenshot removed');
                fetchSessionDataOnly();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to remove screenshot');
            setLoading(false);
        }
    };

    const startExtraction = async () => {
        if (!session.screenshots || session.screenshots.length === 0) {
            return toast.error('Please attach at least one screenshot.');
        }
        try {
            setExtracting(true);
            await api.post(`/extractions/session/${session._id}/extract`);
            toast.success('Extraction pipeline kicked off. This may take up to a minute...');
            fetchSessionDataOnly();
        } catch (err) {
            toast.error(err.message || 'Failed to start extraction');
            setExtracting(false);
        }
    };

    const stopExtraction = async () => {
        try {
            await api.post(`/extractions/session/${session._id}/stop`);
            setExtracting(false);
            toast.success('Extraction stopped.');
            fetchSessionDataOnly();
        } catch (err) {
            toast.error(err.message || 'Failed to stop extraction');
        }
    };

    const handleImport = async () => {
        try {
            const res = await api.post(`/extractions/session/${session._id}/import`);
            if (res.success && res.mappedData) {
                onImport(res.mappedData, teams);
                toast.success('Scores imported to Declare Results successfully!');
                fetchSessionDataOnly();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to import scores');
        }
    };

    const toggleExpand = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const renderConfidence = (conf) => {
        if (conf === 'high') return <span className="text-green-400 text-xs font-bold px-2 py-0.5 bg-green-400/10 rounded">HIGH</span>;
        if (conf === 'medium') return <span className="text-yellow-400 text-xs font-bold px-2 py-0.5 bg-yellow-400/10 rounded">MED</span>;
        if (conf === 'low') return <span className="text-red-400 text-xs font-bold px-2 py-0.5 bg-red-400/10 rounded">LOW</span>;
        return <span className="text-dark-400 text-xs">NONE</span>;
    };

    const formatTime = (seconds) => {
        if (!seconds) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (selectedMatchIdx === 'total') {
        return <div className="p-8 text-center text-dark-400">Please select an individual match to extract scores.</div>;
    }

    if (loading) return <div className="p-10 flex justify-center"><Loader /></div>;

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Match Selector */}
            <div className="w-full md:w-48 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-dark-400 uppercase tracking-wider mb-2">Matches</h3>
                {scrim.matches && scrim.matches.map((match, idx) => (
                    <button
                        key={idx}
                        onClick={() => setSelectedMatchIdx(idx)}
                        className={`p-3 rounded-lg text-left transition-colors border ${selectedMatchIdx === idx ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan font-bold' : 'bg-dark-900 border-surface-border text-dark-300 hover:bg-dark-800'}`}
                    >
                        <div className="text-sm">Match {match.matchNumber}</div>
                        <div className="text-xs opacity-70 mt-0.5">{match.map}</div>
                    </button>
                ))}
            </div>

        <div className="flex-1 bg-dark-900 border border-surface-border rounded-xl p-6">
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-surface-border">
                <div>
                   <h3 className="text-lg font-bold text-white mb-1">AI Score Extraction (Match {scrim.matches[selectedMatchIdx]?.matchNumber})</h3>
                   <p className="text-sm text-dark-400">Powered by NVIDIA Nemotron-OCR & VLM Refinement</p>
                </div>
                {session && (
                    <div className="flex items-center gap-3">
                        {(session.status === 'processing' || session.status === 'extracted' || session.status === 'imported') && (
                            <span className="font-mono text-sm font-semibold text-neon-cyan/90 bg-neon-cyan/10 px-2.5 py-1 rounded inline-flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,255,170,0.15)] border border-neon-cyan/20">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {formatTime(elapsedTime)}
                            </span>
                        )}
                        <Badge variant={session.status === 'processing' ? 'warning' : 'info'}>{session.status.toUpperCase()}</Badge>
                    </div>
                )}
            </div>

            {/* UP-LOADER */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-sm font-semibold text-white mb-3">1. Upload Result Screenshots</h4>
                    <label className="border-2 border-dashed border-dark-600 hover:border-neon-cyan/50 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-dark-950/50">
                       <HiCloudUpload className="text-3xl text-dark-400 mb-2" />
                       <span className="text-sm text-white font-medium">Click to upload</span>
                       <span className="text-xs text-dark-400 mt-1">PNG, JPG up to 5MB</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={session?.status === 'processing'} />
                    </label>
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-white mb-3">Attached Screenshots ({session?.screenshots?.length || 0})</h4>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                        {session?.screenshots?.map((url, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-surface-border group">
                                <img src={url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-dark-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                      onClick={() => handleDeleteScreenshot(url)}
                                      disabled={session?.status === 'processing' || extracting}
                                      className="p-1.5 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/40 transition-colors"
                                    >
                                        <HiTrash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(!session?.screenshots || session.screenshots.length === 0) && (
                            <span className="text-sm text-dark-500 italic mt-2">No screenshots yet.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={startExtraction} 
                  disabled={!session?.screenshots?.length || session?.status === 'processing' || extracting}
                  className="btn-primary flex items-center gap-2"
                >
                    {session?.status === 'processing' || extracting ? <><Loader size="small" /> Extracting...</> : <><HiRefresh /> Start Extraction</>}
                </button>
                {(session?.status === 'processing' || extracting) && (
                  <button
                    onClick={stopExtraction}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500/70 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><rect x="5" y="5" width="10" height="10" rx="1"/></svg>
                    Stop
                  </button>
                )}
                {session?.status === 'extracted' && (
                  <button onClick={handleImport} className="btn-secondary flex items-center gap-2 border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10">
                    <HiCheckCircle /> Import to Declare Results
                  </button>
                )}
            </div>

            {/* ERROR BANNER */}
            {session?.status === 'failed' && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1">
                        <p className="text-sm font-bold text-red-400 mb-1">⚠ Extraction Failed</p>
                        <p className="text-xs text-red-300/80">{session.lastError || 'An unexpected error occurred. Check your NVIDIA API keys and try again.'}</p>
                    </div>
                    <button
                        onClick={startExtraction}
                        disabled={!session?.screenshots?.length}
                        className="flex-shrink-0 text-xs font-semibold px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all"
                    >
                        Retry Extraction
                    </button>
                </div>
            )}

            {/* RESULTS VIEW */}
            {(session?.status === 'extracted' || session?.status === 'imported') && teams.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Extraction Preview</h4>
                    <div className="overflow-x-auto rounded-xl border border-surface-border bg-dark-950">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-dark-900 border-b border-surface-border">
                                    <th className="p-3 text-xs font-semibold text-dark-400">Placement</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">Team (OCR / Mapped)</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">Team Confidence</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">Kill Pts</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">Pos Pts</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">Total Pts</th>
                                    <th className="p-3 text-xs font-semibold text-dark-400">AI Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-border">
                                {teams.sort((a, b) => {
                                    const slotA = a.matchedSlotNumber || 999;
                                    const slotB = b.matchedSlotNumber || 999;
                                    return slotA - slotB;
                                }).map(team => {
                                    const isExpanded = expandedTeams[team._id];
                                    const pList = players.filter(p => p.teamResult?.toString() === team._id?.toString());
                                    
                                    return (
                                        <React.Fragment key={team._id}>
                                            {/* Team Row */}
                                            <tr className="hover:bg-dark-800/50 cursor-pointer transition-colors" onClick={() => toggleExpand(team._id)}>
                                                <td className="p-3 text-white font-bold text-center">#{team.placement}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <HiChevronDown className="text-neon-cyan"/> : <HiChevronRight className="text-dark-500" />}
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-white font-semibold">{team.matchedTeamName || <span className="text-red-400 italic">Unmatched</span>}</span>
                                                            <span className="text-[10px] text-dark-400">Slot #{team.matchedSlotNumber || '?'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {renderConfidence(team.teamConfidence)}
                                                </td>
                                                <td className="p-3 text-white font-medium">{team.teamKills}</td>
                                                <td className="p-3 text-white font-medium">{team.positionPoints}</td>
                                                <td className="p-3 text-neon-cyan font-bold">{team.totalPoints}</td>
                                                <td className="p-3">
                                                    {team.usedVLM ? <Badge variant="warning">VLM</Badge> : <Badge variant="success">OCR</Badge>}
                                                </td>
                                            </tr>

                                            {/* Players Expand */}
                                            {isExpanded && pList.map(player => (
                                                <tr key={player._id} className="bg-dark-900/50 border-l-2 border-primary-500/30">
                                                    <td className="p-2 border-b border-surface-border"></td>
                                                    <td className="p-2 border-b border-surface-border">
                                                        <div className="flex flex-col gap-0.5 ml-6">
                                                            <span className="text-sm text-dark-200">
                                                                <span className="text-dark-500 mr-2 text-xs">Mapped:</span> 
                                                                {player.matchedPlayerName || <span className="text-yellow-500 italic">?</span>}
                                                            </span>
                                                            <span className="text-xs text-dark-500">
                                                                <span className="mr-2">OCR:</span> "{player.vlmRefinedName || player.ocrName}"
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-b border-surface-border">
                                                        {renderConfidence(player.confidence)}
                                                    </td>
                                                    <td className="p-2 text-white border-b border-surface-border text-sm">
                                                        {player.kills} Kills
                                                    </td>
                                                    <td colSpan={3} className="p-2 border-b border-surface-border text-xs text-dark-500 italic">
                                                        {player.usedVLM ? 'Refined via VLM' : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {(session?.status === 'extracted' || session?.status === 'imported') && teams.length === 0 && (
                <div className="p-6 text-center text-dark-400 rounded-xl border border-surface-border bg-dark-950">
                    No teams were successfully extracted. Try uploading a clearer screenshot or adding a VLM API key.
                </div>
            )}
        </div>
        </div>
    );
};

export default AutoExtractPanel;

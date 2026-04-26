import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineRefresh, HiOutlineViewGrid, HiOutlinePlus, HiOutlineTrash, HiOutlineCog, HiOutlineUserGroup, HiOutlineCheck, HiOutlineLink, HiOutlineTemplate, HiOutlineCheckCircle, HiOutlineDuplicate, HiOutlinePencil, HiOutlineDownload
} from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentGroupsTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [stages, setStages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stage Modal
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageType, setNewStageType] = useState('qualifier'); // qualifier, semi, final, custom

  // Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [activeStageForGroup, setActiveStageForGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLimit, setNewGroupLimit] = useState(20);
  const [newGroupPromotion, setNewGroupPromotion] = useState(0);

  // Group Inline Editing
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');

  // Auto Create Groups
  const [autoCreateStageId, setAutoCreateStageId] = useState(null);
  const [autoGroupCount, setAutoGroupCount] = useState(5);
  const [autoSlotsPerGroup, setAutoSlotsPerGroup] = useState(20);
  const [autoCreating, setAutoCreating] = useState(false);
  const [importingStageId, setImportingStageId] = useState(null);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tournaments/${id}/slots`);
      if (res.success && res.data) {
        setStages([...(res.data.stages || [])].sort((a, b) => a.order - b.order));
        setGroups([...(res.data.groups || [])].sort((a, b) => a.name.localeCompare(b.name)));
        setSlots(res.data.slots || []);
      }
    } catch {
      toast.error('Failed to load group data.');
    } finally {
      setLoading(false);
    }
  };

  // --- STAGE ACTIONS ---
  const handleCreateStage = async (e) => {
    e.preventDefault();
    if (!newStageName) return toast.error("Stage name required");
    try {
      const res = await api.post(`/tournaments/${id}/stages/v2`, { name: newStageName, type: newStageType });
      if (res.success) {
         toast.success("Stage created!");
         setIsStageModalOpen(false);
         setNewStageName('');
         fetchData();
      }
    } catch (err) { toast.error("Failed to create stage"); }
  };

  const handleDeleteStage = async (stageId) => {
    if (!window.confirm("Delete this stage AND ALL ITS GROUPS? This is permanent.")) return;
    try {
      const res = await api.delete(`/tournaments/${id}/stages/${stageId}`);
      if (res.success) {
         toast.success("Stage deleted");
         fetchData();
      }
    } catch (err) { toast.error("Failed to delete stage"); }
  };

  const handleConnectStage = async (stageId, targetId) => {
     try {
        const res = await api.put(`/tournaments/${id}/stages/${stageId}/connect`, { feedsIntoId: targetId || null });
        if (res.success) {
           toast.success("Connection updated");
           fetchData();
        }
     } catch (err) {
        toast.error(err.response?.data?.message || "Failed to connect stage");
     }
  };

  const handleImportRegisteredTeams = async (stageId) => {
     if (!window.confirm("This will import all APPROVED registered teams and distribute them equally across this stage's groups. Continue?")) return;
     setImportingStageId(stageId);
     try {
        const res = await api.post(`/tournaments/${id}/stages/${stageId}/import-teams`);
        if (res.success) {
           toast.success(res.message || 'Teams imported successfully!');
           fetchData();
        }
     } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to import teams.');
     } finally {
        setImportingStageId(null);
     }
  };

  // --- GROUP ACTIONS ---
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!activeStageForGroup) return toast.error("Stage ID is missing");
    if (!newGroupName || newGroupLimit < 2) return toast.error("Invalid group parameters");
    
    try {
      const res = await api.post(`/tournaments/${id}/groups`, {
         stageId: activeStageForGroup,
         name: newGroupName,
         teamsLimit: newGroupLimit,
         promotionCount: newGroupPromotion
      });
      if (res.success) {
         toast.success("Group created successfully!");
         setIsGroupModalOpen(false);
         setNewGroupName('');
         setNewGroupPromotion(0);
         fetchData();
      }
    } catch (err) {
      toast.error("Failed to create group");
    }
  };

  const handleAutoCreateGroups = async (stageId) => {
     if (autoGroupCount < 1 || autoGroupCount > 50) return toast.error("Group count must be 1-50");
     if (autoSlotsPerGroup < 2 || autoSlotsPerGroup > 100) return toast.error("Slots per group must be 2-100");
     setAutoCreating(true);
     try {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let created = 0;
        for (let i = 0; i < autoGroupCount; i++) {
           const letter = i < 26 ? alphabet[i] : `${alphabet[Math.floor(i / 26) - 1]}${alphabet[i % 26]}`;
           const name = `Group ${letter}`;
           await api.post(`/tournaments/${id}/groups`, {
              stageId,
              name,
              teamsLimit: autoSlotsPerGroup,
              promotionCount: 0
           });
           created++;
        }
        toast.success(`${created} groups created successfully!`);
        setAutoCreateStageId(null);
        fetchData();
     } catch (err) {
        toast.error("Failed to auto-create groups");
     } finally {
        setAutoCreating(false);
     }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Delete this group and wipe all its slots/results? This action is permanent.")) return;
    try {
      const res = await api.delete(`/tournaments/${id}/groups/${groupId}`);
      if (res.success) {
         toast.success("Group deleted");
         fetchData();
      }
    } catch {
      toast.error("Failed to delete group");
    }
  };

  const updatePromotionCount = async (groupId, val) => {
     try {
        await api.put(`/tournaments/${id}/groups/${groupId}`, { promotionCount: val });
        toast.success("Qualification rule updated");
        fetchData();
     } catch {
        toast.error("Failed to update");
     }
  };

  const handleDuplicateGroup = (group) => {
     setActiveStageForGroup(group.stageId);
     setNewGroupName(`${group.name} Copy`);
     setNewGroupLimit(group.teamsLimit);
     setNewGroupPromotion(group.promotionCount || 0);
     setIsGroupModalOpen(true);
  };

  const handleRenameGroup = async (groupId) => {
     if (!editGroupName.trim()) {
        setEditingGroupId(null);
        return;
     }
     try {
        await api.put(`/tournaments/${id}/groups/${groupId}`, { name: editGroupName });
        toast.success("Group renamed");
        setEditingGroupId(null);
        fetchData();
     } catch {
        toast.error("Failed to rename group");
     }
  };

  // --- HELPERS ---
  const slotsByGroup = {};
  slots.forEach(slot => {
    const gid = slot.groupId?.toString?.() || slot.groupId;
    if (!slotsByGroup[gid]) slotsByGroup[gid] = [];
    slotsByGroup[gid].push(slot);
  });

  const getIncomingTeams = (stgId) => {
     let total = 0;
     const sources = stages.filter(s => s.outputTargets?.includes(stgId));
     sources.forEach(src => {
        const srcGroups = groups.filter(g => g.stageId === src._id);
        srcGroups.forEach(sg => { total += (sg.promotionCount || 0); });
     });
     return total;
  };

  if (loading) return (
    <div className="p-10 flex justify-center">
      <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in space-y-8 max-w-7xl mx-auto pb-20">

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-surface-border pb-5">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Manage Groups & Stages</h2>
          <p className="text-sm text-dark-400 mt-1">
            Create Stages and nest your Groups inside them to structure your tournament.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-dark-400 hover:text-white border border-surface-border rounded-lg transition-colors"
            title="Refresh Data"
          >
            <HiOutlineRefresh className="text-xl" />
          </button>
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-neon-cyan text-dark-950 font-bold text-sm rounded-xl hover:bg-neon-cyan/80 transition-all shadow-[0_0_15px_rgba(0,217,255,0.3)]"
          >
            <HiOutlinePlus /> Create Stage
          </button>
        </div>
      </div>

      {stages.length === 0 ? (
         <div className="bg-dark-900 border border-dashed border-surface-border rounded-2xl p-16 text-center">
            <HiOutlineTemplate className="mx-auto text-5xl text-dark-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Stages Created</h3>
            <p className="text-dark-400 mb-6">Start your tournament by creating the first Stage (e.g. Qualifiers).</p>
            <button
               onClick={() => setIsStageModalOpen(true)}
               className="inline-flex items-center gap-2 px-6 py-3 bg-neon-cyan text-dark-950 font-bold rounded-xl hover:bg-neon-cyan/80 transition-all"
            >
               <HiOutlinePlus /> Create First Stage
            </button>
         </div>
      ) : (
         <div className="space-y-10">
            {stages.map((stage, idx) => {
               const stageGroups = groups.filter(g => g.stageId === stage._id);
               const incomingTotal = getIncomingTeams(stage._id);

               return (
                  <div key={stage._id} className="relative">
                     {/* Stage Header Section */}
                     <div className="bg-dark-950 border border-surface-border rounded-t-2xl p-5 flex justify-between items-start lg:items-center flex-col lg:flex-row gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-dark-900 rounded-xl border border-surface-border flex items-center justify-center">
                              <span className="text-lg font-bold text-white">{idx + 1}</span>
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <h3 className="text-xl font-bold text-white">{stage.name}</h3>
                                 <span className="text-[10px] uppercase tracking-widest bg-dark-800 text-dark-400 px-2 py-0.5 rounded border border-surface-border">
                                    {stage.type} Stage
                                 </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2">
                                 {incomingTotal > 0 && (
                                    <span className="text-xs font-bold text-neon-cyan flex items-center gap-1 bg-neon-cyan/10 px-2 py-0.5 rounded">
                                       <HiOutlineCheckCircle /> {incomingTotal} Incoming Teams
                                    </span>
                                 )}
                                 <button 
                                    onClick={() => handleDeleteStage(stage._id)}
                                    className="text-xs text-dark-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                                 >
                                    <HiOutlineTrash /> Delete Stage
                                 </button>
                                 {idx === 0 && stageGroups.length > 0 && (
                                     <button 
                                        onClick={() => handleImportRegisteredTeams(stage._id)}
                                        disabled={importingStageId === stage._id}
                                        className="text-xs font-bold text-green-400 hover:text-green-300 flex items-center gap-1 bg-green-500/10 px-2.5 py-1 rounded border border-green-500/30 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                     >
                                        <HiOutlineDownload /> {importingStageId === stage._id ? 'Importing...' : 'Import Registered Teams'}
                                     </button>
                                  )}
                              </div>
                           </div>
                        </div>

                        {/* Connection Settings */}
                        <div className="bg-dark-900 border border-surface-border rounded-xl p-3 flex items-center gap-3 w-full lg:w-auto">
                           <div className="flex items-center gap-1.5 text-primary-400">
                              <HiOutlineLink className="text-lg" />
                           </div>
                           <div className="flex-1 lg:w-48">
                              <label className="block text-[10px] text-dark-400 uppercase tracking-widest mb-1">Feeds Into</label>
                              <select
                                 value={stage.outputTargets?.[0] || ""}
                                 onChange={(e) => handleConnectStage(stage._id, e.target.value)}
                                 className="w-full bg-dark-950 border border-surface-border rounded p-1.5 text-xs text-white focus:border-neon-cyan outline-none"
                              >
                                 <option value="">-- No Connection --</option>
                                 {stages.filter(s => s._id !== stage._id).map(stg => (
                                    <option key={stg._id} value={stg._id}>{stg.name}</option>
                                 ))}
                              </select>
                           </div>
                        </div>
                     </div>

                     {/* Groups Grid */}
                     <div className="bg-dark-900 border-x border-b border-surface-border rounded-b-2xl p-5 lg:p-6">
                        {stageGroups.length === 0 ? (
                           <div className="text-center py-10 space-y-5">
                              <p className="text-dark-400 text-sm">No groups exist in this stage yet.</p>
                              
                              {/* Auto Create Inline */}
                              {autoCreateStageId === stage._id ? (
                                 <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-dark-950 border border-neon-cyan/30 rounded-xl px-5 py-4">
                                    <div className="text-left">
                                       <label className="block text-[10px] text-dark-400 uppercase tracking-widest mb-1">Groups</label>
                                       <input type="number" min="1" max="50" value={autoGroupCount} onChange={e => setAutoGroupCount(Number(e.target.value))} className="w-20 bg-dark-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan" />
                                    </div>
                                    <div className="text-left">
                                       <label className="block text-[10px] text-dark-400 uppercase tracking-widest mb-1">Slots / Group</label>
                                       <input type="number" min="2" max="100" value={autoSlotsPerGroup} onChange={e => setAutoSlotsPerGroup(Number(e.target.value))} className="w-20 bg-dark-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan" />
                                    </div>
                                    <div className="flex gap-2 mt-4 sm:mt-5">
                                       <button 
                                          onClick={() => handleAutoCreateGroups(stage._id)}
                                          disabled={autoCreating}
                                          className="px-4 py-2 bg-neon-cyan text-dark-950 font-bold rounded-lg hover:bg-neon-cyan/80 transition-colors text-sm disabled:opacity-50"
                                       >
                                          {autoCreating ? 'Creating...' : `Create ${autoGroupCount} Groups`}
                                       </button>
                                       <button onClick={() => setAutoCreateStageId(null)} className="px-3 py-2 text-dark-400 hover:text-white text-sm">
                                          Cancel
                                       </button>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex items-center justify-center gap-3">
                                    <button 
                                       onClick={() => { setAutoCreateStageId(stage._id); setAutoGroupCount(5); setAutoSlotsPerGroup(20); }}
                                       className="inline-flex items-center gap-2 px-5 py-2 bg-neon-cyan/10 border border-neon-cyan/50 text-neon-cyan font-bold rounded-lg hover:bg-neon-cyan/20 transition-colors text-sm"
                                    >
                                       <HiOutlineTemplate /> Auto Create Groups
                                    </button>
                                    <button 
                                       onClick={() => { setActiveStageForGroup(stage._id); setIsGroupModalOpen(true); }}
                                       className="inline-flex items-center gap-2 px-5 py-2 border border-surface-border text-dark-300 font-bold rounded-lg hover:bg-dark-800 transition-colors text-sm"
                                    >
                                       <HiOutlinePlus /> Add Single Group
                                    </button>
                                 </div>
                              )}
                           </div>
                        ) : (
                           <div className="space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                 {stageGroups.map(group => {
                                    const groupSlots = (slotsByGroup[group._id] || []).sort((a, b) => a.slotNumber - b.slotNumber);
                                    const filledCount = groupSlots.filter(s => s.occupyingTeam).length;

                                    return (
                                       <div key={group._id} className="bg-dark-950 rounded-2xl border border-surface-border overflow-hidden flex flex-col hover:border-dark-600 transition-colors">
                                          {/* Group Header */}
                                          <div className="px-5 py-4 border-b border-surface-border flex justify-between items-center">
                                             <div className="flex items-center gap-3">
                                                <div className="p-2 bg-dark-800 rounded-lg border border-surface-border">
                                                   <HiOutlineUserGroup className="text-neon-cyan" />
                                                </div>
                                                <div className="flex-1">
                                                   {editingGroupId === group._id ? (
                                                      <input
                                                         autoFocus
                                                         type="text"
                                                         value={editGroupName}
                                                         onChange={(e) => setEditGroupName(e.target.value)}
                                                         onBlur={() => handleRenameGroup(group._id)}
                                                         onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup(group._id)}
                                                         className="bg-dark-900 border border-neon-cyan/50 text-white text-sm font-bold rounded px-2 py-0.5 outline-none w-full max-w-[150px]"
                                                      />
                                                   ) : (
                                                      <div className="flex items-center gap-2 group/edit">
                                                         <h4 className="font-bold text-white text-sm tracking-wide">{group.name}</h4>
                                                         <button 
                                                            onClick={() => { setEditingGroupId(group._id); setEditGroupName(group.name); }}
                                                            className="text-dark-500 hover:text-neon-cyan opacity-0 group-hover/edit:opacity-100 transition-all"
                                                         >
                                                            <HiOutlinePencil className="text-sm" />
                                                         </button>
                                                      </div>
                                                   )}
                                                   <p className="text-[10px] text-dark-400">{filledCount} / {group.teamsLimit} Teams</p>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <button 
                                                  onClick={() => handleDuplicateGroup(group)}
                                                  className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                                  title="Duplicate Group"
                                                >
                                                   <HiOutlineDuplicate className="text-lg" />
                                                </button>
                                                <button 
                                                  onClick={() => navigate(`/organizer/tournaments/${id}/groups/${group._id}/manage`)}
                                                  className="p-1.5 text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
                                                  title="Manage Group"
                                                >
                                                   <HiOutlineCog className="text-lg" />
                                                </button>
                                                <button 
                                                  onClick={() => handleDeleteGroup(group._id)}
                                                  className="p-1.5 text-dark-500 hover:text-red-400 rounded transition-colors"
                                                  title="Delete Group"
                                                >
                                                   <HiOutlineTrash className="text-lg" />
                                                </button>
                                             </div>
                                          </div>

                                          {/* Qualification Setting */}
                                          <div className="px-5 py-3 border-b border-surface-border bg-dark-900/50 flex justify-between items-center">
                                             <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Qualify Top N</span>
                                             <input 
                                               type="number" min="0" max={group.teamsLimit}
                                               value={group.promotionCount || 0}
                                               onChange={(e) => updatePromotionCount(group._id, Number(e.target.value))}
                                               className="w-14 bg-dark-950 border border-surface-border rounded px-2 py-1 text-center text-xs font-bold text-white focus:border-neon-cyan outline-none"
                                             />
                                          </div>

                                          {/* Mini Slot Preview */}
                                          <div className="p-4 grid grid-cols-6 gap-1.5 bg-dark-900 flex-1 content-start">
                                             {groupSlots.map(slot => (
                                                <div 
                                                  key={slot._id} 
                                                  className={`aspect-square rounded border flex items-center justify-center text-[9px] font-bold ${
                                                     slot.occupyingTeam 
                                                       ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan' 
                                                       : 'bg-dark-950 border-surface-border border-dashed text-dark-600'
                                                  }`}
                                                  title={slot.occupyingTeam ? slot.occupyingTeam.name : 'Empty Slot'}
                                                >
                                                   {slot.occupyingTeam ? '✓' : slot.slotNumber}
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>

                               <div className="pt-2 flex flex-wrap items-center gap-3">
                                  {autoCreateStageId === stage._id ? (
                                     <div className="inline-flex flex-col sm:flex-row items-center gap-3 bg-dark-950 border border-neon-cyan/30 rounded-xl px-5 py-4">
                                        <div className="text-left">
                                           <label className="block text-[10px] text-dark-400 uppercase tracking-widest mb-1">Groups</label>
                                           <input type="number" min="1" max="50" value={autoGroupCount} onChange={e => setAutoGroupCount(Number(e.target.value))} className="w-20 bg-dark-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan" />
                                        </div>
                                        <div className="text-left">
                                           <label className="block text-[10px] text-dark-400 uppercase tracking-widest mb-1">Slots / Group</label>
                                           <input type="number" min="2" max="100" value={autoSlotsPerGroup} onChange={e => setAutoSlotsPerGroup(Number(e.target.value))} className="w-20 bg-dark-900 border border-surface-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan" />
                                        </div>
                                        <div className="flex gap-2 mt-4 sm:mt-5">
                                           <button 
                                              onClick={() => handleAutoCreateGroups(stage._id)}
                                              disabled={autoCreating}
                                              className="px-4 py-2 bg-neon-cyan text-dark-950 font-bold rounded-lg hover:bg-neon-cyan/80 transition-colors text-sm disabled:opacity-50"
                                           >
                                              {autoCreating ? 'Creating...' : `Create ${autoGroupCount} Groups`}
                                           </button>
                                           <button onClick={() => setAutoCreateStageId(null)} className="px-3 py-2 text-dark-400 hover:text-white text-sm">
                                              Cancel
                                           </button>
                                        </div>
                                     </div>
                                  ) : (
                                     <>
                                        <button 
                                           onClick={() => { setAutoCreateStageId(stage._id); setAutoGroupCount(5); setAutoSlotsPerGroup(20); }}
                                           className="inline-flex items-center gap-2 px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-bold rounded-lg hover:bg-neon-cyan/20 transition-colors text-sm"
                                        >
                                           <HiOutlineTemplate /> Auto Create More
                                        </button>
                                        <button 
                                           onClick={() => { setActiveStageForGroup(stage._id); setIsGroupModalOpen(true); }}
                                           className="inline-flex items-center gap-2 px-4 py-2 bg-dark-950 border border-surface-border text-dark-300 font-bold rounded-lg hover:text-white hover:border-dark-500 transition-colors text-sm"
                                        >
                                           <HiOutlinePlus /> Add Single Group
                                        </button>
                                     </>
                                  )}
                               </div>
                           </div>
                        )}
                     </div>
                  </div>
               );
            })}
         </div>
      )}

      {/* CREATE STAGE MODAL */}
      {isStageModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-950 border border-surface-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-surface-border flex justify-between items-center bg-dark-900">
                  <h3 className="font-bold text-white">Create New Stage</h3>
                  <button onClick={() => setIsStageModalOpen(false)} className="text-dark-400 hover:text-white">&times;</button>
               </div>
               <form onSubmit={handleCreateStage} className="p-5 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Stage Name</label>
                     <input 
                        type="text" required
                        value={newStageName} onChange={e => setNewStageName(e.target.value)}
                        placeholder="e.g. Semi Finals"
                        className="w-full bg-dark-900 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:border-neon-cyan outline-none"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Stage Type</label>
                     <select 
                        value={newStageType} onChange={e => setNewStageType(e.target.value)}
                        className="w-full bg-dark-900 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:border-neon-cyan outline-none"
                     >
                        <option value="qualifier">Qualifier Stage</option>
                        <option value="semi">Semi Finals</option>
                        <option value="final">Final Stage</option>
                        <option value="custom">Custom</option>
                     </select>
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full bg-neon-cyan text-dark-950 font-bold py-2.5 rounded-xl hover:bg-neon-cyan/90 transition-all">
                        Create Stage
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isGroupModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-950 border border-surface-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
               <div className="px-5 py-4 border-b border-surface-border flex justify-between items-center bg-dark-900">
                  <h3 className="font-bold text-white">Create New Group</h3>
                  <button onClick={() => setIsGroupModalOpen(false)} className="text-dark-400 hover:text-white">&times;</button>
               </div>
               <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Group Name</label>
                     <input 
                        type="text" required
                        value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                        placeholder="e.g. Group A"
                        className="w-full bg-dark-900 border border-surface-border rounded-xl px-4 py-3 text-sm text-white focus:border-neon-cyan outline-none"
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="block text-xs font-bold text-dark-400 uppercase tracking-wider mb-2">Capacity</label>
                        <input 
                           type="number" min="2" required
                           value={newGroupLimit} onChange={e => setNewGroupLimit(Number(e.target.value))}
                           className="w-full bg-dark-900 border border-surface-border rounded-xl px-3 py-2.5 text-sm text-white focus:border-neon-cyan outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-neon-cyan uppercase tracking-wider mb-2">Qualify (Top N)</label>
                        <input 
                           type="number" min="0" required
                           value={newGroupPromotion} onChange={e => setNewGroupPromotion(Number(e.target.value))}
                           className="w-full bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl px-3 py-2.5 text-sm text-neon-cyan font-bold focus:border-neon-cyan outline-none"
                        />
                     </div>
                  </div>
                  <div className="pt-2">
                     <button type="submit" className="w-full bg-neon-cyan text-dark-950 font-bold py-2.5 rounded-xl hover:bg-neon-cyan/90 transition-all">
                        Create Group
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default TournamentGroupsTab;

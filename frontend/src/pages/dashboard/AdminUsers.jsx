import { useState, useEffect } from 'react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { HiCurrencyDollar, HiTrash, HiX, HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineDeviceMobile, HiOutlineIdentification, HiOutlineKey, HiOutlineRefresh, HiOutlinePlus, HiOutlineUserGroup, HiOutlineClipboardCopy, HiOutlineCheck } from 'react-icons/hi';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Wallet Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amountToAdd, setAmountToAdd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoUser, setInfoUser] = useState(null);

  // Tier Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [tierUser, setTierUser] = useState(null);
  const [selectedTier, setSelectedTier] = useState('');
  const [isSettingTier, setIsSettingTier] = useState(false);

  // Create Full Test Account State
  const [isCreatingTestAcc, setIsCreatingTestAcc] = useState(false);
  const [testAccResult, setTestAccResult] = useState(null);
  const [teamSize, setTeamSize] = useState(4);
  const [copiedField, setCopiedField] = useState(null);

  // Force Join Event State
  const [isForceJoinModalOpen, setIsForceJoinModalOpen] = useState(false);
  const [forceJoinUser, setForceJoinUser] = useState(null);
  const [forceJoinType, setForceJoinType] = useState('tournament');
  const [forceJoinCode, setForceJoinCode] = useState('');
  const [isForceJoining, setIsForceJoining] = useState(false);

  // Bulk Join Event State
  const [isBulkJoinModalOpen, setIsBulkJoinModalOpen] = useState(false);
  const [bulkJoinCount, setBulkJoinCount] = useState(10);
  const [bulkJoinType, setBulkJoinType] = useState('tournament');
  const [bulkJoinCode, setBulkJoinCode] = useState('');
  const [isBulkJoining, setIsBulkJoining] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const toggleUserSelection = (id) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u._id)));
    }
  };

  // Client-side filter by search term
  const filteredUsers = users.filter(u => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s) ||
      (u.teamName || '').toLowerCase().includes(s) ||
      (u.realName || '').toLowerCase().includes(s) ||
      (u.ign || '').toLowerCase().includes(s) ||
      (u.role || '').toLowerCase().includes(s)
    );
  });

  const fetchUsers = async () => {
    try {
      const data = await api.get('/admin/users?limit=all');
      setUsers(data.users);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openWalletModal = (user) => {
    setSelectedUser(user);
    setAmountToAdd('');
    setIsWalletModalOpen(true);
  };

  const closeWalletModal = () => {
    setIsWalletModalOpen(false);
    setSelectedUser(null);
  };

  const openInfoModal = (user) => {
    setInfoUser(user);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoUser(null);
  };

  const handleResetPassword = async (userId, username) => {
    try {
      await api.put(`/admin/users/${userId}/reset-password`, { newPassword: 'password123' });
      toast.success(`Password for @${username} reset to: password123`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleAddBalance = async (e) => {
    e.preventDefault();
    if (!amountToAdd || isNaN(amountToAdd) || Number(amountToAdd) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.put(`/admin/users/${selectedUser._id}/balance`, { amount: Number(amountToAdd) });
      toast.success(`Added ₹${amountToAdd} to ${selectedUser.username}'s wallet`);
      closeWalletModal();
      fetchUsers(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you absolutely sure you want to delete user @${username}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      toast.success(`User @${username} deleted`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openTierModal = (user) => {
    setTierUser(user);
    setSelectedTier(user.organizerProfile?.organizerTier || 'starter');
    setIsTierModalOpen(true);
  };

  const closeTierModal = () => {
    setIsTierModalOpen(false);
    setTierUser(null);
  };

  const handleSetTier = async (e) => {
    e.preventDefault();
    setIsSettingTier(true);
    try {
      await api.put(`/admin/users/${tierUser._id}/tier`, { tier: selectedTier });
      toast.success(`Tier updated to ${selectedTier}`);
      closeTierModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier');
    } finally {
      setIsSettingTier(false);
    }
  };

  const handleToggleSuperOrganizer = async (user) => {
    const isSuper = user.isSuperOrganizer;
    if (!window.confirm(`Are you sure you want to ${isSuper ? 'revoke' : 'grant'} Super Organizer status for @${user.username}?`)) return;
    
    try {
      if (isSuper) {
        await api.delete(`/admin/users/${user._id}/super-organizer`);
        toast.success(`Super Organizer revoked`);
      } else {
        await api.put(`/admin/users/${user._id}/super-organizer`);
        toast.success(`Super Organizer granted`);
      }
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle Super Organizer');
    }
  };

  const handleCreateFullTestAccount = async () => {
    setIsCreatingTestAcc(true);
    try {
      const res = await api.post('/simulator/generate-full-account', { teamSize });
      if (res.success) {
        setTestAccResult(res.data);
        toast.success(`✅ ${res.message}`);
        fetchUsers();
      } else {
        toast.error(res.message || 'Failed to create test account');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create test account');
    } finally {
      setIsCreatingTestAcc(false);
    }
  };

  const copyField = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const openForceJoinModal = (user) => {
    setForceJoinUser(user);
    setForceJoinType('tournament');
    setForceJoinCode('');
    setIsForceJoinModalOpen(true);
  };

  const closeForceJoinModal = () => {
    setIsForceJoinModalOpen(false);
    setForceJoinUser(null);
  };

  const handleForceJoinEvent = async (e) => {
    e.preventDefault();
    if (!forceJoinCode.trim()) return toast.error('Please provide a code/link.');
    
    setIsForceJoining(true);
    try {
      const res = await api.post(`/admin/users/${forceJoinUser._id}/force-join`, {
        eventType: forceJoinType,
        inputCode: forceJoinCode
      });
      toast.success(`✅ ${res.message || 'User successfully joined event'}`);
      closeForceJoinModal();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to force join event');
    } finally {
      setIsForceJoining(false);
    }
  };

  const openBulkJoinModal = () => {
    setBulkJoinType('tournament');
    setBulkJoinCode('');
    setBulkJoinCount(10);
    setIsBulkJoinModalOpen(true);
  };

  const closeBulkJoinModal = () => {
    setIsBulkJoinModalOpen(false);
  };

  const handleBulkJoinEvent = async (e) => {
    e.preventDefault();
    if (!bulkJoinCode.trim()) return toast.error('Please provide a code/link.');
    
    if (selectedUsers.size === 0) {
      if (bulkJoinCount < 1 || bulkJoinCount > 50) return toast.error('Count must be between 1 and 50');
    }

    setIsBulkJoining(true);
    try {
      const payload = {
        count: selectedUsers.size > 0 ? selectedUsers.size : bulkJoinCount,
        eventType: bulkJoinType,
        inputCode: bulkJoinCode
      };

      if (selectedUsers.size > 0) {
        payload.userIds = Array.from(selectedUsers);
      }

      const res = await api.post('/admin/bulk-force-join', payload);
      toast.success(`✅ ${res.message || 'Bulk join successful'}`);
      closeBulkJoinModal();
      setSelectedUsers(new Set()); // Clear selection
      fetchUsers(); // optionally refresh if needed
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to bulk join event');
    } finally {
      setIsBulkJoining(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col min-h-[80vh]">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">User Management</h1>
            <p className="text-dark-400">View and control all registered users on the platform</p>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 min-w-[250px] max-w-md">
            <input 
              type="text" 
              placeholder="Search by username, email, team, real name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-900 border border-surface-border text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-neon-cyan/50 transition-colors placeholder:text-dark-400"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Create Full Test Account */}
            <div className="flex items-center gap-2 bg-dark-900 border border-neon-cyan/20 rounded-xl px-3 py-2">
              <HiOutlineUserGroup className="text-neon-cyan text-lg shrink-0" />
              <span className="text-xs text-dark-300 whitespace-nowrap">Team size:</span>
              <select
                value={teamSize}
                onChange={e => setTeamSize(Number(e.target.value))}
                className="bg-dark-800 text-white text-xs rounded-lg px-2 py-1 border border-surface-border outline-none focus:border-neon-cyan/40"
              >
                {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} players</option>)}
              </select>
              <button
                onClick={handleCreateFullTestAccount}
                disabled={isCreatingTestAcc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neon-cyan text-dark-950 hover:bg-neon-cyan/80 disabled:opacity-50 transition-all shadow-lg shadow-neon-cyan/20 whitespace-nowrap"
              >
                {isCreatingTestAcc ? (
                  <span className="w-3 h-3 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiOutlinePlus className="text-sm" />
                )}
                {isCreatingTestAcc ? 'Creating...' : 'Create Full Test Account'}
              </button>
            </div>
            
            <button
              onClick={openBulkJoinModal}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-lg whitespace-nowrap ${selectedUsers.size > 0 ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-purple-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20'}`}
            >
              <HiOutlineUserGroup className="text-lg" />
              {selectedUsers.size > 0 ? `Push Selected (${selectedUsers.size})` : 'Bulk Join Random'}
            </button>

            <div className="text-sm text-dark-400">Total Users: <span className="text-neon-cyan font-bold">{users.length}</span></div>
          </div>
        </div>

        <div className="card p-0 overflow-hidden flex-1 flex flex-col relative pb-16">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-dark-900 border-b border-surface-border text-xs text-dark-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0} 
                      onChange={toggleAllSelection} 
                      className="w-4 h-4 rounded bg-dark-800 border-surface-border accent-purple-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Wallet Balance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filteredUsers.map(user => (
                  <tr 
                    key={user._id} 
                    className={`hover:bg-dark-850/50 transition-colors cursor-pointer ${selectedUsers.has(user._id) ? 'bg-purple-500/5' : ''}`}
                    onClick={() => openInfoModal(user)}
                  >
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.has(user._id)} 
                        onChange={() => toggleUserSelection(user._id)} 
                        className="w-4 h-4 rounded bg-dark-800 border-surface-border accent-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-neon-purple flex items-center justify-center text-xs font-bold text-white uppercase">
                          {user.username?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            @{user.username}
                            {user.teamName && (
                              <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded-full border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] whitespace-nowrap">
                                🛡️ {user.teamName}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-dark-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'organizer' ? 'primary' : 'neutral'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-neon-cyan font-medium">₹{user.wallet?.balance || 0}</span>
                    </td>
                    <td className="p-4">
                      {user.isActive ? (
                        <span className="text-green-400 text-xs">Active</span>
                      ) : (
                        <span className="text-red-400 text-xs">Banned/Inactive</span>
                      )}
                      {user.isSuperOrganizer && (
                        <div className="mt-1">
                          <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30 uppercase">Super</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openForceJoinModal(user); }} 
                        className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/20"
                      >
                        <HiOutlinePlus className="text-sm" /> Join Event
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openWalletModal(user); }} 
                        className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-green-400 hover:bg-green-400/10 hover:border-green-400/20"
                      >
                        <HiCurrencyDollar className="text-sm" /> Funds
                      </button>
                      {user.role === 'organizer' && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openTierModal(user); }} 
                            className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-purple-400 hover:bg-purple-400/10 hover:border-purple-400/20"
                          >
                            ⭐ Tier
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleSuperOrganizer(user); }} 
                            className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-red-400 hover:bg-red-400/10 hover:border-red-400/20"
                          >
                            <HiOutlineKey className="text-sm" /> Super
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUser(user._id, user.username); }} 
                        className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-red-500 hover:bg-red-500/10 hover:border-red-500/20"
                      >
                        <HiTrash className="text-sm" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-dark-500">
                      {searchTerm ? 'No users matched your search criteria.' : 'No users found on the platform.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Floating Selection Bar */}
          {selectedUsers.size > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-purple-500/10 backdrop-blur-md border-t border-purple-500/20 p-4 flex items-center justify-between">
              <span className="text-purple-400 font-medium text-sm">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedUsers(new Set())}
                  className="btn-ghost py-1.5 px-4 text-sm"
                >
                  Clear Selection
                </button>
                <button 
                  onClick={openBulkJoinModal}
                  className="btn-primary bg-purple-500 hover:bg-purple-600 shadow-purple-500/20 py-1.5 px-4 text-sm flex items-center gap-2"
                >
                  <HiOutlineUserGroup /> Push Selected to Event
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Balance Modal */}
        {isWalletModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiCurrencyDollar className="text-neon-cyan" /> 
                  Add Funds to Wallet
                </h3>
                <button onClick={closeWalletModal} className="text-dark-400 hover:text-white p-1 rounded-lg transition-colors">
                  <HiX size={20} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-dark-300 mb-4">
                  You are about to add funds to <span className="text-neon-cyan font-bold">@{selectedUser.username}</span>'s wallet. 
                  Current Balance: <span className="text-white">₹{selectedUser.wallet?.balance || 0}</span>
                </p>
                <form onSubmit={handleAddBalance}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 500"
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      className="input-field w-full text-lg font-medium"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                    <button type="button" onClick={closeWalletModal} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shadow-lg shadow-primary-500/20">
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <HiCurrencyDollar size={16} />
                      )}
                      {isSubmitting ? 'Processing...' : 'Confirm Addition'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Tier Modal */}
        {isTierModalOpen && tierUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">⭐</span> Manage Tier
                </h3>
                <button onClick={closeTierModal} className="text-dark-400 hover:text-white p-1 rounded-lg transition-colors">
                  <HiX size={20} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-dark-300 mb-4">
                  Set tier for <span className="text-neon-cyan font-bold">@{tierUser.username}</span>.
                </p>
                <form onSubmit={handleSetTier}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Tier</label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="input-field w-full text-sm"
                    >
                      <option value="starter">Starter (0%)</option>
                      <option value="verified">Verified (70%)</option>
                      <option value="pro">Pro (82%)</option>
                      <option value="elite">Elite (85%)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                    <button type="button" onClick={closeTierModal} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={isSettingTier} className="btn-primary bg-purple-500 hover:bg-purple-600 px-4 py-2 text-sm flex items-center gap-2">
                      {isSettingTier ? 'Updating...' : 'Save Tier'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Force Join Event Modal */}
        {isForceJoinModalOpen && forceJoinUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlinePlus className="text-neon-cyan" /> Force Join Event
                </h3>
                <button onClick={closeForceJoinModal} className="text-dark-400 hover:text-white transition-colors">
                  <HiX className="text-xl" />
                </button>
              </div>
              <form onSubmit={handleForceJoinEvent} className="p-6 space-y-5">
                <p className="text-sm text-dark-400">
                  Force pushing <span className="font-bold text-white">@{forceJoinUser.username}</span> into an event. A test team will be automatically created for them if they do not have one.
                </p>
                
                <div>
                  <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Event Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setForceJoinType('tournament')} className={`py-2 text-sm font-bold rounded-xl border ${forceJoinType === 'tournament' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-dark-800 border-surface-border text-dark-400 hover:text-white'}`}>
                      Tournament
                    </button>
                    <button type="button" onClick={() => setForceJoinType('scrim')} className={`py-2 text-sm font-bold rounded-xl border ${forceJoinType === 'scrim' ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan' : 'bg-dark-800 border-surface-border text-dark-400 hover:text-white'}`}>
                      Scrim
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">
                    {forceJoinType === 'tournament' ? 'Invite Link or Code' : 'Scrim ID'}
                  </label>
                  <input
                    type="text"
                    value={forceJoinCode}
                    onChange={e => setForceJoinCode(e.target.value)}
                    className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-3 text-white outline-none focus:border-neon-cyan/50"
                    placeholder={forceJoinType === 'tournament' ? 'e.g. 5x8kL9 or full URL' : 'e.g. 64b2c1...'}
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForceJoinModal} className="flex-1 btn-ghost py-3">Cancel</button>
                  <button type="submit" disabled={isForceJoining} className="flex-1 btn-primary py-3 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isForceJoining && <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />}
                    {isForceJoining ? 'Processing...' : 'Force Join'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Join Event Modal */}
        {isBulkJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlineUserGroup className="text-purple-400" /> {selectedUsers.size > 0 ? 'Push Selected Teams' : 'Bulk Join Random'}
                </h3>
                <button onClick={closeBulkJoinModal} className="text-dark-400 hover:text-white transition-colors">
                  <HiX className="text-xl" />
                </button>
              </div>
              <form onSubmit={handleBulkJoinEvent} className="p-6 space-y-5">
                <p className="text-sm text-dark-400">
                  {selectedUsers.size > 0 
                    ? `You are pushing ${selectedUsers.size} explicitly selected user${selectedUsers.size > 1 ? 's' : ''} into an event. They will be auto-assigned 4-player teams if they don't have one.`
                    : `Instantly push multiple random test users into an event. They will be auto-assigned 4-player teams if they don't have one.`
                  }
                </p>
                
                {selectedUsers.size === 0 && (
                  <div>
                    <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Number of Teams (Max 50)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={bulkJoinCount}
                      onChange={e => setBulkJoinCount(Number(e.target.value))}
                      className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400/50"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Event Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setBulkJoinType('tournament')} className={`py-2 text-sm font-bold rounded-xl border ${bulkJoinType === 'tournament' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-dark-800 border-surface-border text-dark-400 hover:text-white'}`}>
                      Tournament
                    </button>
                    <button type="button" onClick={() => setBulkJoinType('scrim')} className={`py-2 text-sm font-bold rounded-xl border ${bulkJoinType === 'scrim' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-dark-800 border-surface-border text-dark-400 hover:text-white'}`}>
                      Scrim
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">
                    {bulkJoinType === 'tournament' ? 'Invite Link or Code' : 'Scrim ID'}
                  </label>
                  <input
                    type="text"
                    value={bulkJoinCode}
                    onChange={e => setBulkJoinCode(e.target.value)}
                    className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-3 text-white outline-none focus:border-purple-400/50"
                    placeholder={bulkJoinType === 'tournament' ? 'e.g. 5x8kL9 or full URL' : 'e.g. 64b2c1...'}
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeBulkJoinModal} className="flex-1 btn-ghost py-3">Cancel</button>
                  <button type="submit" disabled={isBulkJoining} className="flex-1 btn-primary bg-purple-500 hover:bg-purple-600 shadow-purple-500/20 py-3 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isBulkJoining && <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />}
                    {isBulkJoining ? 'Processing...' : (selectedUsers.size > 0 ? `Push ${selectedUsers.size} Users` : 'Bulk Join')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Info Modal */}
        {isInfoModalOpen && infoUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlineUser className="text-neon-cyan" /> 
                  User Details
                </h3>
                <button onClick={closeInfoModal} className="text-dark-400 hover:text-white p-1 rounded-lg transition-colors">
                  <HiX size={20} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-4 border-b border-surface-border pb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-600 to-neon-purple flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg shadow-primary-600/20">
                    {infoUser.username?.[0] || 'U'}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">@{infoUser.username}</h4>
                    <p className="text-sm text-dark-400 flex items-center gap-1">
                      <HiOutlineMail /> {infoUser.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-dark-950 p-3 rounded-xl border border-surface-border">
                    <p className="text-xs text-dark-500 uppercase font-bold mb-1 flex items-center gap-1"><HiOutlineIdentification /> Game IGN</p>
                    <p className="text-sm text-white font-medium">{infoUser.ign || 'Not Set'}</p>
                  </div>
                  <div className="bg-dark-950 p-3 rounded-xl border border-surface-border">
                    <p className="text-xs text-dark-500 uppercase font-bold mb-1 flex items-center gap-1"><HiOutlineIdentification /> Game UID</p>
                    <p className="text-sm text-white font-medium">{infoUser.uid || 'Not Set'}</p>
                  </div>
                  <div className="bg-dark-950 p-3 rounded-xl border border-surface-border">
                    <p className="text-xs text-dark-500 uppercase font-bold mb-1 flex items-center gap-1"><HiOutlinePhone /> Phone</p>
                    <p className="text-sm text-white font-medium">{infoUser.phone || 'Not Set'}</p>
                  </div>
                  <div className="bg-dark-950 p-3 rounded-xl border border-surface-border">
                    <p className="text-xs text-dark-500 uppercase font-bold mb-1 flex items-center gap-1"><HiOutlineDeviceMobile /> Device</p>
                    <p className="text-sm text-white font-medium">{infoUser.device || 'Not Set'}</p>
                  </div>
                </div>

                <div className="bg-dark-950 p-4 rounded-xl border border-surface-border">
                  <p className="text-xs text-dark-500 uppercase font-bold mb-2 flex items-center gap-1"><HiOutlineKey /> Authentication & Security</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-dark-300">Account Status</span>
                      {infoUser.isActive ? <span className="text-green-400 font-bold">Active</span> : <span className="text-red-400 font-bold">Banned</span>}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-dark-300">Wallet Balance</span>
                      <span className="text-neon-cyan font-bold">₹{infoUser.wallet?.balance || 0}</span>
                    </div>
                    <div className="flex justify-between items-start text-sm gap-2">
                      <span className="text-dark-300 shrink-0">Password</span>
                      {infoUser.isTestData ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end flex-wrap">
                            <span className="text-yellow-400 font-mono bg-yellow-400/10 px-2 py-0.5 rounded text-xs">password123</span>
                            <span className="text-dark-500 text-[10px]">or old:</span>
                            <span className="text-orange-400 font-mono bg-orange-400/10 px-2 py-0.5 rounded text-xs">mockedpassword</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-dark-400 tracking-widest text-xs">•••••••• (Encrypted)</span>
                      )}
                    </div>
                    {infoUser.isTestData && (
                      <div className="pt-2 border-t border-surface-border mt-1">
                        <p className="text-[10px] text-orange-400/70 mb-2">⚠ Old test accounts used <span className="font-mono">mockedpassword</span>. Reset it to <span className="font-mono text-yellow-400">password123</span> if login fails.</p>
                        <button
                          onClick={() => handleResetPassword(infoUser._id, infoUser.username)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:border-yellow-500/60 transition-all"
                        >
                          <HiOutlineRefresh className="text-sm" />
                          Reset Password → password123
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-surface-border">
                  <button type="button" onClick={closeInfoModal} className="btn-primary px-6 py-2 text-sm">Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Test Account Created Modal ── */}
        {testAccResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-dark-900 border border-neon-cyan/30 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl shadow-neon-cyan/10 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-surface-border shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HiOutlineUserGroup className="text-neon-cyan" />
                  ✅ Test Account Created
                </h3>
                <button onClick={() => setTestAccResult(null)} className="text-dark-400 hover:text-white p-1 rounded-lg transition-colors">
                  <HiX size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-4">
                {/* Team Info */}
                <div className="bg-neon-cyan/5 border border-neon-cyan/20 rounded-xl p-4">
                  <p className="text-xs text-neon-cyan font-bold uppercase tracking-wider mb-2">🏆 Team Created</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-lg">{testAccResult.team?.name}</p>
                      <p className="text-dark-400 text-xs">Tag: <span className="text-neon-cyan font-mono">[{testAccResult.team?.tag}]</span></p>
                    </div>
                    <span className="text-xs bg-neon-cyan/10 text-neon-cyan px-2 py-1 rounded-lg font-mono">{testAccResult.members?.length} members</span>
                  </div>
                </div>

                {/* Captain */}
                <div className="bg-dark-950 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-xs text-yellow-400 font-bold uppercase tracking-wider mb-3">👑 Captain (Login with this)</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Email', value: testAccResult.captain?.email, key: 'email' },
                      { label: 'Password', value: 'password123', key: 'pass' },
                      { label: 'Username', value: `@${testAccResult.captain?.username}`, key: 'uname' },
                      { label: 'IGN', value: testAccResult.captain?.ign, key: 'ign' },
                      { label: 'UID', value: testAccResult.captain?.uid, key: 'uid' },
                      { label: 'Phone', value: testAccResult.captain?.phone, key: 'phone' },
                      { label: 'Device', value: testAccResult.captain?.device, key: 'device' },
                      { label: 'Real Name', value: testAccResult.captain?.realName, key: 'name' },
                    ].map(({ label, value, key }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-dark-400 text-xs w-20 shrink-0">{label}</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-white text-xs font-mono truncate flex-1">{value}</span>
                          <button
                            onClick={() => copyField(value, `cap_${key}`)}
                            className="shrink-0 text-dark-500 hover:text-neon-cyan transition-colors"
                          >
                            {copiedField === `cap_${key}` ? <HiOutlineCheck className="text-green-400" /> : <HiOutlineClipboardCopy />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <p className="text-xs text-dark-400 font-bold uppercase tracking-wider mb-2">👥 Teammates</p>
                  <div className="space-y-2">
                    {testAccResult.members?.slice(1).map((m, i) => (
                      <div key={i} className="bg-dark-950 border border-surface-border rounded-xl p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">@{m.username}</p>
                          <p className="text-dark-400 text-[10px] truncate">{m.email}</p>
                          <p className="text-dark-500 text-[10px]">IGN: {m.ign} · Pass: <span className="text-yellow-400 font-mono">password123</span></p>
                        </div>
                        <button
                          onClick={() => copyField(m.email, `mem_${i}`)}
                          className="shrink-0 text-dark-500 hover:text-neon-cyan transition-colors"
                        >
                          {copiedField === `mem_${i}` ? <HiOutlineCheck className="text-green-400" /> : <HiOutlineClipboardCopy />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-dark-800 rounded-xl p-3 text-[10px] text-dark-400 flex items-start gap-2">
                  <span className="text-yellow-400 shrink-0">⚠</span>
                  <span>All members use password <span className="text-yellow-400 font-mono">password123</span>. Batch ID: <span className="font-mono text-dark-300">{testAccResult.batchId}</span></span>
                </div>
              </div>

              <div className="p-4 border-t border-surface-border shrink-0 flex justify-end gap-3">
                <button onClick={() => { setTestAccResult(null); handleCreateFullTestAccount(); }} className="btn-ghost px-4 py-2 text-sm flex items-center gap-2">
                  <HiOutlinePlus /> Create Another
                </button>
                <button onClick={() => setTestAccResult(null)} className="btn-primary px-6 py-2 text-sm">Done</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;

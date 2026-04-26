import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiOutlineChartPie, HiOutlineUsers, HiOutlineViewGrid, HiOutlineTrendingUp, HiOutlineShieldExclamation, HiOutlineCash, HiOutlineSpeakerphone, HiOutlineCog, HiOutlineKey, HiOutlineClock, HiOutlineChartBar, HiOutlineFlag, HiOutlineChatAlt2, HiOutlineShare, HiMenuAlt2 } from 'react-icons/hi';
import api from '../../lib/api';

import toast from 'react-hot-toast';

const TournamentManager = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('ops_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('ops_sidebar_collapsed', next.toString());
      return next;
    });
  };

  // Example subset of the requested tabs
  const tabs = [
    { name: 'Overview', path: `/organizer/tournaments/${id}/overview`, icon: HiOutlineChartPie },
    { name: 'Community Chat', path: `/organizer/tournaments/${id}/chat`, icon: HiOutlineChatAlt2 },
    { name: 'Registrations', path: `/organizer/tournaments/${id}/registrations`, icon: HiOutlineUsers },
    { name: 'Create Groups', path: `/organizer/tournaments/${id}/groups`, icon: HiOutlineViewGrid },
    { name: 'Add Results', path: `/organizer/tournaments/${id}/results`, icon: HiOutlineChartBar },
    { name: 'Disputes', path: `/organizer/tournaments/${id}/disputes`, icon: HiOutlineFlag },
  ];

  useEffect(() => {
    const fetchTourney = async () => {
       try {
          const res = await api.get(`/tournaments/public/${id}`);
          if (res.success) setTournament(res.data);
       } catch (e) {
          toast.error("Failed to fetch tournament framework");
       } finally {
          setLoading(false);
       }
    };
    fetchTourney();
  }, [id]);

  const handlePublish = async () => {
     try {
        const res = await api.post(`/tournaments/${id}/publish`);
        if (res.success) {
           toast.success("Tournament Matrix Published!");
           setTournament({ ...tournament, status: res.data?.status || 'published' });
        }
     } catch (e) {
        toast.error(e.response?.data?.message || "Validation logic failed.");
     }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-100px)]">
        {/* Top Operations Header */}
        <div className="flex justify-between items-end mb-6">
           <div>
              <p className="text-xs text-neon-cyan font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                Live Operations Center 
                <span className="text-dark-400 bg-dark-900 border border-surface-border px-2 py-0.5 rounded cursor-copy" title="Copy to Simulator" onClick={() => {navigator.clipboard.writeText(tournament?.shortCode)}}>
                  {tournament?.shortCode || 'SYNCHRONIZING'}
                </span>
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded ml-2">
                  {tournament?.status.toUpperCase()}
                </span>
              </p>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">{tournament?.title}</h1>
           </div>
           <div className="flex gap-3 items-center">
              <button 
                onClick={toggleCollapse} 
                className="btn-ghost text-sm p-2 hover:text-white text-dark-400 border border-surface-border"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <HiMenuAlt2 className="text-lg" />
              </button>
              <button onClick={() => navigate('/organizer/tournaments')} className="btn-ghost text-sm">Exit Manager</button>
              {tournament?.status === 'draft' && (
                 <button onClick={handlePublish} className="btn-primary text-sm px-6">Publish Edits</button>
              )}
           </div>
        </div>

        {/* Multi-Tab Workspace shell */}
        <div className="flex flex-1 gap-6 overflow-hidden">
           
           {/* Ops Navigation Sidebar */}
           <div className={`flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-2 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64 shrink-0'}`}>
              {tabs.map((tab) => {
                 const active = location.pathname.includes(tab.path);
                 return (
                   <button 
                     key={tab.name}
                     onClick={() => navigate(tab.path)}
                     title={isCollapsed ? tab.name : ''}
                     className={`flex items-center px-4 py-3 rounded-xl transition-all font-medium text-sm
                        ${active ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' : 'text-dark-300 hover:bg-dark-800 hover:text-white'}
                        ${isCollapsed ? 'justify-center' : 'gap-3'}
                     `}
                   >
                     <tab.icon className={`text-xl shrink-0 ${active ? 'text-neon-cyan' : 'text-dark-400'}`} />
                     {!isCollapsed && <span className="truncate">{tab.name}</span>}
                   </button>
                 );
              })}
           </div>

           {/* Dynamic Viewport Output */}
           <div className="flex-1 bg-dark-900 rounded-2xl border border-surface-border overflow-y-auto custom-scrollbar p-6 min-w-0">
              <Outlet />
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default TournamentManager;

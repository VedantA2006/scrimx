import React, { useState } from 'react';
import { HiOutlineDatabase, HiOutlineUserGroup, HiOutlineLightningBolt, HiOutlineColorSwatch, HiOutlineTrash, HiOutlineExclamationCircle } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const AdminSimulator = () => {
   const [loading, setLoading] = useState(false);
   const [counts, setCounts] = useState({ users: 50, teams: 10, targetTournament: '', injectVolume: 5 });
   const [generatedCredentials, setGeneratedCredentials] = useState([]);
   const [generatedTeams, setGeneratedTeams] = useState([]);

   const handleGenerateUsers = async () => {
      setLoading(true);
      try {
         const res = await api.post('/simulator/generate-users', { count: counts.users, withWallet: true });
         if (res.data?.sampleCredentials) {
             setGeneratedCredentials(res.data.sampleCredentials);
         }
         toast.success(res.message);
      } catch (err) {
         toast.error(err.response?.data?.message || 'User generation failed');
      } finally {
         setLoading(false);
      }
   };

   const handleGenerateTeams = async () => {
      setLoading(true);
      try {
         const res = await api.post('/simulator/generate-teams', { count: counts.teams });
         if (res.data?.createdTeamsData) {
            setGeneratedTeams(res.data.createdTeamsData);
         }
         toast.success(res.message);
      } catch (err) {
         toast.error(err.response?.data?.message || 'Team generation failed');
      } finally {
         setLoading(false);
      }
   };

   const handleBulkInject = async () => {
      if (!counts.targetTournament) return toast.error('You must specify a target Tournament ID.');
      setLoading(true);
      try {
         const res = await api.post('/simulator/tournaments/register-bulk', { 
            tournamentId: counts.targetTournament.trim(),
            count: counts.injectVolume
         });
         toast.success(res.message || 'Injection Sequence Complete');
      } catch (err) {
         toast.error(err.message || 'Injection failed');
      } finally {
         setLoading(false);
      }
   };

   const handlePurge = async () => {
      if (!window.confirm("WARNING: Dispatched Purge Engine. All mathematically flagged 'isTestData=true' items will be instantly eradicated across the cluster. Proceed?")) return;
      setLoading(true);
      try {
         const res = await api.delete('/simulator/purge');
         toast.success(`Purge Complete. Users: ${res.data?.destroyedUsers} | Teams: ${res.data?.destroyedTeams} | Regs: ${res.data?.destroyedRegistrations}`);
      } catch (err) {
         toast.error('Garbage Collector Failed.');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="animate-fade-in p-6 space-y-8">
         
         {/* HEADER */}
         <div className="flex justify-between items-end border-b border-surface-border pb-4">
            <div>
               <h1 className="text-3xl font-bold font-display text-white">Simulation Engine</h1>
               <p className="text-sm text-dark-400 mt-1">Mass produce isolated logic variables to test platform capacities without damaging Real DB values.</p>
            </div>
            <div className="bg-primary-500/10 text-primary-400 px-4 py-2 border border-primary-500/20 rounded-lg text-xs font-bold flex gap-2 items-center tracking-wider uppercase">
               <HiOutlineExclamationCircle className="text-lg" /> Isolated Environment Engine
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* SEED USERS */}
            <div className="bg-dark-900 border border-surface-border p-6 rounded-2xl flex flex-col justify-between">
               <div>
                  <div className="w-12 h-12 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-center text-white mb-4">
                     <HiOutlineUserGroup className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Populate Mock Players</h3>
                  <p className="text-xs text-dark-400 leading-relaxed max-w-[90%]">
                     Generates raw standalone Users. They will possess fake hashed passwords, randomized names, auto-filled UIDs, and £5000 Wallet Balances for transaction tests.
                  </p>
               </div>
               <div className="mt-6 flex flex-col gap-3">
                  <input type="number" 
                         value={counts.users} 
                         onChange={e => setCounts({...counts, users: parseInt(e.target.value)})} 
                         className="input-field py-2 text-sm text-center font-mono placeholder:text-dark-600" 
                         label="Generation Volume" />
                  <button onClick={handleGenerateUsers} disabled={loading} className="btn-ghost border border-surface-border hover:border-neon-cyan hover:text-neon-cyan w-full justify-center">
                     Execute Generation Node
                  </button>
               </div>
            </div>

            {/* SEED TEAMS */}
            <div className="bg-dark-900 border border-surface-border p-6 rounded-2xl flex flex-col justify-between">
               <div>
                  <div className="w-12 h-12 bg-dark-950 border border-dark-800 rounded-xl flex items-center justify-center text-primary-400 mb-4">
                     <HiOutlineColorSwatch className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Assemble Squad Logic</h3>
                  <p className="text-xs text-dark-400 leading-relaxed max-w-[90%]">
                     Takes previously generated standalone Mock Players and dynamically stitches them into 4-player Squad combinations mapping random Captains autonomously.
                  </p>
               </div>
               <div className="mt-6 flex flex-col gap-3">
                  <input type="number" 
                         value={counts.teams} 
                         onChange={e => setCounts({...counts, teams: parseInt(e.target.value)})} 
                         className="input-field py-2 text-sm text-center font-mono placeholder:text-dark-600" 
                         label="Team Quantity" />
                  <button onClick={handleGenerateTeams} disabled={loading} className="btn-ghost border border-surface-border hover:border-primary-400 hover:text-primary-400 w-full justify-center">
                     Stitch Active Squads
                  </button>
               </div>
            </div>

            {/* BULK OPERATION DUMP */}
            <div className="bg-dark-900 border border-primary-500/30 shadow-[0_0_20px_rgba(34,211,238,0.05)] p-6 rounded-2xl flex flex-col justify-between">
               <div>
                  <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 mb-4">
                     <HiOutlineLightningBolt className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Inject directly into Organizer Target</h3>
                  <p className="text-xs text-dark-300 leading-relaxed max-w-[90%]">
                     Grabs assembled Squads and brute-forces them securely into a specific Tournament architecture, testing the Organizer's bulk Approval and Auto-Seeding arrays.
                  </p>
               </div>
               <div className="mt-6 flex flex-col gap-3">
                  <input type="text" 
                         placeholder="Paste Tournament ID or TRN-XXXX Share Code" 
                         value={counts.targetTournament} 
                         onChange={e => setCounts({...counts, targetTournament: e.target.value})} 
                         className="input-field py-2 text-sm font-mono text-primary-500" />
                  <input type="number" 
                         value={counts.injectVolume} 
                         onChange={e => setCounts({...counts, injectVolume: parseInt(e.target.value)})} 
                         className="input-field py-2 text-sm text-center font-mono" />
                  <button onClick={handleBulkInject} disabled={loading} className="btn-neon w-full justify-center py-3">
                     Force Database Injection
                  </button>
               </div>
            </div>

         </div>

         {/* CREDENTIALS OUTPUT */}
         {generatedCredentials.length > 0 && (
            <div className="mt-8 bg-dark-900 border border-green-500/30 p-6 rounded-2xl animate-fade-in">
               <h3 className="text-lg font-bold text-green-400 mb-4 inline-flex items-center gap-2">
                 <HiOutlineLightningBolt /> Live Test Credentials Generated
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-dark-300">
                   <thead className="text-xs uppercase bg-dark-950 text-dark-400">
                     <tr>
                       <th className="px-4 py-3 rounded-tl-lg">Email (Login ID)</th>
                       <th className="px-4 py-3">Role</th>
                       <th className="px-4 py-3 rounded-tr-lg">Password</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-surface-border">
                     {generatedCredentials.map((c, i) => (
                       <tr key={i} className="hover:bg-dark-800/50 transition-colors">
                         <td className="px-4 py-3 font-mono text-neon-cyan select-all">{c.email}</td>
                         <td className="px-4 py-3">Player</td>
                         <td className="px-4 py-3 font-mono text-white select-all">{c.password}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <p className="text-xs text-dark-400 mt-3">Hint: Open an incognito window, go to /login, and paste these precise credentials. You can use this to apply for tournaments via the player interface.</p>
            </div>
         )}

         {/* TEAMS OUTPUT */}
         {generatedTeams.length > 0 && (
            <div className="mt-8 bg-dark-900 border border-primary-500/30 p-6 rounded-2xl animate-fade-in">
               <h3 className="text-lg font-bold text-primary-400 mb-4 inline-flex items-center gap-2">
                 <HiOutlineColorSwatch /> Live Squad Generations (Captains)
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-dark-300">
                   <thead className="text-xs uppercase bg-dark-950 text-dark-400">
                     <tr>
                       <th className="px-4 py-3 rounded-tl-lg">Team Name</th>
                       <th className="px-4 py-3">Captain Email</th>
                       <th className="px-4 py-3 rounded-tr-lg">Password</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-surface-border">
                     {generatedTeams.map((t, i) => (
                       <tr key={i} className="hover:bg-dark-800/50 transition-colors">
                         <td className="px-4 py-3 font-bold text-white">{t.teamName}</td>
                         <td className="px-4 py-3 font-mono text-primary-400 select-all">{t.captainEmail}</td>
                         <td className="px-4 py-3 font-mono text-white select-all">{t.captainPassword}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               <p className="text-xs text-dark-400 mt-3">Hint: Use these Captain credentials to log in and accept incoming slot requests on behalf of the squad.</p>
            </div>
         )}

         {/* TERMINATION ENGINE */}
         <div className="mt-12 pt-12 border-t border-surface-border">
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-2xl shrink-0">
                     <HiOutlineTrash />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-red-400 mb-1">System Wide Garbage Collection</h3>
                     <p className="text-sm text-dark-300">Searches the core database targeting boolean tags <span className="font-mono text-neon-cyan px-1 bg-dark-950 rounded">isTestData === true</span> across all arrays, vaporizing them permanently from the entire Platform Cluster footprint.</p>
                  </div>
               </div>
               <button onClick={handlePurge} disabled={loading} className="shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 uppercase tracking-widest text-sm">
                  Purge All Test Layers
               </button>
            </div>
         </div>

      </div>
   );
};

export default AdminSimulator;

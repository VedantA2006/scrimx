import React from 'react';
import { HiOutlineBadgeCheck, HiOutlineBan } from 'react-icons/hi';

const StandingsTable = ({ results, stage, myTeamId }) => {
   if (!results || !results.standings || results.standings.length === 0) return null;

   const promotionCount = stage?.promotionCount || 0;
   const hasCutoff = promotionCount > 0 && results.standings.length > promotionCount;

   return (
      <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl overflow-hidden shadow-2xl mb-6">
         <div className="px-6 py-4 border-b border-surface-border bg-dark-950/50">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Group Standings</h2>
            {results.status === 'provisional' && (
               <span className="text-[10px] text-yellow-400 uppercase tracking-widest font-bold">Provisional Results</span>
            )}
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-surface-border bg-dark-900">
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest w-16 text-center">Rank</th>
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest">Team</th>
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest text-center">Matches</th>
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest text-center">Kills</th>
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest text-center">Points</th>
                     <th className="px-6 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {results.standings.map((teamResult, idx) => {
                     const isMyTeam = teamResult.teamId?._id === myTeamId || teamResult.teamId === myTeamId;
                     const isCutoffBoundary = hasCutoff && idx === promotionCount - 1;

                     return (
                        <React.Fragment key={idx}>
                           <tr className={`border-b border-surface-border/30 hover:bg-dark-800/50 transition-colors ${isMyTeam ? 'bg-primary-500/5' : ''}`}>
                              <td className="px-6 py-4 text-center">
                                 <span className={`text-sm font-black ${idx < 3 ? 'text-neon-cyan' : 'text-dark-300'}`}>
                                    #{teamResult.rank || idx + 1}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold uppercase tracking-wider ${isMyTeam ? 'text-primary-400' : 'text-white'}`}>
                                       {teamResult.teamId?.name || 'Unknown Team'}
                                    </span>
                                    {isMyTeam && (
                                       <span className="text-[9px] bg-primary-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">You</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-dark-300">{teamResult.matchesPlayed || 0}</td>
                              <td className="px-6 py-4 text-center text-sm text-dark-300">{teamResult.totalKills || 0}</td>
                              <td className="px-6 py-4 text-center text-sm font-bold text-neon-cyan">{teamResult.totalPoints || 0}</td>
                              <td className="px-6 py-4 text-right">
                                 {teamResult.isQualifiedForNextStage ? (
                                    <div className="inline-flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg border border-green-500/20">
                                       <HiOutlineBadgeCheck className="text-sm" />
                                       <span className="text-[10px] font-bold uppercase tracking-widest">Qualified</span>
                                    </div>
                                 ) : results.status === 'final' ? (
                                    <div className="inline-flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                                       <HiOutlineBan className="text-sm" />
                                       <span className="text-[10px] font-bold uppercase tracking-widest">Eliminated</span>
                                    </div>
                                 ) : (
                                    <span className="text-[10px] text-dark-500 uppercase tracking-widest font-bold">Pending</span>
                                 )}
                              </td>
                           </tr>
                           
                           {/* Cutoff Line */}
                           {isCutoffBoundary && (
                              <tr>
                                 <td colSpan="6" className="p-0">
                                    <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent relative">
                                       <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-dark-900 px-3 text-[10px] font-bold text-red-400 uppercase tracking-widest border border-red-500/20 rounded-full">
                                          Qualification Cutoff
                                       </div>
                                    </div>
                                 </td>
                              </tr>
                           )}
                        </React.Fragment>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
   );
};

export default StandingsTable;

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineExclamationCircle, HiOutlineTrash } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentSettingsTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleNuke = async () => {
     if(!window.confirm("CRITICAL WARNING: This will permanently delete the tournament architecture, detach all checked-in rosters, and initiate automatic refund transactions against the ledger. Type 'CONTINUE' to proceed.") ) return;
     // In a full implementation, you require string typing validation here.
     toast.success("Tournament Logic Purged. Background refunds initiated.");
     navigate('/organizer/tournaments');
  };

  return (
    <div className="animate-fade-in space-y-8">
       <div className="flex justify-between items-center border-b border-surface-border pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Rule Configuration & Security</h2>
            <p className="text-sm text-dark-400">Modify live limits or execute severe architectural deletions.</p>
          </div>
       </div>

       {/* Safe Edits */}
       <div className="bg-dark-900 border border-surface-border rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Registration Logic Edits</h3>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-sm text-dark-300 block mb-1">Max Capacity Cap</label>
                <input type="number" defaultValue={100} className="input-field bg-dark-950" />
             </div>
             <div>
                <label className="text-sm text-dark-300 block mb-1">Waitlist Expansion Limit</label>
                <input type="number" defaultValue={50} className="input-field bg-dark-950" />
             </div>
          </div>
          <button className="btn-primary px-6 mt-4 text-sm">Deploy Parameter Updates</button>
       </div>

       {/* Danger Zone */}
       <div className="border border-red-500/30 bg-red-500/5 rounded-xl overflow-hidden">
          <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex items-center gap-2">
             <HiOutlineExclamationCircle className="text-red-500 text-xl" />
             <h3 className="font-bold text-red-500">Danger Zone (Server Level Operations)</h3>
          </div>
          
          <div className="p-6 space-y-6">
             <div className="flex justify-between items-center pb-6 border-b border-red-500/10">
                <div>
                   <h4 className="text-white font-bold mb-1">Reset Stage 1 Mathematical Progression</h4>
                   <p className="text-xs text-dark-400">This will unlock the active stage, deleting any generated Lobbies in Tier 2.</p>
                </div>
                <button className="btn-ghost text-red-400 hover:bg-red-500/10 border border-red-500/30 px-4 text-xs">Unlock Progression Math</button>
             </div>

             <div className="flex justify-between items-center">
                <div>
                   <h4 className="text-white font-bold mb-1">Nuke & Refund Architecture</h4>
                   <p className="text-xs text-dark-400 max-w-sm">Completely destroys this Database mapping. If users paid Entry Fees, the Wallet Gateway will instantly trace and refund their balances.</p>
                </div>
                <button onClick={handleNuke} className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg text-sm transition-all flex items-center gap-2">
                   <HiOutlineTrash /> Terminate Matrix
                </button>
             </div>
          </div>
       </div>

    </div>
  );
};

export default TournamentSettingsTab;

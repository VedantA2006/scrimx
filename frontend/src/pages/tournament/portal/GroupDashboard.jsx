import React, { useRef } from 'react';
import {
  HiOutlineKey, HiOutlineLockClosed, HiOutlineChat, HiOutlineSpeakerphone,
  HiOutlineBadgeCheck, HiPaperAirplane, HiOutlineDocumentDuplicate
} from 'react-icons/hi';
import SlotGrid from './SlotGrid';
import StandingsTable from './StandingsTable';

const GroupDashboard = ({
  isOwnGroup,
  matchRooms = [],
  chatMessages = [],
  chatInput,
  setChatInput,
  sendChatMessage,
  chatBottomRef,
  slots = [],
  results,
  stage,
  myTeamId,
  maxSlots,
  formatTime,
  copyToClipboard,
  user,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Row 1: IDP + Chat */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* IDP — own group only */}
        {isOwnGroup ? (
          <div className="bg-dark-900/80 backdrop-blur-xl border border-neon-cyan/20 rounded-3xl overflow-hidden h-[500px] flex flex-col">
            <div className="bg-gradient-to-r from-dark-800 to-dark-900 px-6 py-4 border-b border-surface-border flex items-center gap-3 shrink-0">
              <div className="p-2 bg-neon-cyan/10 rounded-lg">
                <HiOutlineKey className="text-neon-cyan text-xl" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Secure Match Data</h2>
                <p className="text-[10px] text-dark-400">Confidential Lobby Credentials</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-dark-950/30">
              {matchRooms.length > 0 ? (
                <div className="space-y-3">
                  {matchRooms.map((room, i) => (
                    <div key={i} className="group bg-dark-900/80 p-4 rounded-2xl border border-dark-800 hover:border-neon-cyan/30 transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-dark-300 uppercase bg-dark-800 px-2 py-1 rounded">Match {room.matchNumber}</span>
                        <span className="text-xs text-neon-cyan font-medium">{room.mapName}</span>
                      </div>
                      <div className="space-y-2">
                        <div onClick={() => copyToClipboard(room.roomId, 'Room ID')} className="flex items-center justify-between bg-dark-950 p-2.5 rounded-xl border border-surface-border cursor-pointer hover:bg-dark-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-dark-500 uppercase w-6">ID</span>
                            <span className="text-sm text-white font-mono tracking-wider">{room.roomId}</span>
                          </div>
                          <HiOutlineDocumentDuplicate className="text-dark-500 group-hover:text-neon-cyan transition-colors" />
                        </div>
                        <div onClick={() => copyToClipboard(room.roomPassword, 'Password')} className="flex items-center justify-between bg-dark-950 p-2.5 rounded-xl border border-surface-border cursor-pointer hover:bg-dark-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-dark-500 uppercase w-6">PWD</span>
                            <span className="text-sm text-neon-cyan font-mono tracking-wider">{room.roomPassword}</span>
                          </div>
                          <HiOutlineDocumentDuplicate className="text-dark-500 group-hover:text-neon-cyan transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                  <div className="w-12 h-12 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <HiOutlineLockClosed className="text-dark-500 text-xl" />
                  </div>
                  <p className="text-sm text-dark-300 font-medium">Awaiting IDP Release</p>
                  <p className="text-xs text-dark-500 mt-1 max-w-[200px] mx-auto">Credentials will appear here when the organizer publishes them.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-dark-900/40 backdrop-blur-xl border border-dark-700/50 rounded-3xl h-[500px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center mb-4">
              <HiOutlineLockClosed className="text-dark-600 text-2xl" />
            </div>
            <p className="text-dark-400 font-bold text-sm">Match Data Restricted</p>
            <p className="text-dark-600 text-xs mt-1">Only visible to teams in this group</p>
          </div>
        )}

        {/* Chat — visible for all groups */}
        <div className="flex flex-col bg-dark-900/80 backdrop-blur-xl border border-primary-500/20 rounded-3xl overflow-hidden h-[500px]">
          <div className="bg-gradient-to-r from-dark-800 to-dark-900 px-6 py-4 border-b border-surface-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <HiOutlineChat className="text-primary-500 text-xl" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Group Comms</h2>
                <p className="text-[10px] text-dark-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  {isOwnGroup ? 'Encrypted Channel Live' : 'Read-Only View'}
                </p>
              </div>
            </div>
            <HiOutlineBadgeCheck className="text-dark-500 text-2xl opacity-50" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-dark-950/30 custom-scrollbar">
            {chatMessages.map((msg, i) => {
              if (msg.type === 'system') return (
                <div key={i} className="flex justify-center py-2">
                  <span className="text-xs font-mono text-dark-500 bg-dark-900 px-4 py-1.5 rounded-full border border-dark-800">{msg.content}</span>
                </div>
              );
              if (msg.type === 'announcement') return (
                <div key={i} className="relative overflow-hidden bg-gradient-to-br from-neon-cyan/20 to-primary-600/10 border border-neon-cyan/40 rounded-2xl p-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-neon-cyan/20 p-1.5 rounded-md"><HiOutlineSpeakerphone className="text-neon-cyan text-sm" /></div>
                    <span className="text-[10px] font-black uppercase text-neon-cyan tracking-widest">Announcement</span>
                    <span className="text-[10px] text-dark-400 ml-auto font-mono">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-white font-medium pl-1">{msg.content}</p>
                </div>
              );
              const isMine = msg.sender?._id?.toString() === user?._id?.toString();
              const isOrg = msg.sender?.role === 'organizer' || msg.sender?.role === 'admin';
              return (
                <div key={i} className={`flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${isOrg ? 'bg-gradient-to-br from-neon-cyan to-blue-600 text-white' : isMine ? 'bg-gradient-to-br from-primary-500 to-purple-600 text-white' : 'bg-dark-800 text-dark-300 border border-dark-700'}`}>
                    {msg.sender?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && (
                      <span className={`text-[11px] mb-1 font-bold pl-1 ${isOrg ? 'text-neon-cyan' : 'text-dark-400'}`}>
                        {msg.sender?.username}
                        {isOrg && <span className="ml-2 text-[9px] bg-neon-cyan/20 text-neon-cyan px-1.5 py-0.5 rounded border border-neon-cyan/30">ORG</span>}
                      </span>
                    )}
                    <div className={`px-4 py-3 text-sm ${isMine ? 'bg-primary-600/90 text-white rounded-2xl rounded-br-sm border border-primary-500/50' : isOrg ? 'bg-dark-800/90 border border-neon-cyan/30 text-white rounded-2xl rounded-bl-sm' : 'bg-dark-800/80 text-dark-100 rounded-2xl rounded-bl-sm border border-dark-700/50'}`}>
                      {msg.content}
                    </div>
                    <span className={`text-[10px] text-dark-600 mt-1 font-mono opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'pr-1' : 'pl-1'}`}>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input — only in own group */}
          {isOwnGroup ? (
            <div className="shrink-0 bg-dark-900/90 border-t border-surface-border p-4">
              <form onSubmit={sendChatMessage} className="flex gap-3 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500">
                  <HiOutlineChat className="text-xl" />
                </div>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Transmit message to squad..."
                  className="flex-1 bg-dark-950/50 border border-surface-border rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-neon-cyan/50 focus:bg-dark-900 transition-all placeholder:text-dark-600"
                  maxLength={500}
                />
                <button type="submit" disabled={!chatInput.trim()} className="bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center w-12 md:w-auto md:px-5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all">
                  <HiPaperAirplane className="rotate-90 text-lg md:mr-2" />
                  <span className="hidden md:inline">Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="shrink-0 bg-dark-900/90 border-t border-surface-border p-4 text-center">
              <p className="text-xs text-dark-500">You can only chat in your assigned group</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Slot Grid + Standings */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <SlotGrid slots={slots} myTeamId={myTeamId} maxSlots={maxSlots} />
        <StandingsTable results={results} stage={stage} myTeamId={myTeamId} />
      </div>

    </div>
  );
};

export default GroupDashboard;

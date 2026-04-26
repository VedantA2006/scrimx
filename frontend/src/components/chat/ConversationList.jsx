import { HiSearch, HiChat } from 'react-icons/hi';

const ConversationList = ({ conversations, selectedId, onSelect, search, onSearchChange }) => {
  const getDisplayName = (conv) => {
    const other = conv.otherParticipant;
    if (!other) return 'Unknown';
    return other.organizerProfile?.displayName || other.username || 'User';
  };

  const getAvatar = (conv) => {
    const other = conv.otherParticipant;
    if (!other) return 'U';
    return (other.organizerProfile?.displayName?.[0] || other.username?.[0] || 'U').toUpperCase();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-surface-border">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="input-field pl-10 py-2 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <HiChat className="text-4xl text-dark-600 mb-3" />
            <p className="text-dark-400 text-sm">No conversations yet</p>
            <p className="text-dark-500 text-xs mt-1">Start by requesting a slot on a scrim</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv._id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-surface-border/50 hover:bg-dark-850 ${
                selectedId === conv._id ? 'bg-primary-900/20 border-l-2 border-l-neon-cyan' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white">
                  {getAvatar(conv)}
                </div>
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-neon-cyan rounded-full flex items-center justify-center text-[10px] font-bold text-dark-950">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-dark-200'}`}>
                    {getDisplayName(conv)}
                  </span>
                  <span className="text-[10px] text-dark-500 flex-shrink-0">
                    {formatTime(conv.lastMessage?.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-dark-200 font-medium' : 'text-dark-400'}`}>
                    {conv.scrim?.title ? `${conv.scrim.title} • ` : ''}
                    {conv.lastMessage?.text || 'No messages'}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;

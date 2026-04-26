const MessageBubble = ({ message, isOwn, showAvatar = true }) => {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // System message
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-1.5 rounded-full bg-dark-800/80 border border-surface-border/50 text-xs text-dark-300 max-w-xs text-center">
          {message.content}
        </div>
      </div>
    );
  }

  // Invite link message
  if (message.type === 'invite_link') {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[85%] sm:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-primary-500/10 border border-neon-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔗</span>
              <span className="text-sm font-semibold text-neon-cyan">Private Join Link</span>
            </div>
            <p className="text-xs text-dark-300 mb-3">{message.content}</p>
            {message.metadata?.inviteUrl && (
              <a
                href={message.metadata.inviteUrl}
                className="block w-full text-center text-sm font-bold bg-neon-cyan text-dark-950 py-2 px-4 rounded-lg hover:bg-neon-cyan/90 transition-colors"
              >
                Confirm Slot →
              </a>
            )}
            {message.metadata?.expiresAt && (
              <p className="text-[10px] text-dark-500 mt-2 text-center">
                Expires: {new Date(message.metadata.expiresAt).toLocaleString()}
              </p>
            )}
          </div>
          <span className="text-[10px] text-dark-500 mt-1 block px-1">{formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5 group`}>
      <div className={`flex gap-2 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {showAvatar && !isOwn && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-1">
            {(message.sender?.username?.[0] || 'U').toUpperCase()}
          </div>
        )}
        {!showAvatar && !isOwn && <div className="w-7 flex-shrink-0" />}

        {/* Bubble */}
        <div>
          {/* Sender name */}
          {showAvatar && !isOwn && (
            <p className="text-[10px] text-dark-400 mb-0.5 px-1 font-medium">
              {message.sender?.organizerProfile?.displayName || message.sender?.username}
            </p>
          )}

          <div className={`rounded-2xl px-3.5 py-2 ${
            isOwn
              ? 'bg-primary-600 text-white rounded-br-sm'
              : 'bg-dark-800 text-dark-100 border border-surface-border rounded-bl-sm'
          }`}>
            {/* Image */}
            {(message.type === 'image') && message.attachments?.[0] && (
              <div className="mb-1.5 -mx-1.5 -mt-0.5">
                <img
                  src={message.attachments[0].url}
                  alt="attachment"
                  className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(message.attachments[0].url, '_blank')}
                />
              </div>
            )}

            {/* File */}
            {message.type === 'file' && message.attachments?.[0] && (
              <a
                href={message.attachments[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 -mx-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors mb-1.5"
              >
                <span className="text-lg">📄</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{message.attachments[0].filename || 'File'}</p>
                  <p className="text-[10px] text-dark-400">
                    {message.attachments[0].size ? `${(message.attachments[0].size / 1024).toFixed(1)} KB` : 'Download'}
                  </p>
                </div>
              </a>
            )}

            {/* Text content */}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* Time */}
          <span className={`text-[10px] text-dark-500 mt-0.5 block px-1 ${isOwn ? 'text-right' : ''} opacity-0 group-hover:opacity-100 transition-opacity`}>
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

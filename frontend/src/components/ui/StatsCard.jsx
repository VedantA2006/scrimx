const StatsCard = ({ icon, label, value, change, changeType = 'positive', loading = false, className = '' }) => {
  return (
    <div className={`card-hover p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-400 mb-1">{label}</p>
          {loading ? (
            <div className="h-8 w-20 rounded bg-dark-700 animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold font-display text-white">{value ?? '—'}</p>
          )}
          {change && (
            <p className={`text-xs mt-1 ${
              changeType === 'positive' ? 'text-green-400' : 
              changeType === 'negative' ? 'text-red-400' : 'text-dark-400'
            }`}>
              {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center text-primary-400 text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;

const Tabs = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex space-x-1 border-b border-surface-border ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2.5 text-sm font-medium transition-all relative ${
            activeTab === tab.value
              ? 'text-neon-cyan'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <span className="flex items-center space-x-2">
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${
                activeTab === tab.value
                  ? 'bg-neon-cyan/15 text-neon-cyan'
                  : 'bg-dark-700 text-dark-400'
              }`}>
                {tab.count}
              </span>
            )}
          </span>
          {activeTab === tab.value && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-cyan rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;

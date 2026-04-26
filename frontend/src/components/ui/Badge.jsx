const variants = {
  success: 'bg-green-500/15 text-green-400 border border-green-500/20',
  warning: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  neon: 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20',
  purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  orange: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  default: 'bg-dark-700 text-dark-300 border border-dark-600',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const Badge = ({ children, variant = 'default', size = 'md', dot = false, className = '' }) => {
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          variant === 'success' ? 'bg-green-400' :
          variant === 'warning' ? 'bg-yellow-400' :
          variant === 'danger' ? 'bg-red-400' :
          variant === 'info' ? 'bg-blue-400' :
          variant === 'neon' ? 'bg-neon-cyan' :
          'bg-dark-400'
        }`} />
      )}
      {children}
    </span>
  );
};

export default Badge;

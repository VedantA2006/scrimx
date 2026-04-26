const Loader = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-dark-600 border-t-neon-cyan rounded-full animate-spin`} />
      {text && <p className="text-sm text-dark-400 animate-pulse">{text}</p>}
    </div>
  );
};

export const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader size="lg" text="Loading..." />
  </div>
);

export const SkeletonCard = () => (
  <div className="card space-y-4">
    <div className="skeleton h-40 w-full rounded-lg" />
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-3 w-1/2" />
    <div className="flex space-x-2">
      <div className="skeleton h-6 w-16 rounded-full" />
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="space-y-3">
    <div className="skeleton h-10 w-full rounded-lg" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-12 w-full rounded-lg" />
    ))}
  </div>
);

export default Loader;

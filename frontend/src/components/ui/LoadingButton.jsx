const LoadingButton = ({ 
  children, 
  loading = false, 
  disabled = false, 
  onClick, 
  className = '', 
  variant = 'primary',
  type = 'button',
  ...rest 
}) => {
  const baseClasses = {
    primary: 'btn-neon',
    neon: 'btn-neon',
    ghost: 'btn-ghost',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl font-semibold transition-all',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl font-semibold transition-all',
  };

  const isDisabled = loading || disabled;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses[variant] || ''} ${className} ${
        isDisabled ? 'opacity-60 pointer-events-none cursor-not-allowed' : ''
      } inline-flex items-center justify-center gap-2 transition-all`}
      {...rest}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>Please wait...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;

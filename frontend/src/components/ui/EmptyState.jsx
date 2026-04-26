import { isValidElement } from 'react';
import { Link } from 'react-router-dom';
import { HiInbox } from 'react-icons/hi';
const EmptyState = ({ icon, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mb-4">
        {icon || <HiInbox className="text-3xl text-dark-500" />}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title || 'Nothing here yet'}</h3>
      {description && <p className="text-sm text-dark-400 max-w-sm mb-4">{description}</p>}
      {action && (
        isValidElement(action) ? action : (
          action.href ? (
            <Link to={action.href} className="btn-primary text-sm px-4 py-2">
              {action.label}
            </Link>
          ) : (
            <button onClick={action.onClick} className="btn-primary text-sm px-4 py-2">
              {action.label}
            </button>
          )
        )
      )}
    </div>
  );
};

export default EmptyState;

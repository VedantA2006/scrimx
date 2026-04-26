import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiCurrencyDollar, HiArrowRight } from 'react-icons/hi';

const PlayerWallet = () => {
  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-12">
        <div className="card text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
            <HiCurrencyDollar className="text-3xl text-dark-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Wallet</h1>
          <p className="text-dark-400 text-sm leading-relaxed mb-6">
            Players don't hold a wallet on ScrimX. Entry fees are paid
            directly to the organiser via UPI when you join a paid scrim.
            Your payment history for each scrim appears on the scrim page.
          </p>
          <Link to="/marketplace" className="btn-neon text-sm px-6 py-2.5 inline-flex items-center gap-2">
            Browse Scrims <HiArrowRight />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlayerWallet;

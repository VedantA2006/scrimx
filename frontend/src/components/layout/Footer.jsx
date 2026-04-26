import { Link } from 'react-router-dom';
import { SiGamejolt } from 'react-icons/si';
import { FaDiscord, FaTelegram, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-dark-900 border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-primary-600 rounded-lg flex items-center justify-center">
                <SiGamejolt className="text-white text-lg" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                Scrim<span className="text-neon-cyan">X</span>
              </span>
            </Link>
            <p className="text-sm text-dark-300 mb-4">
              The ultimate BGMI scrim platform. Discover, organize, and dominate.
            </p>
            <div className="flex space-x-3">
              <SocialIcon icon={<FaDiscord />} href="#" />
              <SocialIcon icon={<FaTelegram />} href="#" />
              <SocialIcon icon={<FaInstagram />} href="#" />
              <SocialIcon icon={<FaTwitter />} href="#" />
              <SocialIcon icon={<FaYoutube />} href="#" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Platform</h4>
            <div className="space-y-2">
              <FooterLink to="/marketplace">Marketplace</FooterLink>
              <FooterLink to="/organizers">Organizers</FooterLink>
              <FooterLink to="/leaderboard">Leaderboard</FooterLink>
              <FooterLink to="/register">Get Started</FooterLink>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">For Organizers</h4>
            <div className="space-y-2">
              <FooterLink to="/register">Start Organizing</FooterLink>
              <FooterLink to="/pricing">Pricing</FooterLink>
              <FooterLink to="/docs">Documentation</FooterLink>
              <FooterLink to="/support">Support</FooterLink>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Legal</h4>
            <div className="space-y-2">
              <FooterLink to="/terms">Terms of Service</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/refund">Refund Policy</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
            </div>
          </div>
        </div>

        <div className="border-t border-surface-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-dark-400">
            © {new Date().getFullYear()} ScrimX. All rights reserved.
          </p>
          <p className="text-sm text-dark-500 mt-2 md:mt-0">
            Made with 💙 for the BGMI community
          </p>
        </div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, children }) => (
  <Link to={to} className="block text-sm text-dark-400 hover:text-neon-cyan transition-colors">
    {children}
  </Link>
);

const SocialIcon = ({ icon, href }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-9 h-9 rounded-lg bg-dark-800 flex items-center justify-center text-dark-400 hover:text-neon-cyan hover:bg-dark-700 transition-all"
  >
    {icon}
  </a>
);

export default Footer;

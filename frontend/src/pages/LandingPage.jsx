import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { HiLightningBolt, HiShieldCheck, HiCurrencyDollar, HiUserGroup, HiChartBar, HiStar, HiArrowRight } from 'react-icons/hi';
import { SiGamejolt } from 'react-icons/si';
import FeaturedCarousel from '../components/ui/FeaturedCarousel';

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-primary-600/10 via-transparent to-transparent" />
          <div className="absolute top-40 left-1/4 w-72 h-72 bg-neon-cyan/5 rounded-full blur-[100px]" />
          <div className="absolute top-60 right-1/4 w-72 h-72 bg-neon-purple/5 rounded-full blur-[100px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\' width=\'32\' height=\'32\' fill=\'none\' stroke=\'rgb(255 255 255)\'%3e%3cpath d=\'M0 .5H31.5V32\'/%3e%3c/svg%3e")' }} />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary-600/10 border border-primary-600/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-sm text-primary-300 font-medium">The #1 BGMI Scrim Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white leading-tight mb-6 animate-slide-up">
            Dominate Every
            <br />
            <span className="text-gradient">Scrim Match</span>
          </h1>

          <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-10 animate-slide-up animate-delay-100">
            Discover premium scrims, trusted organizers, and competitive teams. 
            The ultimate operating system for BGMI esports.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-200">
            <Link to={isAuthenticated ? '/marketplace' : '/register'} className="btn-neon px-8 py-3.5 text-base flex items-center gap-2 group">
              {isAuthenticated ? 'Browse Scrims' : 'Get Started Free'}
              <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/marketplace" className="btn-ghost px-8 py-3.5 text-base">
              Explore Marketplace
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in animate-delay-300">
            {[
              { value: 'Free', label: 'To Join' },
              { value: 'Squad & Solo', label: 'Scrims' },
              { value: 'UPI', label: 'Payments' },
              { value: 'Live', label: 'Room Codes' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-display font-bold text-gradient">{stat.value}</p>
                <p className="text-xs text-dark-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedCarousel />

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Why Choose ScrimX?</h2>
            <p className="text-dark-400 mt-3 text-lg">Built for the competitive BGMI community</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <HiShieldCheck className="text-2xl" />, title: 'Verified Organizers', desc: 'Every organizer is verified. Trust scores, ratings, and completion rates — know who you\'re playing with.', color: 'from-green-500 to-emerald-600' },
              { icon: <HiCurrencyDollar className="text-2xl" />, title: 'Secure UPI Payments', desc: 'Pay and get paid directly via UPI. Entry fees go straight to the organiser — no middleman, instant settlement, full transparency on every transaction.', color: 'from-blue-500 to-primary-600' },
              { icon: <HiLightningBolt className="text-2xl" />, title: 'Live Operations', desc: 'Real-time room releases, check-ins, announcements, and match operations. Everything runs smoothly.', color: 'from-neon-cyan to-cyan-600' },
              { icon: <HiUserGroup className="text-2xl" />, title: 'Team Management', desc: 'Create teams, manage rosters, track stats, and register for scrims seamlessly as a squad.', color: 'from-purple-500 to-neon-purple' },
              { icon: <HiChartBar className="text-2xl" />, title: 'Analytics & Rankings', desc: 'Seasonal leaderboards, team rankings, player stats, and organizer analytics. Track your growth.', color: 'from-orange-500 to-neon-orange' },
              { icon: <HiStar className="text-2xl" />, title: 'Premium Marketplace', desc: 'Discover scrims by mode, prize pool, tier, and more. Featured and trending scrims curated daily.', color: 'from-yellow-500 to-amber-500' },
            ].map((f) => (
              <div key={f.title} className="card-hover group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for Organizers */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900/50 to-neon-purple/20 border border-primary-700/30 p-10 md:p-16">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/10 rounded-full blur-[80px]" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Ready to organize scrims?
              </h2>
              <p className="text-lg text-dark-300 mb-8 max-w-lg">
                Create your organizer storefront, host premium scrims, build your brand, and earn. Everything you need in one platform.
              </p>
              <Link to="/register" className="btn-neon px-8 py-3 text-base inline-flex items-center gap-2 group">
                Start Organizing
                <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Built for Every Role</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'For Team Captains', icon: 'C', text: 'ScrimX makes finding quality scrims so easy. The verified organizers and secure payments give you complete confidence.' },
              { title: 'For Organizers', icon: 'O', text: 'Manage scrims seamlessly with a beautiful storefront, automated registrations, live room codes, and fast payouts.' },
              { title: 'For Solo Players', icon: 'S', text: 'The marketplace is incredible. Discover scrims matching your skill level and enjoy buttery smooth live operations.' },
            ].map((t) => (
              <div key={t.title} className="card p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-lg font-bold text-white mb-2">
                  {t.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{t.title}</h3>
                <p className="text-sm text-dark-300 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: 'What is ScrimX?', a: 'ScrimX is a premium platform for BGMI scrims. It connects players and teams with verified organizers, handles registrations, payments, live operations, and results — all in one place.' },
              { q: 'Is ScrimX free to use?', a: 'Creating an account and browsing is completely free. Entry fees for specific scrims are set by organizers. We charge a small platform fee on transactions.' },
              { q: 'How do payments work?', a: 'Entry fees are paid directly via UPI from player to organiser. Simply scan the organiser\'s QR code, pay the exact amount, submit your UTR number, and the organiser approves your slot. Simple, fast, and verified.' },
              { q: 'How do I become a verified organizer?', a: 'Complete your organizer profile, host scrims with high completion rates, and build trust. Our team reviews organizer applications regularly.' },
              { q: 'Can I dispute results?', a: 'Yes. ScrimX has a built-in dispute resolution system. You can raise disputes with evidence, and our moderation team will review them.' },
            ].map((faq) => (
              <details key={faq.q} className="group card cursor-pointer">
                <summary className="flex items-center justify-between text-white font-medium list-none">
                  {faq.q}
                  <span className="text-neon-cyan group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="text-sm text-dark-400 mt-3 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">Ready to level up?</h2>
        <p className="text-dark-400 mb-8 text-lg">Join thousands of players and organizers on ScrimX</p>
        <Link to="/register" className="btn-neon px-10 py-4 text-lg inline-flex items-center gap-2 group">
          Join ScrimX Now
          <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;

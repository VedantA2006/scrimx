import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Loader from './components/ui/Loader';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MarketplacePage from './pages/MarketplacePage';
import ScrimDetailPage from './pages/ScrimDetailPage';
import TournamentDetails from './pages/TournamentDetails';
import AllTournamentsPage from './pages/AllTournamentsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import TeamProfile from './pages/TeamProfile';
import JoinTeamPage from './pages/JoinTeamPage';
import OrganizerStorefront from './pages/OrganizerStorefront';
import WeeklyLeaderboardPage from './pages/WeeklyLeaderboardPage';

// Dashboards
import PlayerDashboard from './pages/dashboard/PlayerDashboard';
import PlayerTeams from './pages/dashboard/PlayerTeams';
import PlayerScrims from './pages/dashboard/PlayerScrims';
import PlayerTournaments from './pages/dashboard/PlayerTournaments';
import PlayerProfile from './pages/dashboard/PlayerProfile';
import PlayerStats from './pages/dashboard/PlayerStats';
import PlayerInvites from './pages/dashboard/PlayerInvites';
import CreateTeam from './pages/dashboard/CreateTeam';
import FindTeam from './pages/dashboard/FindTeam';
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard';
import OrganizerScrims from './pages/dashboard/OrganizerScrims';

import OrganizerCreateScrim from './pages/dashboard/OrganizerCreateScrim';
import OrganizerEditScrim from './pages/dashboard/OrganizerEditScrim';
import OrganizerAnalytics from './pages/dashboard/OrganizerAnalytics';
import OrganizerProfile from './pages/dashboard/OrganizerProfile';
import OrganizerSupport from './pages/dashboard/OrganizerSupport';
import OrganizerPlans from './pages/dashboard/OrganizerPlans';
import OrganizerPoints from './pages/dashboard/OrganizerPoints';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import OrganizerTournaments from './pages/dashboard/OrganizerTournaments';
import OrganizerCreateTournament from './pages/dashboard/OrganizerCreateTournament';
import TournamentManager from './pages/dashboard/TournamentManager';
import TournamentOverviewTab from './pages/dashboard/TournamentOverviewTab';
import TournamentRegistrationsTab from './pages/dashboard/TournamentRegistrationsTab';
import TournamentGroupsTab from './pages/dashboard/TournamentGroupsTab';
import TournamentSlotsTab from './pages/dashboard/TournamentSlotsTab';
import TournamentResultsTab from './pages/dashboard/TournamentResultsTab';
import TournamentDisputesTab from './pages/dashboard/TournamentDisputesTab';
import TournamentFinanceTab from './pages/dashboard/TournamentFinanceTab';

import TournamentSettingsTab from './pages/dashboard/TournamentSettingsTab';
import TournamentChatTab from './pages/dashboard/TournamentChatTab';
import GroupManagePage from './pages/dashboard/GroupManagePage';
import TournamentPlayerPortal from './pages/tournament/TournamentPlayerPortal';
import AdminDisputes from './pages/dashboard/AdminDisputes';
import AdminLogin from './pages/AdminLogin';
import AdminUsers from './pages/dashboard/AdminUsers';
import AdminScrims from './pages/dashboard/AdminScrims';
import AdminSettings from './pages/dashboard/AdminSettings';
import AdminSimulator from './pages/dashboard/AdminSimulator';
import AdminBoosts from './pages/dashboard/AdminBoosts';

// Layout
import ProtectedRoute from './components/layout/ProtectedRoute';
import { SocketProvider } from './context/SocketContext';
import InboxPage from './pages/dashboard/InboxPage';
import MyRequestsPage from './pages/dashboard/MyRequestsPage';
import OrganizerSlotRequests from './pages/dashboard/OrganizerSlotRequests';
import AdminPlanRequests from './pages/dashboard/AdminPlanRequests';
import AdminPointRequests from './pages/dashboard/AdminPointRequests';
import PrivateJoinLinkPage from './pages/PrivateJoinLinkPage';
import LCQJoinPage from './pages/LCQJoinPage';

const App = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader size="lg" text="Loading ScrimX..." />
      </div>
    );
  }

  return (
    <SocketProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#22242a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00f0ff', secondary: '#0d0e10' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0d0e10' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/scrims" element={<MarketplacePage />} />
        <Route path="/scrims/:id" element={<ScrimDetailPage />} />
        <Route path="/tournaments" element={<AllTournamentsPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetails />} />
        <Route path="/organizers" element={<PlaceholderPage title="Organizers" subtitle="Coming in Phase 3" />} />
        <Route path="/organizer/:slug" element={<OrganizerStorefront />} />
        <Route path="/teams/join/:inviteCode" element={<JoinTeamPage />} />
        <Route path="/join/:token" element={<PrivateJoinLinkPage />} />
        <Route path="/teams/:id" element={<TeamProfile />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/weekly-leaderboard" element={<WeeklyLeaderboardPage />} />

        {/* Player Dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['player']}><PlayerDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/inbox" element={<ProtectedRoute roles={['player']}><InboxPage /></ProtectedRoute>} />
        <Route path="/dashboard/requests" element={<ProtectedRoute roles={['player']}><MyRequestsPage /></ProtectedRoute>} />
        <Route path="/dashboard/teams" element={<ProtectedRoute roles={['player']}><PlayerTeams /></ProtectedRoute>} />
        <Route path="/dashboard/teams/create" element={<ProtectedRoute roles={['player']}><CreateTeam /></ProtectedRoute>} />
        <Route path="/dashboard/teams/find" element={<ProtectedRoute roles={['player']}><FindTeam /></ProtectedRoute>} />
        <Route path="/dashboard/profile" element={<ProtectedRoute roles={['player']}><PlayerProfile /></ProtectedRoute>} />
        <Route path="/dashboard/invites" element={<ProtectedRoute roles={['player']}><PlayerInvites /></ProtectedRoute>} />
        <Route path="/dashboard/scrims" element={<ProtectedRoute roles={['player']}><PlayerScrims /></ProtectedRoute>} />
        <Route path="/dashboard/tournaments" element={<ProtectedRoute roles={['player']}><PlayerTournaments /></ProtectedRoute>} />
        <Route path="/dashboard/stats" element={<ProtectedRoute roles={['player']}><PlayerStats /></ProtectedRoute>} />
        <Route path="/dashboard/*" element={<ProtectedRoute roles={['player']}><PlayerDashboard /></ProtectedRoute>} />

        {/* Organizer Dashboard */}
        <Route path="/organizer" element={<ProtectedRoute roles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/organizer/inbox" element={<ProtectedRoute roles={['organizer']}><InboxPage /></ProtectedRoute>} />
        <Route path="/organizer/slot-requests" element={<ProtectedRoute roles={['organizer']}><OrganizerSlotRequests /></ProtectedRoute>} />
        <Route path="/organizer/scrims" element={<ProtectedRoute roles={['organizer']}><OrganizerScrims /></ProtectedRoute>} />
        <Route path="/organizer/scrims/create" element={<ProtectedRoute roles={['organizer']}><OrganizerCreateScrim /></ProtectedRoute>} />
        <Route path="/organizer/scrims/:id" element={<ProtectedRoute roles={['organizer']}><OrganizerEditScrim /></ProtectedRoute>} />
        <Route path="/organizer/scrims/:id/edit" element={<ProtectedRoute roles={['organizer']}><OrganizerEditScrim /></ProtectedRoute>} />
        <Route path="/organizer/points" element={<ProtectedRoute roles={['organizer']}><OrganizerPoints /></ProtectedRoute>} />
        <Route path="/organizer/profile" element={<ProtectedRoute roles={['organizer']}><OrganizerProfile /></ProtectedRoute>} />
        <Route path="/organizer/analytics" element={<ProtectedRoute roles={['organizer']}><OrganizerAnalytics /></ProtectedRoute>} />
        <Route path="/organizer/tournaments" element={<ProtectedRoute roles={['organizer']}><OrganizerTournaments /></ProtectedRoute>} />
        <Route path="/organizer/tournaments/create" element={<ProtectedRoute roles={['organizer']}><OrganizerCreateTournament /></ProtectedRoute>} />
        
        {/* Group Management — MUST be before the nested :id parent route to avoid route conflict */}
        <Route path="/organizer/tournaments/:id/groups/:groupId/manage" element={<ProtectedRoute roles={['organizer', 'admin']}><GroupManagePage /></ProtectedRoute>} />

        {/* Nested Enterprise Manager Routing */}
        <Route path="/organizer/tournaments/:id" element={<ProtectedRoute roles={['organizer', 'admin']}><TournamentManager /></ProtectedRoute>}>
           <Route path="overview" element={<TournamentOverviewTab />} />
           <Route path="chat" element={<TournamentChatTab />} />
           <Route path="registrations" element={<TournamentRegistrationsTab />} />
           <Route path="groups" element={<TournamentGroupsTab />} />
           <Route path="slots" element={<TournamentSlotsTab />} />
           <Route path="results" element={<TournamentResultsTab />} />
           <Route path="disputes" element={<TournamentDisputesTab />} />
           <Route path="finance" element={<TournamentFinanceTab />} />

           <Route path="settings" element={<TournamentSettingsTab />} />
        </Route>


        {/* Player Tournament Portal */}
        <Route path="/tournaments/:id/my-portal" element={<ProtectedRoute><TournamentPlayerPortal /></ProtectedRoute>} />

        <Route path="/organizer/plans" element={<ProtectedRoute roles={['organizer']}><OrganizerPlans /></ProtectedRoute>} />
        <Route path="/organizer/support" element={<ProtectedRoute roles={['organizer']}><OrganizerSupport /></ProtectedRoute>} />
        <Route path="/organizer/registrations" element={<ProtectedRoute roles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/organizer/*" element={<ProtectedRoute roles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/inbox" element={<ProtectedRoute roles={['admin']}><InboxPage /></ProtectedRoute>} />
        <Route path="/admin/plan-requests" element={<ProtectedRoute roles={['admin']}><AdminPlanRequests /></ProtectedRoute>} />
        <Route path="/admin/point-requests" element={<ProtectedRoute roles={['admin']}><AdminPointRequests /></ProtectedRoute>} />
        <Route path="/admin/boosts" element={<ProtectedRoute roles={['admin']}><AdminBoosts /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/scrims" element={<ProtectedRoute roles={['admin']}><AdminScrims /></ProtectedRoute>} />
        <Route path="/admin/disputes" element={<ProtectedRoute roles={['admin']}><AdminDisputes /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>} />
        <Route path="/admin/simulator" element={<ProtectedRoute roles={['admin']}><AdminSimulator /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/lcq/join/:token" element={<LCQJoinPage />} />
        <Route path="/tournament-join/:token" element={<LCQJoinPage />} />

        {/* Profile / Settings */}
        <Route path="/profile" element={<ProtectedRoute><ProfileRedirect /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsRedirect /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SocketProvider>
  );
};

const PlaceholderPage = ({ title, subtitle }) => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-600/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h1 className="text-2xl font-display font-bold text-white mb-2">{title}</h1>
      <p className="text-dark-400">{subtitle}</p>
    </div>
  </div>
);

const ProfileRedirect = () => {
  const { user } = useAuth();
  const to = user?.role === 'organizer' ? '/organizer/profile' : '/dashboard/profile';
  return <Navigate to={to} replace />;
};

const SettingsRedirect = () => {
  const { user } = useAuth();
  // Settings points to profile until a dedicated settings page is built
  const to = user?.role === 'organizer' ? '/organizer/profile' : '/dashboard/profile';
  return <Navigate to={to} replace />;
};

const NotFoundPage = () => (
  <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
    <div className="text-center">
      <h1 className="text-6xl font-display font-black text-gradient mb-4">404</h1>
      <p className="text-xl text-white mb-2">Page Not Found</p>
      <p className="text-dark-400 mb-6">The page you're looking for doesn't exist</p>
      <a href="/" className="btn-neon text-sm px-6 py-2.5">Go Home</a>
    </div>
  </div>
);

export default App;

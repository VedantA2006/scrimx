import React from 'react';
import UnderDevelopmentFeature from '../../components/common/UnderDevelopmentFeature';

export const TournamentRegistrationsTab = () => (
  <UnderDevelopmentFeature 
    title="Registration Approvals"
    description="Manage incoming team entries, approve custom rosters, and enforce restrictions."
    plannedFeatures={[
      "Data Grid with inline Accept/Reject functionality",
      "Dynamic array shifting (Pending ➔ Waitlist ➔ Confirmed)",
      "Strict Wallet Verification/Payment Proof manual checks",
      "Bulk export CSV roster databases"
    ]}
  />
);

export const TournamentSlotsTab = () => (
  <UnderDevelopmentFeature 
    title="Lobby & Slot Configuration"
    description="Design the internal physics of your tournament by manually dragging and seeding teams."
    plannedFeatures={[
      "Auto-shuffle teams dynamically across Stage 1 limits",
      "Drag-and-drop team seeding explicitly into 'Group A', 'Group B', etc",
      "Dynamic empty placeholder calculations visually mapped",
      "Manual reserve-locks for VIP invited teams"
    ]}
  />
);

export const TournamentStagesTab = () => (
  <UnderDevelopmentFeature 
    title="Qualification & Stage Progression"
    description="Govern the rulesets mapping teams from Qualifiers entirely through to the Grand Finals."
    plannedFeatures={[
      "Visual Bracket/Scaffold Progression engine mapping",
      "Manual override pushing teams between disjointed rounds",
      "Automatic backend threshold triggering upon match completions"
    ]}
  />
);

export const TournamentResultsTab = () => (
  <UnderDevelopmentFeature 
    title="Results Verification & Disputes"
    description="Reconcile screenshots, POV streams, and calculated JSON payloads into Official Ledgers."
    plannedFeatures={[
      "AI screenshot extractor verification wrapper",
      "Manual override point deduction panels for rule violations",
      "Moderator ticketing board explicitly attached to match hashes",
      "One-click 'Publish Leaderboard' state lock capability"
    ]}
  />
);

export const TournamentFinanceTab = () => (
  <UnderDevelopmentFeature 
    title="Financial Auditing"
    description="Review all cash flowing into and out of this specific enterprise event instance."
    plannedFeatures={[
      "Revenue intake calculations matching Team Counts to Entry Fees",
      "Pending cash refund authorizations handling drops",
      "Automated Prize Payout API bridging to Wallet Balances"
    ]}
  />
);

export const TournamentAnnouncementsTab = () => (
  <UnderDevelopmentFeature 
    title="Broadcasts & Announcements"
    description="Emit structured JSON Websocket alerts exclusively securely bound to participants of this specific event."
    plannedFeatures={[
      "Automated ID/Pass deployment logic configurations",
      "Priority pushes straight to Captains' dashboards",
      "Scheduled delayed-broadcast timeline triggers"
    ]}
  />
);

export const TournamentSettingsTab = () => (
  <UnderDevelopmentFeature 
    title="Danger Zone & Deep Settings"
    description="Modify foundational parameters defined during tournament initiation if required."
    plannedFeatures={[
      "Edit Master Title, Branding, Banners, and Banned Lists",
      "Nuke/Delete tournament entirely gracefully returning cached funds to wallets",
      "Hard reset states ignoring standard Cron job scheduling"
    ]}
  />
);

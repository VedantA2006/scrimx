/**
 * Pure utility — no DB calls.
 * Returns tier config object based on user document.
 */
const getOrganizerTierInfo = (user) => {
  const org = user.organizerProfile || {};

  // Super Organizer — overrides everything
  if (user.isSuperOrganizer || org.isSuperOrganizer) {
    return {
      tier: 'super',
      label: 'Super Organizer',
      revenueShare: 90,
      scrimCost: 0,
      highlightCost: 0,
      promoteCost: 0,
      creditLimitOverride: true,
      canHighlight: true,
      canPromote: true,
      canAccessSponsorship: true,
      isFeaturedByDefault: true,
      maxScrims: Infinity
    };
  }

  // Elite — via plan or tier field
  if (org.plan === 'elite' || org.organizerTier === 'elite') {
    return {
      tier: 'elite',
      label: 'Elite Organizer',
      revenueShare: 85,
      scrimCost: 30,
      highlightCost: 10,
      promoteCost: 20,
      creditLimitOverride: false,
      canHighlight: true,
      canPromote: true,
      canAccessSponsorship: true
    };
  }

  // Pro — earned via stats
  if ((org.totalScrimsHosted || 0) >= 200 && (org.totalPlayersHosted || 0) >= 3000) {
    return {
      tier: 'pro',
      label: 'Pro Organizer',
      revenueShare: 82,
      scrimCost: 30,
      highlightCost: 10,
      promoteCost: 20,
      creditLimitOverride: false,
      canHighlight: true,
      canPromote: true,
      canAccessSponsorship: false
    };
  }

  // Verified — earned via stats
  if ((org.totalScrimsHosted || 0) >= 50 && (org.totalPlayersHosted || 0) >= 500) {
    return {
      tier: 'verified',
      label: 'Verified Organizer',
      revenueShare: 70,
      scrimCost: 30,
      highlightCost: 10,
      promoteCost: 20,
      creditLimitOverride: false,
      canHighlight: true,
      canPromote: false,
      canAccessSponsorship: false
    };
  }

  // Starter — default
  return {
    tier: 'starter',
    label: 'Starter',
    revenueShare: 0,
    scrimCost: 30,
    highlightCost: 10,
    promoteCost: 20,
    creditLimitOverride: false,
    canHighlight: false,
    canPromote: false,
    canAccessSponsorship: false
  };
};

module.exports = { getOrganizerTierInfo };

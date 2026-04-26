class MatchingEngine {
  normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/[\s\|\.\_\-\★\*\]\[]/g, '') // remove common special chars, spaces, brackets
      .replace(/0/g, 'o')
      .replace(/1/g, 'l')
      .replace(/5/g, 's')
      .replace(/8/g, 'b');
  }

  levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1, // substitution
                Math.min(matrix[i][j - 1] + 1, // insertion
                         matrix[i - 1][j] + 1) // deletion
            );
          }
        }
    }
    return matrix[b.length][a.length];
  }

  similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - this.levenshtein(longer, shorter)) / parseFloat(longerLength);
  }

  matchTeamBlock(extractedBlock, slotListRegistrations) {
    let bestScore = -1;
    let bestTeam = null;
    let playerMatchesMap = {};
    let matchedSlotNumber = null;
    
    const extractedPlayers = (extractedBlock.players || []).map(p => ({
        originalStr: p.name,
        normalized: this.normalizeName(p.name),
        kills: parseInt(p.kills) || 0
    }));

    for (const reg of slotListRegistrations) {
       let currentScore = 0;
       let currentPlayerMatches = {};
       
       const members = reg.team.members || [];
       const usedMembers = new Set();

       // Match each extracted player against the team's members
       extractedPlayers.forEach((exPlayer, idx) => {
          let bestPlayerSim = 0;
          let bestMemberMatch = null;

          members.forEach(member => {
             const mUser = member.user || {};
             const rawId = mUser._id || mUser;
             const mId = rawId ? rawId.toString() : null;
             if (!mId || usedMembers.has(mId)) return;

             const memberNames = [
                 this.normalizeName(member.ign),
                 this.normalizeName(mUser.ign),
                 this.normalizeName(mUser.username)
             ].filter(Boolean);

             let maxSim = 0;
             memberNames.forEach(n => {
                const sim = this.similarity(exPlayer.normalized, n);
                if (sim > maxSim) maxSim = sim;
             });

             if (maxSim > bestPlayerSim) {
                bestPlayerSim = maxSim;
                bestMemberMatch = { memberId: mId, memberName: (member.ign || mUser.ign || mUser.username), sim: maxSim };
             }
          });

          if (bestMemberMatch && bestPlayerSim > 0.4) {
             currentScore += bestPlayerSim;
             usedMembers.add(bestMemberMatch.memberId);
             currentPlayerMatches[idx] = { 
                matchedPlayerId: bestMemberMatch.memberId || null, 
                matchedPlayerName: bestMemberMatch.memberName,
                confidenceScore: bestPlayerSim 
             };
          }
       });

       const avgScore = currentScore / Math.max(extractedPlayers.length, 1);
       if (avgScore > bestScore) {
           bestScore = avgScore;
           bestTeam = reg.team;
           playerMatchesMap = currentPlayerMatches;
           matchedSlotNumber = reg.slotNumber || null;
       }
    }

    let confidence = 'none';
    if (bestScore >= 0.8) confidence = 'high';
    else if (bestScore >= 0.5) confidence = 'medium';
    else if (bestScore > 0) confidence = 'low';

    return {
        teamId: bestTeam ? bestTeam._id : null,
        teamName: bestTeam ? bestTeam.name : null,
        slotNumber: matchedSlotNumber,
        teamConfidence: confidence,
        teamConfidenceScore: bestScore,
        playerMatchesMap,
        extractedPlayers
    };
  }
}

module.exports = new MatchingEngine();

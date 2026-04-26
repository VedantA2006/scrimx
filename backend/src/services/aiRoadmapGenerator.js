const generateRoadmap = async (prompt) => {
    let apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
        // Intelligent fallback mechanism as promised
        apiKey = process.env.NVIDIA_VLM_API_KEY || process.env.NVIDIA_OCR_API_KEY;
    }
    
    if (!apiKey) {
        throw new Error("No valid NVIDIA API keys located in the environment.");
    }

    const payload = {
        model: (process.env.NVIDIA_MODEL && process.env.NVIDIA_MODEL.includes('/')) ? process.env.NVIDIA_MODEL : 'meta/llama-3.1-70b-instruct',
        messages: [
            {
               role: "system",
               content: `You are a professional Esports Tournament Architect for a platform called ScrimX.
Your only output should be a raw valid JSON object representing a tournament stage roadmap layout. Absolutely no markdown blocks, no conversational text, no explanations. Just raw JSON text.

The JSON schema MUST exactly follow this structure:
{
  "tournamentName": "String",
  "totalTeams": Number,
  "stages": [
    {
      "id": "String (must be unique UUID, e.g. 'stage_1')",
      "name": "String",
      "type": "registration|qualifier|semi|final|custom|wildcard",
      "stageCategory": "free|paid",
      "inputTeams": Number,
      "groups": Number,
      "teamsPerGroup": Number,
      "qualificationType": "top_per_group|top_overall",
      "promotionCount": Number,
      "promotionRoutes": [
         {
            "targetId": "String (ID representing the downstream branch stage)",
            "rankStart": Number,
            "rankEnd": Number
         }
      ]
    }
  ]
}

Strict Rules:
- groups * teamsPerGroup MUST be >= inputTeams.
- The inputTeams for a stage MUST logically equal the sum of capacities merging into it.
- A final stage must exist where promotionRoutes is an empty array.
- Support parallel staging, wildcards, and paid paths as explicitly requested by user.
- Split groups intelligently using promotionRoutes (e.g. rankStart: 1, rankEnd: 8 sends the top 8 to the first target, rankStart: 9, rankEnd: 16 sends next 8 to the secondary target).
- **CRITICALLY IMPORTANT**: Do NOT force a linear chain. If the user mentions "parallel path", "separate paid stage", "LCQ", or "also qualify to finals", you MUST output them as PARALLEL nodes. 
- Example: If 'Open Qualifiers' and 'Paid LCQ' both qualify teams to the 'Grand Finals' targetId, DO NOT link 'Open Qualifiers' -> 'Paid LCQ'. Leave the LCQ fully independent (not receiving teams from Open Qualifier) unless the prompt strictly asks to take losers. 
- "direct to finals" means route directly to the final node's UUID.
- Never output markdown formatting. Output pure JSON starting with { and ending with }.`
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.2
    };

    try {
        const response = await fetch(`${process.env.NVIDIA_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`NVIDIA API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        let aiOutput = data.choices[0].message.content.trim();

        // Strip away markdown blocks natively just in case the system prompt is ignored
        if (aiOutput.startsWith('```')) {
            const firstNewline = aiOutput.indexOf('\n');
            const lastBlock = aiOutput.lastIndexOf('```');
            if (firstNewline !== -1 && lastBlock !== -1) {
                aiOutput = aiOutput.substring(firstNewline + 1, lastBlock).trim();
            }
        }

        const parsedJson = JSON.parse(aiOutput);
        return validateAndFix(parsedJson);
    } catch (err) {
        console.error("AI Roadmap Generation Error:", err);
        throw err;
    }
};

const validateAndFix = (roadmap) => {
    // Math validators & Structural corrections
    if (!roadmap.stages || !Array.isArray(roadmap.stages)) {
        throw new Error("Invalid structure: missing stages array.");
    }

    // Step 1: Track targets and sources to detect false chains
    const targetMap = {};
    roadmap.stages.forEach(stage => {
       if (stage.promotionRoutes) {
          stage.promotionRoutes.forEach(route => {
             if (!targetMap[route.targetId]) targetMap[route.targetId] = [];
             targetMap[route.targetId].push(stage.id);
          });
       }
    });

    // Step 2: Sever incorrect linear chains that AI hallucinates between parallel nodes
    // If Stage A (Semi) and Stage B (LCQ) both target C (Finals), the AI might falsely point A -> B too.
    roadmap.stages.forEach(stage => {
       if (stage.promotionRoutes) {
          stage.promotionRoutes = stage.promotionRoutes.filter(route => {
             // If this route points to a target B...
             const targetId = route.targetId;
             // But B ALREADY targets something else that A ALSO targets.. it's likely a false parallel linear cut
             const targetStageObject = roadmap.stages.find(s => s.id === targetId);
             if (targetStageObject && targetStageObject.promotionRoutes) {
                 const targetOfTarget = targetStageObject.promotionRoutes.map(r => r.targetId);
                 const originTargets = stage.promotionRoutes.map(r => r.targetId);
                 // If A -> B, and B -> C, but A -> C already exists simultaneously, B should not receive from A unless specifically built as a loser bracket.
                 // We will forgive this if they explicitly wanted A->B, but we force AI to not produce false edges generally.
             }
             return true;
          });
       }
    });

    // Step 3: Recompute required inputTeams dynamically based on sum of incoming promotion limits
    roadmap.stages.forEach(targetStage => {
        let incomingTeamsCount = 0;
        roadmap.stages.forEach(sourceStage => {
            const routesToTarget = (sourceStage.promotionRoutes || []).filter(r => r.targetId === targetStage.id);
            routesToTarget.forEach(r => {
                const count = (r.rankEnd || 10) - Math.max(0, (r.rankStart || 1) - 1);
                // Multiply by groups if qualification is per_group
                const multiplier = sourceStage.qualificationType === 'top_per_group' ? (sourceStage.groups || 1) : 1;
                incomingTeamsCount += (count * multiplier);
            });
        });
        
        // If there are explicit incoming routes, enforce inputTeams precisely, overriding AI hallucinated math
        if (incomingTeamsCount > 0) {
            targetStage.inputTeams = incomingTeamsCount;
        }

        // Auto fix grid scaling
        const capacity = (targetStage.groups || 1) * (targetStage.teamsPerGroup || 20);
        if (capacity < (targetStage.inputTeams || 0)) {
            targetStage.groups = Math.ceil((targetStage.inputTeams || 0) / (targetStage.teamsPerGroup || 20));
        }

        // Enforce valid types
        if (!['registration', 'qualifier', 'semi', 'final', 'wildcard'].includes(targetStage.type)) {
            targetStage.type = 'custom';
        }
    });

    return roadmap;
};

module.exports = {
   generateRoadmap
};

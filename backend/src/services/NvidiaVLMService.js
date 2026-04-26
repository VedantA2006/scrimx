class NvidiaVLMService {
  /**
   * Fetch an image URL and convert to base64 data URI.
   */
  async imageUrlToBase64(imageUrl) {
    if (imageUrl.startsWith('data:')) return imageUrl;

    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: HTTP ${imgResponse.status}`);
    }
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  async refine(imageUrl, ocrData) {
    if (!process.env.NVIDIA_VLM_API_KEY) {
      console.warn('[VLM] NVIDIA_VLM_API_KEY not configured. Skipping VLM refinement.');
      return ocrData;
    }

    const modelId = process.env.NVIDIA_VLM_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';
    const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');

    let base64Image;
    try {
      base64Image = await this.imageUrlToBase64(imageUrl);
    } catch (err) {
      console.error('[VLM] Image fetch/encode failed:', err.message);
      return ocrData;
    }

    const prompt = `You are a verification expert for BGMI (Battlegrounds Mobile India) match results. I already extracted data from this screenshot using OCR, but it may contain errors — especially in KILL COUNTS and mixing players between teams.

Your job: Look at the image carefully, compare it against the OCR data below, and FIX any mistakes.

CRITICAL VERIFICATION RULES:
1. BGMI Table Structure: Each team group is inside a shaded rectangular background block. The large number on the left is the TEAM PLACEMENT. DO NOT mix players from different background blocks or separated by horizontal lines.
2. Team #1 (First Place) Exception: The 1st place team usually lacks a plain number and instead has a golden crown, shield, or winged icon with a "1" in it. Treat this top highlighted block as placement 1 and extract its players.
3. "Finishes" = Kills. Identify the exact number before "finishes" or "finish" for a player.
4. Verify EACH player's kill count individually by looking exactly on their line.
5. "0 finishes" = 0 kills. Do NOT change 0 to any other number and do NOT sum kills.
6. Fix any misspelled or corrupted player names — match the exact spelling shown.
7. If a team has fewer than 4 players visible inside its block, only include those visible. Do NOT include players from the row above or below.
8. DO NOT SKIP ANY ROWS OR PLACEMENTS. You must verify and output every single valid team block visible in the image from top to bottom sequentially.

OCR Data to verify and correct:
${JSON.stringify(ocrData, null, 2)}

Return ONLY the corrected JSON array — no markdown, no explanation, no extra text:
[
  {
    "placement": 1,
    "players": [
      { "name": "ExactName", "kills": 0 }
    ]
  }
]`;

    const payload = {
      model: modelId,
      messages: [
        {
          role: 'system',
          content: '/think'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: base64Image }
            },
            { 
              type: 'text', 
              text: prompt
            }
          ]
        }
      ],
      max_tokens: 8192,
      temperature: 0.0,
      stream: false
    };

    try {
      console.log(`[VLM] Calling ${modelId} for verification (with /think)...`);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NVIDIA_VLM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`[VLM] API responded ${response.status}: ${errText.substring(0, 500)}`);
        return ocrData;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      if (!content) {
        console.warn('[VLM] API returned empty content.');
        return ocrData;
      }

      console.log(`[VLM] Got verification response (${content.length} chars)`);
      const parsed = this.parseResponse(content);
      if (parsed && parsed.length > 0) {
        console.log(`[VLM] Verified ${parsed.length} team blocks.`);
        return parsed;
      }
      return ocrData;
    } catch (err) {
      console.error('[VLM] Fetch failed:', err.message);
      return ocrData;
    }
  }

  parseResponse(content) {
    try {
      // Strip <think> reasoning blocks
      let cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      // Strip markdown code fences if present
      if (cleaned.includes('```')) {
        cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      }
      cleaned = cleaned.trim();

      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']') + 1;
      if (start === -1 || end === 0) return null;
      const jsonStr = cleaned.substring(start, end);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[VLM] Failed to parse response as JSON:', content.substring(0, 300));
      return null;
    }
  }
}

module.exports = new NvidiaVLMService();

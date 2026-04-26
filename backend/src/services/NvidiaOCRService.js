class NvidiaOCRService {
  async extract(imageUrl) {
    if (!process.env.NVIDIA_OCR_API_KEY && !process.env.NVIDIA_VLM_API_KEY) {
      console.warn('[OCR] No NVIDIA API keys configured. Skipping.');
      return [];
    }

    // Use VLM model directly via /v1/chat/completions with vision capability
    return this.extractViaChatCompletions(imageUrl);
  }

  /**
   * Fetch an image URL and convert to base64 data URI.
   * NVIDIA's hosted API requires base64, not external URLs.
   */
  async imageUrlToBase64(imageUrl) {
    if (imageUrl.startsWith('data:')) return imageUrl;

    console.log('[OCR] Fetching image for base64 encoding...');
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: HTTP ${imgResponse.status}`);
    }
    const buffer = Buffer.from(await imgResponse.arrayBuffer());
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const base64 = buffer.toString('base64');
    console.log(`[OCR] Image encoded: ${contentType}, ${Math.round(base64.length / 1024)}KB base64`);
    return `data:${contentType};base64,${base64}`;
  }

  /**
   * Use a vision-language model via /v1/chat/completions to extract match data
   */
  async extractViaChatCompletions(imageUrl) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
    const apiKey = process.env.NVIDIA_VLM_API_KEY || process.env.NVIDIA_OCR_API_KEY;
    const modelId = process.env.NVIDIA_VLM_MODEL || 'nvidia/nemotron-nano-12b-v2-vl';

    let base64Image;
    try {
      base64Image = await this.imageUrlToBase64(imageUrl);
    } catch (err) {
      console.error('[OCR] Image fetch/encode failed:', err.message);
      return [];
    }

    const prompt = `You are analyzing a BGMI (Battlegrounds Mobile India) match result screenshot. Your task is to extract team placements, player names, and kill counts with maximum precision.

CRITICAL RULES FOR ACCURACY:
1. BGMI Result Table Structure: Each team is grouped inside a shaded rectangular block. The large number on the left side of the block is the TEAM PLACEMENT (rank). ONLY the 4 player names completely inside this specific shaded block belong to this team.
2. Team #1 (First Place) Exception: The 1st place team usually does NOT have a plain "1" number. Instead, it has a golden crown, shield, or winged icon with a small "1" inside it. Treat this entire block as placement 1.
3. DO NOT mix players from different background blocks. If a name is on a different background color or separated by a line, it belongs to a different team.
4. Kills = "finishes": The exact number before "finishes" or "finish" is the player's kill count.
5. "0 finishes" = 0 kills. Do NOT guess or hallucinate kills.
6. Read EACH player's kill number individually. Do NOT sum or estimate.
7. Player names may contain special characters, clan tags, or symbols — preserve them exactly. Follow the exact spelling shown.
8. DO NOT SKIP ANY ROWS OR PLACEMENTS. You must extract every single valid team block visible in the image from top to bottom sequentially. Missing rows will cause data loss.
9. DO NOT TRUNCATE. Pay special attention to the very bottom of the image. If a team's block is partially visible at the bottom, YOU MUST STILL EXTRACT IT.

OUTPUT FORMAT — Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "placement": 1,
    "players": [
      { "name": "ExactPlayerName1", "kills": 6 },
      { "name": "ExactPlayerName2", "kills": 3 },
      { "name": "ExactPlayerName3", "kills": 0 },
      { "name": "ExactPlayerName4", "kills": 5 }
    ]
  }
]

Double-check every kill number and ensure you do not assign players from the row above or below to the wrong placement.`;

    const payload = {
      model: modelId,
      messages: [
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
      max_tokens: 3000,
      temperature: 0.0,
      stream: false
    };

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      try {
        console.log(`[OCR] Calling ${modelId} (Attempt ${attempt + 1}/${maxAttempts})...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.error(`[OCR] API responded ${response.status}: ${errText.substring(0, 500)}`);
          if (response.status === 429 || response.status >= 500) {
            attempt++;
            if (attempt >= maxAttempts) return [];
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
          }
          return [];
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        if (!content) {
          console.warn('[OCR] API returned empty content. Full response:', JSON.stringify(data).substring(0, 300));
          return [];
        }

        console.log(`[OCR] Got response (${content.length} chars)`);
        const parsed = this.parseResponse(content);
        console.log(`[OCR] Parsed ${parsed.length} team blocks from response.`);
        return parsed;
      } catch (err) {
        console.error('[OCR] Fetch failed:', err.message);
        attempt++;
        if (attempt >= maxAttempts) return [];
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    return [];
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
      if (start === -1 || end === 0) {
        console.warn('[OCR] No JSON array found in response. Content:', cleaned.substring(0, 200));
        return [];
      }
      const jsonStr = cleaned.substring(start, end);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('[OCR] Failed to parse response as JSON:', content.substring(0, 300));
      return [];
    }
  }
}

module.exports = new NvidiaOCRService();

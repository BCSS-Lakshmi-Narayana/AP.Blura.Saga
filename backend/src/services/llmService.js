const OpenAI = require("openai");
const axios = require("axios");
const mappingService = require("./mappingService");

/**
 * Advanced Multi-Provider Categorization (V5.1)
 * Uses Local Ollama (llama3.1) as Primary for Unlimited Requests.
 * Uses GitHub Models (GPT-4o) as Reliability Fallback.
 */
async function categorizeText(text, retryCount = 1) {
  const primaryProvider = process.env.PRIMARY_LLM_PROVIDER || 'ollama';
  const currentProvider = (retryCount === 1) ? primaryProvider : 'github';

  // 1. Ensure Mapping Data is loaded (avoid empty categorization lists)
  await mappingService.waitForLoad();

  // 2. Resolve Provider Configuration
  let config = {
    apiKey: '',
    baseURL: '',
    model: ''
  };

  if (currentProvider === 'ollama') {
    config.baseURL = process.env.OLLAMA_BASE_URL || "http://32.192.131.130:11434";
    config.model = process.env.OLLAMA_MODEL || "qwen2.5:14b-instruct-q4_K_M";
    config.apiKey = "ollama"; // Dummy key for OpenAI SDK compatibility
  } else if (currentProvider === 'github') {
    config.apiKey = process.env.GITHUB_TOKEN;
    config.baseURL = "https://models.inference.ai.azure.com";
    config.model = "gpt-4o";
  }

  // Early exit if missing primary config
  if (currentProvider === 'github' && !config.apiKey) {
    console.warn(`[LLM] No GITHUB_TOKEN found. Skipping fallback.`);
    return null;
  }

  // Dynamic Prompt Construction
  const categories = mappingService.mappingData.category_mappings || [];
  console.log(`[LLM] Constructing prompt with ${categories.length} allowed categories.`);
  const categoryListStr = categories.map(c => `- ${c.category_id}`).join('\n');
  const definitionsStr = categories.map(c => `
- ${c.category_id}
  ${c.definition || "No definition provided."}
`).join('\n');

  const prompt = `
You are an elite multilingual content moderation expert specializing in the Indian sociopolitical context.
You have TWO jobs:
1. CONTENT MODERATION: Select EXACTLY ONE moderation category from the provided list.
2. GRIEVANCE TOPIC: Classify what real-world issue this post is about.
3. SENTIMENT ANALYSIS: Determine the emotional tone of the post.

════════════════════════
JOB 1: CONTENT MODERATION
════════════════════════
ANALYSIS RULES:
- TRANSLITERATION HANDLING: If the text is an Indian language written in English script (e.g., Romanized Telugu/Hindi), you MUST first correctly translate the intent. Do not assume it is English. 
- INTENT OVER SURFACE: Identify threats, slurs, and violent intent even when expressed in informal or transliterated slang.
- CONTEXT: Distinguish between neutral political dissent and targeted harm.
- RELIGIOUS GREETINGS ARE HARMLESS: Common Indian greetings and blessings like "जय माता दी", "Jai Mata Di", "Jai Shri Ram", "Allahu Akbar", "Waheguru Ji", "Om Namah Shivaya", "Radhe Radhe", "Har Har Mahadev" etc. are NORMAL everyday expressions. They are NOT communal content, NOT hate speech, NOT threats. Tagging a political handle while saying a greeting does NOT make it communal or political.
- BENIGN CONTENT DEFAULT: If a post is just a greeting, blessing, compliment, congratulation, or casual conversation with NO harmful intent → ALWAYS classify as 'Normal'. Do NOT overthink or force a harmful category onto harmless text.

AVAILABLE CATEGORIES:
${categoryListStr}

CATEGORY DEFINITIONS:
${definitionsStr}

- Select EXACTLY ONE category ID from the list above.
- If the content is harmless/neutral/a greeting/a blessing → 'Normal'.
- ONLY use harmful categories (Hate_Speech, Communal_Violence, etc.) when there is CLEAR, EXPLICIT harmful content — slurs, threats, incitement, abuse. Never flag benign text.

════════════════════════
JOB 2: GRIEVANCE TOPIC CLASSIFICATION
════════════════════════
Classify the content into EXACTLY ONE of these predefined grievance topics.

ALLOWED GRIEVANCE TOPICS:
- Political Criticism — criticism of politicians, political parties, government policies, elections
- Hate Speech — communal hate, caste slurs, religious targeting, extremism
- Public Complaint — general citizen complaints about public services (electricity, water, sanitation, hospitals, schools, pensions etc.)
- Corruption Complaint — allegations of bribery, scams, misuse of funds, nepotism
- Government Praise — content appreciating or praising government work, schemes, or leaders
- Traffic Complaint — traffic jams, signal issues, road rage, challan disputes, parking problems
- Public Nuisance — noise pollution, illegal dumping, encroachments, stray animals, eve teasing
- Road & Infrastructure — potholes, broken roads, damaged bridges, street light issues, construction delays
- Law & Order — police inaction, crime reports, drug menace, theft, safety concerns
- Normal — neutral content with no complaint, grievance, or praise (greetings, casual chat, memes, jokes, blessings)

RULES:
- Select EXACTLY ONE topic from the list above. Do NOT invent new topics.
- If the post is a greeting, blessing, joke, meme, or casual chat → "Normal".
- Focus on the GROUND-LEVEL PROBLEM, not who is tagged.
- If someone tags a politician about power cuts → "Public Complaint" (NOT Political Criticism).
- If content has political criticism AND a specific complaint, pick the more specific complaint topic.
- Default to "Normal" when unsure.

════════════════════════
JOB 3: SENTIMENT ANALYSIS
════════════════════════
Identify the sentiment in the context of N. Chandrababu Naidu (CBN), Nara Lokesh, and the Telugu Desam Party (TDP)-led NDA government in Andhra Pradesh:
- 'positive':
    * Praise, gratitude or support towards Chandrababu Naidu (CBN), Nara Lokesh, the TDP, or the TDP-led NDA government (with BJP and Jana Sena).
    * Appreciation for TDP governance and development work across Andhra Pradesh constituencies (Amaravati, welfare schemes, infrastructure, jobs).
    * Criticism, mockery, or reporting of scandals regarding the opposition YSRCP (Y. S. Jagan Mohan Reddy) and its leaders.
    * General positive greetings, festival messages, and celebrations involving CBN / Lokesh / TDP.
- 'negative':
    * Direct criticism, complaints, or anger directed at Chandrababu Naidu, Nara Lokesh, the TDP, or NDA leaders in AP.
    * Genuine public grievances within Andhra Pradesh (electricity, water, roads, jobs, farmer issues, law & order).
    * Hate speech, communal incitement, or personal attacks against CBN / Lokesh / TDP.
- 'neutral':
    * Purely informational news, questions, or vague statements without clear political or emotional bias.

════════════════════════
JOB 4: RISK ASSESSMENT
════════════════════════
Determine the risk level and score:
- 'low' (0-40): Harmless, informational, or minor citizen complaints.
- 'medium' (41-71): Moderate complaints, political criticism, or infrastructure issues.
- 'high' (72-100): Severe threats, hateful rhetoric, communal incitement, or major corruption allegations.

════════════════════════
OUTPUT FORMAT (STRICT JSON ONLY):
════════════════════════
{
  "category": "<moderation_category_ID>",
  "reasoning": "<why this moderation category>",
  "grievance_type": "<short 2-4 word topic label>",
  "grievance_reasoning": "<1-line plain summary of what the person is complaining about>",
  "sentiment": "positive | negative | neutral",
  "risk_level": "low | medium | high",
  "risk_score": <number 0-100 indicating severity>
}

────────────────────────
TEXT TO ANALYZE:
<<<
${text}
>>>
`;

  try {
    let result;

    if (currentProvider === 'ollama') {
      // Use direct axios for Ollama as it's often more reliable for local setup than SDK
      const ollamaTimeout = parseInt(process.env.OLLAMA_TIMEOUT_MS || '300000', 10); // 5 min default for remote/cold-load
      console.log(`[LLM] Calling Ollama at ${config.baseURL} model=${config.model} timeout=${ollamaTimeout}ms`);
      const response = await axios.post(`${config.baseURL}/api/chat`, {
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        format: "json",
        options: {
          temperature: 0
        }
      }, { timeout: ollamaTimeout });

      const content = response.data?.message?.content;
      result = JSON.parse(content);
    } else {
      // Use OpenAI SDK for GitHub
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
      const response = await client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: config.model,
        response_format: { type: "json_object" },
        temperature: 0
      });
      result = JSON.parse(response.choices[0].message.content);
    }

    // --- CATEGORY VALIDATION ---
    const availableCategories = (mappingService.mappingData.category_mappings || []).map(c => c.category_id);
    let finalCategory = result.category;

    console.log(`[LLM] Raw Category: "${finalCategory}"`);

    if (!availableCategories.includes(finalCategory)) {
      // Try strict case-insensitive match (trim + case)
      const exactMatch = availableCategories.find(c =>
        String(c).trim().toLowerCase() === String(finalCategory).trim().toLowerCase()
      );

      if (exactMatch) {
        finalCategory = exactMatch;
      } else {
        console.warn(`[LLM] INVALID CATEGORY: "${finalCategory}". Fallback to 'Normal'.`);
        finalCategory = 'Normal';
      }
    }

    // --- GRIEVANCE TOPIC VALIDATION ---
    const ALLOWED_TOPICS = [
      'Political Criticism', 'Hate Speech', 'Public Complaint', 'Corruption Complaint',
      'Government Praise', 'Traffic Complaint', 'Public Nuisance', 'Road & Infrastructure',
      'Law & Order', 'Normal'
    ];
    let finalTopic = result.grievance_type || 'Normal';
    if (!ALLOWED_TOPICS.includes(finalTopic)) {
      const topicMatch = ALLOWED_TOPICS.find(t => t.toLowerCase() === String(finalTopic).trim().toLowerCase());
      if (topicMatch) {
        finalTopic = topicMatch;
      } else {
        console.warn(`[LLM] INVALID TOPIC: "${finalTopic}". Fallback to 'Normal'.`);
        finalTopic = 'Normal';
      }
    }

    // --- SENTIMENT VALIDATION ---
    const ALLOWED_SENTIMENTS = ['positive', 'negative', 'neutral'];
    let finalSentiment = result.sentiment || 'neutral';
    if (!ALLOWED_SENTIMENTS.includes(finalSentiment)) {
      finalSentiment = 'neutral';
    }

    return {
      category: finalCategory,
      reasoning: result.reasoning || "",
      grievance_type: finalTopic,
      grievance_reasoning: result.grievance_reasoning || "",
      sentiment: finalSentiment,
      risk_level: result.risk_level || 'low',
      risk_score: result.risk_score || 10
    };
  } catch (err) {
    console.error(`[LLM] [${currentProvider}] Analysis Failed:`, err.message);

    // Automatic Fallback to GitHub on first error
    if (currentProvider === 'ollama' && retryCount > 0) {
      console.log("[LLM] Local Ollama unavailable. Falling back to GitHub Models...");
      return categorizeText(text, retryCount - 1);
    }

    return null;
  }
}

module.exports = {
  categorizeText
};

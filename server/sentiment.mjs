// // AI-powered guest sentiment analysis
// // Strictly 3 categories: 'positive' | 'neutral' | 'negative'
// // Prioritizes reading the review text over the star rating.

// import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// const POSITIVE_WORDS = new Set([
//   'good','great','excellent','wonderful','friendly','clean','amazing','love',
//   'delicious','helpful','perfect','comfortable','fantastic','beautiful','lovely',
//   'outstanding','superb','exceptional','impressive','pleased','happy','enjoyed',
//   'recommend','best','brilliant','smooth','prompt','efficient','awesome','perk',
//   'perks','nice','splendid','flawless','delightful','satisfying','top-notch','tasty'
// ]);

// const NEGATIVE_WORDS = new Set([
//   'bad','poor','terrible','dirty','rude','cold','slow','noisy','broken',
//   'disappointed','disappointing','waited','uncomfortable','awful','horrible',
//   'worst','unacceptable','neglected','ignored','filthy','stale','overpriced',
//   'delayed','problem','issue','complaint','wrong','vey','stink','smell','leak',
//   'bugs','disgusting','annoying','mediocre','trash','garbage','unhelpful'
// ]);

// const NEUTRAL_WORDS = new Set([
//   'neutral','okay','ok','average','moderate','fair','standard','normal',
//   'decent','fine','passable','so-so','mixed','acceptable','ordinary','routine'
// ]);

// const NEGATIONS = new Set(['not','never','no','barely','hardly',"wasn't","didn't","couldn't",'neither']);

// const ASPECT_PATTERNS = {
//   Dining:       /\b(food|meal|breakfast|lunch|dinner|dining|restaurant|buffet|menu|chef|cuisine|drink|bar|coffee|snack)\b/i,
//   Housekeeping: /\b(clean|cleaning|dirty|towel|housekeeping|room service|bed|linen|bathroom|toilet)\b/i,
//   Facilities:   /\b(pool|spa|gym|fitness|wifi|internet|elevator|parking|lobby)\b/i,
//   Service:      /\b(staff|service|wait|waiting|waited|rude|helpful|front desk|receptionist|concierge|check.in|check.out)\b/i,
//   Value:        /\b(price|expensive|cheap|value|worth|overpriced|cost|money)\b/i,
//   Maintenance:  /\b(maintance|maintenance|repair|broken|leak|ac|air condition|tv|light|faucet|water)\b/i,
//   Location:     /\b(location|view|beach|garden|noise|quiet|nearby|access)\b/i,
// };

// export function rulesBased(comment, rating = 3) {
//   const lower = comment.toLowerCase();
//   const tokens = lower.match(/[a-z']+/g) || [];

//   let pos = 0, neg = 0, neu = 0;

//   // Explicit phrase detection
//   if (/(\bnot proper\b|\bnot clean\b|\bnot good\b|\bvery bad\b|\bvey bad\b|\bworst\b|\bterrible\b|\bdirty\b)/i.test(lower)) {
//     neg += 3;
//   }
//   if (/(\bneutral\b|\bso-so\b|\baverage\b|\bneither good nor bad\b|\bjust ok\b|\bokay\b)/i.test(lower)) {
//     neu += 2;
//   }
//   if (/(\bawesome\b|\bbest perks\b|\bexcellent\b|\bloved it\b|\bexceptional\b|\bwonderful\b)/i.test(lower)) {
//     pos += 3;
//   }

//   tokens.forEach((word, i) => {
//     let sign = POSITIVE_WORDS.has(word) ? 1 : NEGATIVE_WORDS.has(word) ? -1 : NEUTRAL_WORDS.has(word) ? 0 : null;
//     const hasNegation = tokens.slice(Math.max(0, i - 3), i).some(t => NEGATIONS.has(t));

//     if (sign === 1) {
//       if (hasNegation) neg++; else pos++;
//     } else if (sign === -1) {
//       if (hasNegation) pos++; else neg++;
//     } else if (sign === 0) {
//       neu++;
//     }
//   });

//   // Decide sentiment strictly in 3 categories by text semantics
//   let sentiment = 'neutral';
//   if (lower.includes('neutral') || lower.includes('average') || lower.includes('so-so') || lower.includes('just ok')) {
//     sentiment = 'neutral';
//   } else if (neg > 0 && neg >= pos) {
//     sentiment = 'negative';
//   } else if (pos > 0 && pos > neg) {
//     sentiment = 'positive';
//   } else if (neu > 0) {
//     sentiment = 'neutral';
//   } else {
//     // If no sentiment words found, fall back to star rating
//     sentiment = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
//   }

//   const aspects = Object.entries(ASPECT_PATTERNS)
//     .filter(([, pat]) => pat.test(comment))
//     .map(([name]) => name);

//   return { sentiment, aspects, pos, neg, neu };
// }

// // ── Gemini structured analysis ────────────────────────────────────────────────
// function getClient() {
//   const key = process.env.GEMINI_API_KEY;
//   return key && !key.includes('YOUR_KEY') ? new GoogleGenerativeAI(key) : null;
// }

// const SENTIMENT_SCHEMA = {
//   type: SchemaType.OBJECT,
//   properties: {
//     sentiment:      { type: SchemaType.STRING, enum: ['positive', 'neutral', 'negative'], nullable: false },
//     score:          { type: SchemaType.NUMBER, description: 'Sentiment score -1.0 to 1.0', nullable: false },
//     aspects:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Affected hotel areas', nullable: false },
//     keywords:       { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Key phrases from review', nullable: false },
//     urgency:        { type: SchemaType.STRING, enum: ['low', 'medium', 'high'], nullable: false },
//     recommendation: { type: SchemaType.STRING, description: 'Single actionable step for hotel team', nullable: false },
//   },
//   required: ['sentiment', 'score', 'aspects', 'keywords', 'urgency', 'recommendation'],
// };

// async function llmAnalysis(comment, rating) {
//   const genAI = getClient();
//   if (!genAI) return null;

//   try {
//     const model = genAI.getGenerativeModel({
//       model: 'gemini-1.5-flash',
//       generationConfig: {
//         responseMimeType: 'application/json',
//         responseSchema: SENTIMENT_SCHEMA,
//       },
//     });

//     const prompt = `You are a hotel operations analyst.
// Read this guest review text carefully.
// CRITICAL: Determine the customer sentiment STRICTLY based on the review text content, NOT only on the star count.
// A guest giving 5 stars who wrote "worst food ever" or "very bad service" must be classified as 'negative'.
// A guest writing "not proper maintenance and room quality neutral" must be classified as 'neutral'.
// A guest writing "best perks available service awesome" must be classified as 'positive'.

// Rating submitted: ${rating}/5
// Review text: "${comment}"

// Classify into exactly one of three categories: 'positive', 'neutral', or 'negative'.`;

//     const result = await model.generateContent(prompt);
//     const text = result.response.text();
//     const parsed = JSON.parse(text);
//     if (['positive', 'neutral', 'negative'].includes(parsed.sentiment)) {
//       return parsed;
//     }
//     return null;
//   } catch (e) {
//     console.warn('[Sentiment] Gemini analysis fallback:', e.message);
//     return null;
//   }
// }

// // ── Public API ────────────────────────────────────────────────────────────────
// export async function analyzeFeedback(comment, rating = 3) {
//   const rules = rulesBased(comment, rating);
//   const llm = await llmAnalysis(comment, rating);

//   if (llm) {
//     return {
//       sentiment:      llm.sentiment,
//       score:          llm.score,
//       aspects:        llm.aspects?.length ? llm.aspects : rules.aspects,
//       keywords:       llm.keywords || [],
//       urgency:        llm.urgency,
//       recommendation: llm.recommendation,
//       method:         'llm-gemini',
//       needsReview:    llm.sentiment === 'negative',
//     };
//   }

//   // Pure rules-based text fallback
//   const score = rules.sentiment === 'positive' ? 0.9 : rules.sentiment === 'negative' ? -0.8 : 0;
//   return {
//     sentiment:      rules.sentiment,
//     score,
//     aspects:        rules.aspects.length ? rules.aspects : ['General Experience'],
//     keywords:       [],
//     urgency:        rules.sentiment === 'negative' ? 'high' : 'low',
//     recommendation: rules.sentiment === 'negative'
//       ? 'Contact the guest, confirm the issue, and assign a service recovery owner.'
//       : rules.sentiment === 'neutral'
//       ? 'Check in with guest during their stay to enhance satisfaction.'
//       : 'Share positive commendation with the department team.',
//     method:         'nlp-text-analyzer',
//     needsReview:    rules.sentiment === 'negative',
//   };
// }
// AI-powered dynamic guest sentiment analysis
//
// Smart Resort 360
//
// Gemini performs semantic sentiment analysis instead of relying
// on a fixed positive/negative word list.
//
// Supports:
// - spelling mistakes
// - informal language
// - abbreviations
// - slang
// - mixed sentiment
// - negation
// - multiple resort aspects
// - aspect-level sentiment
// - urgency detection
// - actionable recommendations
//
// If Gemini is unavailable, a small fallback analyzer is used.

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';


// ============================================================
// 1. GEMINI CLIENT
// ============================================================

function getClient() {
  const key = process.env.GEMINI_API_KEY;

  if (!key || key.includes('YOUR_KEY')) {
    console.warn('[Sentiment] GEMINI_API_KEY is missing.');
    return null;
  }

  return new GoogleGenerativeAI(key);
}


// ============================================================
// 2. STRUCTURED OUTPUT SCHEMA
// ============================================================

const SENTIMENT_SCHEMA = {
  type: SchemaType.OBJECT,

  properties: {

    // Overall sentiment
    sentiment: {
      type: SchemaType.STRING,
      enum: [
        'positive',
        'neutral',
        'negative'
      ],
      description:
        'Overall sentiment of the guest review.'
    },


    // Sentiment score
    score: {
      type: SchemaType.NUMBER,
      description:
        'Sentiment score from -1.0 (very negative) to +1.0 (very positive).'
    },


    // Confidence
    confidence: {
      type: SchemaType.NUMBER,
      description:
        'Confidence of the sentiment classification from 0.0 to 1.0.'
    },


    // Resort areas affected
    aspects: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.STRING
      },

      description:
        'Resort departments, services, facilities or areas mentioned in the review.'
    },


    // Important phrases
    keywords: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.STRING
      },

      description:
        'Important phrases, issues or positive points extracted from the review.'
    },


    // Sentiment for individual aspects
    sentimentByAspect: {
      type: SchemaType.ARRAY,

      items: {
        type: SchemaType.OBJECT,

        properties: {

          aspect: {
            type: SchemaType.STRING
          },

          sentiment: {
            type: SchemaType.STRING,

            enum: [
              'positive',
              'neutral',
              'negative'
            ]
          },

          evidence: {
            type: SchemaType.STRING
          }
        },

        required: [
          'aspect',
          'sentiment',
          'evidence'
        ]
      },

      description:
        'Sentiment detected for each individual resort aspect.'
    },


    // Operational urgency
    urgency: {
      type: SchemaType.STRING,

      enum: [
        'low',
        'medium',
        'high'
      ],

      description:
        'Operational urgency of the guest issue.'
    },


    // Action recommendation
    recommendation: {
      type: SchemaType.STRING,

      description:
        'One actionable recommendation for the resort management team.'
    }
  },

  required: [
    'sentiment',
    'score',
    'confidence',
    'aspects',
    'keywords',
    'sentimentByAspect',
    'urgency',
    'recommendation'
  ]
};


// ============================================================
// 3. GEMINI AI ANALYSIS
// ============================================================

async function llmAnalysis(comment, rating = 3) {

  const genAI = getClient();

  if (!genAI) {
    return null;
  }


  try {
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3-flash-preview'
    ];

  const prompt = `
You are an expert AI guest-experience and resort-operations analyst.

Your task is to analyze a guest review for a resort.

The analysis MUST be based primarily on the actual meaning
and context of the review text.

CRITICAL: NEGATIONS INVERT SENTIMENT COMPLETELY:
- "not good", "not great", "not happy", "not clean", "not working", "not proper", "no good", "never again", "not worth" MUST be classified as NEGATIVE.
- Phrases like "not good service" mean the service was unsatisfactory, which is strictly NEGATIVE.
- If the guest gives a low rating (1 or 2 stars) and states "not good service", the overall sentiment is NEGATIVE.

Do NOT classify "not good" or "not clean" as positive just because the word "good" or "clean" appears!

The analysis MUST be based primarily on the actual meaning
and context of the review text.

Do NOT rely on a fixed list of positive or negative words.

============================================================
SPELLING MISTAKES
============================================================

Understand common spelling mistakes automatically.

Examples:

"gud service"
means approximately:
"good service"

"excelent room"
means approximately:
"excellent room"

"amazng stay"
means approximately:
"amazing stay"

"staf was rde"
means approximately:
"staff was rude"

"food was gr8"
means approximately:
"food was great"

"very gud resort"
means approximately:
"very good resort"

Do NOT classify a review as neutral simply because a word
is misspelled.

============================================================
INFORMAL LANGUAGE
============================================================

Understand:

slang
abbreviations
texting language
repeated letters
informal grammar
common internet language

Examples:

"staff sooo good"
"room was lit"
"food was kinda bad"
"service was super slow"
"luv the place"

Interpret these based on their meaning.

============================================================
NEGATION
============================================================

Understand negation and context.

Examples:

"not clean"
→ negative

"not good"
→ negative

"never helpful"
→ negative

"not bad"
→ generally positive or mildly positive

"wasn't terrible"
→ not strongly negative

============================================================
MIXED SENTIMENT
============================================================

A review may contain both positive and negative opinions.

Example:

"The resort is beautiful and the food is amazing,
but the room was dirty and the staff was slow."

Do NOT ignore either side.

Identify:

Positive:
- resort
- dining

Negative:
- housekeeping
- service

Then determine the overall sentiment based on the complete context.

============================================================
STAR RATING
============================================================

The review text has priority over the star rating.

Example:

Rating: 5/5

Review:
"worst service ever"

Overall sentiment:
negative

Another example:

Rating: 1/5

Review:
"Everything was actually perfect."

The text should be considered carefully, although confidence
may be reduced because the rating conflicts with the text.

============================================================
RESORT ASPECTS
============================================================

Identify any relevant resort area.

Possible aspects include:

Dining
Housekeeping
Facilities
Service
Value
Maintenance
Location
Room
Staff
Amenities
Booking
Check-in
Check-out
Spa
Pool
Gym
WiFi
Transport
Activities
Food
Breakfast
Restaurant
Reception
Concierge
Parking
Bathroom
Air Conditioning

You may create another aspect if the review clearly refers
to something outside this list.

============================================================
ASPECT SENTIMENT
============================================================

Determine sentiment separately for each important aspect.

Example:

"The room was amazing but the bathroom was dirty."

Room:
positive

Bathroom:
negative

============================================================
URGENCY
============================================================

HIGH urgency:

- safety problem
- hygiene problem
- serious maintenance failure
- broken AC
- water leakage
- electrical issue
- guest cannot use room/facility
- severe service failure
- serious complaint

MEDIUM urgency:

- slow service
- repeated inconvenience
- moderate maintenance problem
- significant dissatisfaction

LOW urgency:

- compliments
- minor suggestions
- ordinary feedback
- positive experience

============================================================
RECOMMENDATION
============================================================

Provide ONE practical recommendation for resort management.

Example:

"Assign housekeeping staff to inspect the bathroom
and complete cleaning immediately."

Do not provide a generic recommendation if a specific
problem is identifiable.

============================================================
OUTPUT
============================================================

Return exactly the required JSON structure.

Guest rating:
${rating}/5

Guest review:
"${comment}"
`;


    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: SENTIMENT_SCHEMA
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        if (parsed && ['positive', 'neutral', 'negative'].includes(parsed.sentiment)) {
          return parsed;
        }
      } catch (err) {
        console.warn(`[Sentiment] Model ${modelName} failed:`, err.message?.slice(0, 100));
      }
    }

    return null;
  } catch (error) {
    console.warn('[Sentiment] Gemini analysis failed:', error.message);
    return null;
  }
}


// ============================================================
// 4. FALLBACK ANALYZER
// ============================================================
//
// Gemini is the PRIMARY analyzer.
//
// This fallback exists only so the application does not completely
// stop working when Gemini is unavailable.
//

function fallbackAnalysis(comment, rating = 3) {
  const rawText = String(comment || '').trim();
  const text = rawText.toLowerCase();

  const NEGATIONS = new Set([
    'not', 'no', 'never', 'barely', 'hardly', "wasn't", 'wasnt',
    "didn't", 'didnt', "couldn't", 'couldnt', "isn't", 'isnt',
    'neither', 'without', 'lack', 'lacking'
  ]);

  const NEGATIVE_WORDS = new Set([
    'bad', 'terrible', 'worst', 'dirty', 'rude', 'broken', 'poor', 'awful',
    'horrible', 'disappointed', 'disappointing', 'slow', 'problem', 'issue',
    'complaint', 'leak', 'filthy', 'unacceptable', 'overpriced', 'stink',
    'smelly', 'bugs', 'disgusting', 'annoying', 'mediocre', 'trash', 'useless',
    'unhelpful', 'noisy', 'cold', 'uncomfortable', 'neglected', 'ignored'
  ]);

  const POSITIVE_WORDS = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love',
    'beautiful', 'friendly', 'helpful', 'fantastic', 'awesome', 'comfortable',
    'delicious', 'recommend', 'nice', 'clean', 'happy', 'pleased', 'enjoyed',
    'best', 'superb', 'exceptional', 'tasty', 'impressive', 'lovely', 'brilliant',
    'prompt', 'flawless', 'delightful'
  ]);

  // Explicit negation phrases check
  const explicitNegativePhrases = [
    'not good', 'not great', 'not happy', 'not clean', 'not working', 'not proper',
    'not worth', 'not satisfied', 'not recommended', 'no good', 'never again',
    'was not good', 'wasnt good', 'did not like', 'didnt like', 'would not recommend',
    'bad service', 'poor service', 'worst service', 'rude staff', 'dirty room'
  ];

  let negativeCount = 0;
  let positiveCount = 0;

  for (const phrase of explicitNegativePhrases) {
    if (text.includes(phrase)) {
      negativeCount += 3;
    }
  }

  // Token-level scanning with negation awareness
  const tokens = text.match(/[a-z']+/g) || [];
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const isNegated = tokens.slice(Math.max(0, i - 3), i).some(t => NEGATIONS.has(t));

    if (POSITIVE_WORDS.has(word)) {
      if (isNegated) {
        negativeCount += 2.5; // "not good", "never helpful" -> strong negative
      } else {
        positiveCount += 1;
      }
    } else if (NEGATIVE_WORDS.has(word)) {
      if (isNegated) {
        positiveCount += 0.5; // "not bad" -> mildly positive
      } else {
        negativeCount += 1.5;
      }
    }
  }

  // Determine sentiment
  let sentiment = 'neutral';
  if (negativeCount > 0 && negativeCount >= positiveCount) {
    sentiment = 'negative';
  } else if (positiveCount > 0 && positiveCount > negativeCount) {
    sentiment = 'positive';
  } else {
    sentiment = rating <= 2 ? 'negative' : rating >= 4 ? 'positive' : 'neutral';
  }

  // If rating is 1 or 2 stars and there is ANY criticism or absence of strong unnegated praise
  if (rating <= 2 && (negativeCount > 0 || positiveCount === 0)) {
    sentiment = 'negative';
  }

  // Aspects detection
  const aspects = [];
  if (/\b(service|staff|wait|waiter|reception|front desk|manager|concierge|response)\b/i.test(text)) aspects.push('Service');
  if (/\b(room|bed|linen|pillow|suite|stay|ac|air condition|tv|door)\b/i.test(text)) aspects.push('Room');
  if (/\b(food|dining|breakfast|dinner|lunch|restaurant|buffet|taste|snack|drink|bar|chef)\b/i.test(text)) aspects.push('Dining');
  if (/\b(clean|dirty|toilet|bathroom|towel|shower|hygiene|housekeeping)\b/i.test(text)) aspects.push('Housekeeping');
  if (/\b(pool|spa|gym|beach|view|wifi|internet|parking|facility|facilities)\b/i.test(text)) aspects.push('Facilities');
  if (!aspects.length) aspects.push('General Experience');

  return {
    sentiment,
    score: sentiment === 'positive' ? 0.75 : sentiment === 'negative' ? -0.75 : 0,
    confidence: 0.65,
    aspects,
    keywords: tokens.filter(t => POSITIVE_WORDS.has(t) || NEGATIVE_WORDS.has(t) || NEGATIONS.has(t)),
    sentimentByAspect: aspects.map(a => ({ aspect: a, sentiment })),
    urgency: sentiment === 'negative' ? (rating <= 2 ? 'high' : 'medium') : 'low',
    recommendation: sentiment === 'negative'
      ? (aspects.includes('Service')
          ? 'Review service responsiveness and conduct follow-up with the guest regarding their service experience.'
          : 'Review the guest complaint and assign the relevant department for immediate service recovery.')
      : 'Maintain high standards and share positive feedback with the resort team.'
  };
}


// ============================================================
// 5. PUBLIC FUNCTION
// ============================================================

export async function analyzeFeedback(
  comment,
  rating = 3
) {

  const review = String(
    comment || ''
  ).trim();


  // ----------------------------------------------------------
  // Empty review
  // ----------------------------------------------------------

  if (!review) {

    return {

      sentiment: 'neutral',

      score: 0,

      confidence: 1,

      aspects: [
        'General Experience'
      ],

      keywords: [],

      sentimentByAspect: [],

      urgency: 'low',

      recommendation:
        'No review text was provided.',

      method: 'empty-review',

      needsReview: false
    };
  }


  // ----------------------------------------------------------
  // PRIMARY AI ANALYSIS
  // ----------------------------------------------------------

  const aiResult =
    await llmAnalysis(
      review,
      rating
    );


  // ----------------------------------------------------------
  // AI RESULT
  // ----------------------------------------------------------

  if (aiResult) {

    const score = Number(
      aiResult.score
    );


    const confidence = Number(
      aiResult.confidence
    );


    return {

      sentiment:
        aiResult.sentiment,


      score:
        Number.isFinite(score)
          ? Math.max(
            -1,
            Math.min(
              1,
              score
            )
          )
          : 0,


      confidence:
        Number.isFinite(confidence)
          ? Math.max(
            0,
            Math.min(
              1,
              confidence
            )
          )
          : 0.8,


      aspects:

        Array.isArray(
          aiResult.aspects
        ) &&
          aiResult.aspects.length

          ? aiResult.aspects

          : [
            'General Experience'
          ],


      keywords:

        Array.isArray(
          aiResult.keywords
        )

          ? aiResult.keywords

          : [],


      sentimentByAspect:

        Array.isArray(
          aiResult.sentimentByAspect
        )

          ? aiResult.sentimentByAspect

          : [],


      urgency:
        aiResult.urgency || 'low',


      recommendation:

        aiResult.recommendation ||

        'Review the guest feedback.',


      method:
        'gemini-ai',


      needsReview:

        aiResult.sentiment === 'negative' ||

        aiResult.urgency === 'high'
    };
  }


  // ----------------------------------------------------------
  // FALLBACK
  // ----------------------------------------------------------

  const fallback =
    fallbackAnalysis(
      review,
      rating
    );


  return {

    ...fallback,

    method:
      'fallback-nlp',

    needsReview:

      fallback.sentiment === 'negative' ||

      fallback.urgency === 'high'
  };
}
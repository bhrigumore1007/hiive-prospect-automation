import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import fetch from 'node-fetch';

console.log('🔍 Loading environment...');
const app = express();

// CORS middleware - CRITICAL FOR FRONTEND COMMUNICATION
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Initialize Supabase
console.log('🔌 Connecting to Supabase...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
console.log('✅ Supabase client initialized');

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:8080', /\.vercel\.app$/, /\.railway\.app$/],
  credentials: true
}));
console.log('✅ Middleware setup complete');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ===== HELPER FUNCTIONS (TOP LEVEL) =====

function extractCompanyInsights(perplexityResponse) {
  console.log('🔍 Extracting company insights from Perplexity response...');
  
  const content = perplexityResponse?.content || perplexityResponse || '';
  const insights = {
    stage: 'Unknown',
    valuation: 1000000000,
    hasRecentFunding: false,
    hasSecondaryMarket: false
  };
  
  // Extract company stage
  if (content.includes('IPO') || content.includes('public company')) {
    insights.stage = 'Public';
  } else if (content.includes('unicorn') || content.includes('billion') || content.includes('Series F') || content.includes('Series G')) {
    insights.stage = 'Late Stage Unicorn';
  } else if (content.includes('Series C') || content.includes('Series D') || content.includes('Series E')) {
    insights.stage = 'Growth Stage';
  } else if (content.includes('Series A') || content.includes('Series B')) {
    insights.stage = 'Early Stage';
  }
  
  // Extract valuation indicators
  const valuationMatch = content.match(/\$(\d+(?:\.\d+)?)\s*billion/i);
  if (valuationMatch) {
    insights.valuation = parseFloat(valuationMatch[1]) * 1000000000;
  }
  
  // Extract secondary market signals
  insights.hasSecondaryMarket = content.includes('secondary market') || 
                                content.includes('employee tender') || 
                                content.includes('liquidity');
  
  console.log('📊 Extracted insights:', insights);
  return insights;
}

function extractCompanyMultiplier(perplexityResponse, companyName) {
  console.log(`📈 Calculating dynamic multiplier for: ${companyName}`);
  
  const insights = extractCompanyInsights(perplexityResponse);
  let multiplier = 1.0;
  
  // Base multiplier on company stage
  switch (insights.stage) {
    case 'Public':
      multiplier = 0.9; // Lower equity grants, more liquid
      console.log(`  📊 Public company detected → ${multiplier}x multiplier`);
      break;
    case 'Late Stage Unicorn':
      multiplier = 1.1; // Good equity, approaching liquidity
      console.log(`  🦄 Late stage unicorn detected → ${multiplier}x multiplier`);
      break;
    case 'Growth Stage':
      multiplier = 1.2; // High equity potential
      console.log(`  📈 Growth stage detected → ${multiplier}x multiplier`);
      break;
    case 'Early Stage':
      multiplier = 1.15; // High but risky equity
      console.log(`  🌱 Early stage detected → ${multiplier}x multiplier`);
      break;
    default:
      // For truly unknown companies, analyze content for clues
      const content = perplexityResponse?.content || perplexityResponse || '';
      if (content.includes('startup') || content.includes('seed')) {
        multiplier = 1.1;
        console.log(`  🔍 Startup indicators detected → ${multiplier}x multiplier`);
      } else if (content.includes('established') || content.includes('mature')) {
        multiplier = 0.95;
        console.log(`  🏢 Established company indicators → ${multiplier}x multiplier`);
      } else {
        multiplier = 1.0;
        console.log(`  ❓ Unknown stage, using default → ${multiplier}x multiplier`);
      }
  }
  
  // Boost for secondary market activity detected by Perplexity
  if (insights.hasSecondaryMarket) {
    const boost = 0.1;
    multiplier += boost;
    console.log(`  💰 Secondary market activity detected → +${boost} boost = ${multiplier}x`);
  }
  
  // Cap the multiplier to reasonable bounds
  multiplier = Math.min(1.3, Math.max(0.8, multiplier));
  
  console.log(`  🎯 Final dynamic multiplier: ${multiplier}x (stage: ${insights.stage})`);
  return multiplier;
}

function calculateProspectConfidence(prospect, companyProfile, perplexityResponse) {
  let confidence = 1; // Start at minimum
  
  console.log(`📊 Calculating enhanced data confidence for: ${prospect.person_name}`);
  
  // Name quality (1 point)
  if (prospect.person_name && prospect.person_name.includes(' ') && prospect.person_name.length > 3) {
    confidence += 1;
    console.log(`  ✅ Real name detected: +1 (${confidence}/5)`);
  }
  
  // Job title quality (1 point)
  if (prospect.current_job_title && prospect.current_job_title.length > 5) {
    confidence += 1;
    console.log(`  ✅ Detailed job title: +1 (${confidence}/5)`);
  }
  
  // Email verification (1 point)
  if ((prospect.email || prospect.email_address) && 
      (prospect.email?.includes('@') || prospect.email_address?.includes('@')) && 
      !(prospect.email?.includes('noemail') || prospect.email_address?.includes('noemail'))) {
    confidence += 1;
    console.log(`  ✅ Valid email found: +1 (${confidence}/5)`);
  }
  
  // Hunter.io source verification (1 point) - all Hunter prospects are verified
  confidence += 1;
  console.log(`  ✅ Hunter.io verified prospect: +1 (${confidence}/5)`);
  
  confidence = Math.min(5, Math.max(1, confidence));
  console.log(`  📊 FINAL CONFIDENCE: ${confidence}/5`);
  
  return confidence;
}

// Helper function to calculate equity potential score
function calculateEquityScore(prospect, companyProfile) {
  console.log('🎯 CALCULATEEQUITYSCORE CALLED for:', prospect.person_name);
  console.log('  - Input title:', prospect.current_job_title);
  
  const title = (prospect.current_job_title || '').toLowerCase().trim();
  console.log('  - Cleaned title:', title);
  
  let baseScore = 5; // Default middle score
  
  // BOARD MEMBERS - Highest equity potential
  if (title.includes('board') && title.includes('member')) {
    baseScore = 9;
    console.log('  - MATCHED BOARD MEMBER → baseScore:', baseScore);
  }
  // C-LEVEL EXECUTIVES - Very high equity
  else if (title.includes('ceo') || title.includes('cto') || title.includes('cfo') || title.includes('chief')) {
    if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) {
      baseScore = 9; // Top executives
      console.log('  - MATCHED CEO/CTO/CFO → baseScore:', baseScore);
    } else {
      baseScore = 8; // Other C-level
      console.log('  - MATCHED OTHER C-LEVEL → baseScore:', baseScore);
    }
  }
  // VP LEVEL - High equity
  else if (title.includes('vp') || title.includes('vice president')) {
    baseScore = 8;
    console.log('  - MATCHED VP → baseScore:', baseScore);
  }
  // HEAD/DIRECTOR LEVEL - High equity  
  else if (title.includes('head') || title.includes('director')) {
    baseScore = 8;
    console.log('  - MATCHED HEAD/DIRECTOR → baseScore:', baseScore);
  }
  // SENIOR INDIVIDUAL CONTRIBUTORS - Good equity
  else if (title.includes('senior') || title.includes('staff') || title.includes('principal')) {
    baseScore = 7;
    console.log('  - MATCHED SENIOR IC → baseScore:', baseScore);
  }
  // MANAGERS/LEADS - Moderate equity
  else if (title.includes('manager') || title.includes('lead')) {
    baseScore = 6;
    console.log('  - MATCHED MANAGER/LEAD → baseScore:', baseScore);
  }
  // TECHNICAL ROLES - Moderate equity
  else if (title.includes('engineer') || title.includes('scientist') || title.includes('researcher')) {
    baseScore = 6;
    console.log('  - MATCHED TECHNICAL ROLE → baseScore:', baseScore);
  }
  // PRODUCT/DESIGN - Moderate equity
  else if ((title.includes('product') && title.includes('manager')) || title.includes('designer') || title.includes('design')) {
    baseScore = 6;
    console.log('  - MATCHED PRODUCT/DESIGN → baseScore:', baseScore);
  }
  // SUPPORT ROLES - Lower equity
  else if (title.includes('administrative') || title.includes('assistant') || title.includes('coordinator')) {
    baseScore = 3;
    console.log('  - MATCHED SUPPORT ROLE → baseScore:', baseScore);
  }
  // HR/RECRUITING - Lower equity
  else if (title.includes('hr') || title.includes('recruiting') || title.includes('talent')) {
    baseScore = 4;
    console.log('  - MATCHED HR/RECRUITING → baseScore:', baseScore);
  }
  else {
    console.log('  - NO MATCH → using default baseScore:', baseScore);
  }
  
  // Seniority adjustments
  const seniority = prospect.seniority_level || 'unknown';
  if (seniority === 'executive') {
    baseScore = Math.min(10, baseScore + 1);
    console.log('  - Executive bonus → baseScore:', baseScore);
  } else if (seniority === 'senior') {
    baseScore = Math.min(10, baseScore + 1);
    console.log('  - Senior bonus → baseScore:', baseScore);
  }
  
  // Company stage multiplier
  const stageMultiplier = companyProfile?.equityMultiplier || 1.0;
  console.log('  - Stage multiplier:', stageMultiplier);
  
  const finalScore = Math.min(10, Math.max(1, Math.round(baseScore * stageMultiplier)));
  console.log('  - FINAL CALCULATED SCORE:', finalScore);
  
  return finalScore;
}

// Step 1: Company research with Perplexity Sonar Pro
async function researchCompanyAndProspects(companyName, prospects) {
  const systemPrompt = "You are a senior equity sales analyst specializing in pre-IPO secondary market intelligence. For each individual prospect, provide structured, actionable data to support outbound equity sales. Analyze both company fundamentals and individual prospect details for comprehensive sales intelligence.";

  const enhancedPrompt = `
Research company: ${companyName} and analyze prospects for equity sales.

COMPANY ANALYSIS:
1. Founding year and current company age
2. Latest funding round (Series A/B/C/D/etc.) and date
3. Current estimated valuation and recent investor list
4. Total employees and growth trajectory
5. Industry sector and business model
6. IPO timeline and likelihood
7. Recent executive departures or equity events
8. Typical equity compensation structure for this industry/stage

CRITICAL: SPECIFIC LIQUIDITY SIGNALS ANALYSIS
For employees at ${companyName}, identify specific, actionable liquidity signals from these categories:

**COMPANY-DRIVEN EVENTS:**
* Recent layoffs, restructuring, or cost-cutting rounds (with dates)
* Upcoming or recent funding rounds creating liquidity windows
* Announced or rumored secondary programs at the company
* Changes in company policy regarding secondary sales
* Leadership transitions, CEO changes, or strategic pivots
* Performance concerns, slowing growth, or delayed IPO timeline

**EMPLOYMENT & VESTING STATUS:**
* Recent resignations or employees planning to leave
* Vesting milestones - employees recently fully vested or approaching cliffs
* Length of tenure indicating likely vesting status
* Stock option expiration timelines

**MARKET & INDUSTRY FACTORS:**
* Industry-wide concerns affecting company valuation
* Regulatory changes impacting the sector
* Competitor performance affecting market sentiment
* Economic conditions creating urgency for diversification

**PERSONAL FINANCIAL MOTIVATIONS (if inferable):**
* Life stage indicators suggesting major expenses (homebuying, family expansion)
* Career transitions or geographic moves
* Educational pursuits requiring funding

PROSPECT ANALYSIS:
For employees at ${companyName}, provide:
* Job title and seniority level assessment
* Estimated tenure at the company (years/months employed)
* Employment status (current or former employee)
* Estimated equity value or range (if inferable from role/stage)
* Preferred communication channel (email, LinkedIn, phone)
* **SPECIFIC LIQUIDITY SIGNALS:** List 2-3 most relevant, actionable signals with timeframes
* Compliance/KYC status requirements
* Equity ownership likelihood (High/Medium/Low)
* Liquidity motivation score (1-10) based on identified signals
* Personalized outreach strategy referencing specific liquidity signals
* Sales summary paragraph incorporating signal-based messaging

EXAMPLE FORMAT FOR LIQUIDITY SIGNALS:
Instead of: "Standard motivation"
Provide: "Company announced 15% layoffs in January 2025; Employee likely fully vested after 3+ years; Discord delaying IPO creates portfolio concentration risk"

EQUITY CONTEXT:
- How equity-generous is this company vs industry peers?
- What roles typically get significant equity grants?
- Any recent secondary market activity or liquidity events?
- Employee tenure patterns and vesting schedules
- Current market conditions affecting liquidity motivation

OUTPUT: Provide comprehensive structured data with specific, actionable liquidity signals that can be used for targeted outreach messaging.
`;

  const userPrompt = enhancedPrompt + "\n\nProspects to analyze:\n" + prospects.map(p => `- ${p.person_name} (${p.current_job_title})`).join("\n");

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('\n=== PERPLEXITY COMPREHENSIVE RESEARCH RESPONSE ===');
    console.log(JSON.stringify(result.choices[0].message.content, null, 2));
    return result.choices[0].message.content;
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    throw error;
  }
}

const createEnhancedIntelligence = (prospect, perplexityResponse, companyName) => {
  try {
    const prospectName = prospect.person_name || prospect.full_name || 'Unknown';
    
    // Extract insights from Perplexity response content
    const content = perplexityResponse || '';
    
    // Find prospect-specific section in Perplexity response
    const prospectSection = findProspectSection(content, prospectName);
    
    return {
      job_seniority: extractSeniority(prospectSection),
      estimated_tenure: extractTenure(prospectSection),
      employment_status: extractEmploymentStatus(prospectSection),
      estimated_equity_value: extractEquityValue(prospectSection),
      preferred_channel: extractPreferredChannel(prospectSection),
      liquidity_signals: extractLiquiditySignals(prospectSection),
      equity_likelihood: extractEquityLikelihood(prospectSection),
      liquidity_score: extractLiquidityScore(prospectSection),
      outreach_strategy: extractOutreachStrategy(prospectSection),
      sales_summary: extractSalesSummary(prospectSection)
    };
  } catch (error) {
    console.error('💥 Enhanced intelligence creation failed:', error);
    return {};
  }
};

function findProspectSection(content, prospectName) {
  // Look for the prospect's dedicated section with ### header
  const sections = content.split('###');
  for (const section of sections) {
    if (section.includes(prospectName) && (section.includes('(Director') || section.includes('(HR') || section.includes('(Executive') || section.includes('(People'))) {
      return section;
    }
  }
  return content;
}

function extractSeniority(section) {
  // Look for table row with prospect name and extract seniority column
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|\s*[^|]*\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractTenure(section) {
  // Look for table row and extract tenure column (4th column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractEmploymentStatus(section) {
  // Look for table row and extract status column (5th column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractEquityValue(section) {
  // Look for table row and extract equity value column (6th column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractPreferredChannel(section) {
  // Look for table row and extract preferred channel (last column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractLiquiditySignals(section) {
  // Look for table row and extract liquidity signals column (8th column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractEquityLikelihood(section) {
  // Look for table row and extract equity likelihood column (7th column)
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  return tableMatch ? tableMatch[1].trim() : null;
}

function extractLiquidityScore(section) {
  // Look for table row and extract liquidity score column
  const tableMatch = section.match(/\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*([^|]*)\s*\|/);
  if (tableMatch) {
    const scoreText = tableMatch[1].trim();
    const scoreNum = parseInt(scoreText);
    return isNaN(scoreNum) ? null : scoreNum;
  }
  return null;
}

function extractOutreachStrategy(section) {
  // Look for detailed prospect section with outreach strategy
  const strategyMatch = section.match(/\*\*Personalized Outreach:\*\*\s*([^*]+)/i);
  return strategyMatch ? strategyMatch[1].trim() : null;
}

function extractSalesSummary(section) {
  // Look for detailed prospect section with sales summary
  const summaryMatch = section.match(/\*\*Sales Summary:\*\*\s*[>]?\s*([^*"]+)/i);
  return summaryMatch ? summaryMatch[1].trim() : null;
}

// Helper function to get company domain
function getCompanyDomain(companyName) {
  const domainMap = {
    'anthropic': 'anthropic.com',
    'openai': 'openai.com', 
    'stripe': 'stripe.com',
    'databricks': 'databricks.com',
    'figma': 'figma.com',
    'discord': 'discord.com',
    'mistral': 'mistral.ai',
    'midjourney': 'midjourney.com',
    'notion': 'notion.so',
    'linear': 'linear.app',
    'vercel': 'vercel.com',
    'replit': 'replit.com',
    'huggingface': 'huggingface.co',
    'scale': 'scale.com',
    'cohere': 'cohere.com'
  };
  
  return domainMap[companyName.toLowerCase()] || `${companyName.toLowerCase()}.com`;
}

// Helper function to generate LinkedIn URLs
function generateLinkedInURL(name) {
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
  return `https://linkedin.com/in/${slug}`;
}

// Parse Hunter response into Hiive prospect format
function parseHunterResults(hunterData, companyName) {
  const prospects = [];
  
  if (!hunterData.data?.emails) {
    console.log('❌ No email data found in Hunter response');
    return prospects;
  }
  
  console.log(`\n🔍 Parsing ${hunterData.data.emails.length} Hunter.io results for ${companyName}`);
  
  hunterData.data.emails.forEach(email => {
    if (email.first_name && email.last_name && email.position) {
      const prospect = {
        person_name: `${email.first_name} ${email.last_name}`,
        current_job_title: email.position,
        company_name: companyName,
        linkedin_profile: generateLinkedInURL(`${email.first_name} ${email.last_name}`),
        email_address: email.value,
        years_at_company: "2+ years", // Default estimate
        match_confidence: email.confidence / 100,
        seniority_level: email.seniority || "unknown",
        department: email.department || "unknown",
        source: 'hunter_domain_search',
        discovered_at: new Date().toISOString()
      };
      
      console.log(`\n📝 Found prospect: ${prospect.person_name}`);
      console.log(`  Title: ${prospect.current_job_title}`);
      console.log(`  Email: ${prospect.email_address}`);
      console.log(`  Confidence: ${prospect.match_confidence}`);
      console.log(`  Seniority: ${prospect.seniority_level}`);
      console.log(`  Department: ${prospect.department}`);
      
      prospects.push(prospect);
    }
  });
  
  console.log(`\n✅ Parsed ${prospects.length} valid prospects from Hunter data`);
  return prospects;
}

// Replace Exa with Hunter.io Domain Search
async function findEquityProspects(companyName, companyProfile) {
  console.log('\n=== HUNTER.IO PROSPECT DISCOVERY ===');
  console.log(`🔍 Finding real equity prospects for ${companyName}`);
  
  // Check for API key
  if (!process.env.HUNTER_API_KEY) {
    console.error('❌ HUNTER_API_KEY not found - cannot search for real prospects');
    return { results: [] };
  }

  try {
    // Get company domain
    const domain = getCompanyDomain(companyName);
    console.log(`🌐 Using domain: ${domain}`);
    
    // Hunter.io Domain Search API call
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${process.env.HUNTER_API_KEY}&limit=25`
    );
    
    if (!response.ok) {
      throw new Error(`Hunter API returned ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log(`\n📊 Hunter.io API Response:`);
    console.log(`  Total emails found: ${data.data.emails?.length || 0}`);
    console.log(`  Domain: ${data.data.domain}`);
    console.log(`  Organization: ${data.data.organization}`);
    
    // Parse Hunter response into prospect format
    const prospects = parseHunterResults(data, companyName);
    
    console.log(`\n✅ Found ${prospects.length} prospects from Hunter.io`);
    return { results: prospects };
    
  } catch (error) {
    console.error(`\n❌ Hunter.io API error:`, error);
    return { results: [] };
  }
}

// Helper to validate real prospect data
function isValidProspect(prospect) {
  const name = prospect.person_name?.trim() || '';
  const title = prospect.current_job_title?.trim() || '';
  
  console.log(`\n🔍 Validating prospect: ${name} (${title})`);
  
  // Simple validation - just check for real names and titles
  const hasRealName = name.length > 3 && 
                      name.includes(' ') && 
                      /^[A-Za-z\s'-]+$/.test(name); // Only letters, spaces, hyphens, apostrophes
                      
  const hasRealTitle = title.length > 3 && 
                      title !== 'Employed' && 
                      !title.includes('User Agreement') &&
                      !title.includes('Terms of Service');
  
  const result = hasRealName && hasRealTitle;
  
  // Log detailed validation results
  console.log(`\n📊 Validation results for ${name}:`);
  console.log(`  hasRealName: ${hasRealName} (${name.length > 3 ? '✅' : '❌'} length, ${name.includes(' ') ? '✅' : '❌'} space, ${/^[A-Za-z\s'-]+$/.test(name) ? '✅' : '❌'} chars)`);
  console.log(`  hasRealTitle: ${hasRealTitle} (${title.length > 3 ? '✅' : '❌'} length, ${title !== 'Employed' ? '✅' : '❌'} not generic)`);
  console.log(`  Final result: ${result ? '✅ Valid prospect' : '❌ Invalid prospect'}`);
  
  return result;
}

function isRealisticSeller(prospect, companyName) {
  const name = prospect.person_name.toLowerCase();
  const title = prospect.current_job_title.toLowerCase();
  
  console.log(`\n🔍 Evaluating prospect: ${prospect.person_name} (${prospect.current_job_title})`);
  console.log(`Company: ${companyName}`);
  
  // Company-specific founder detection
  const companyFounders = {
    'anthropic': [
      'jack clark', 'dario amodei', 'daniela amodei', 
      'chris olah', 'sam mccandlish', 'jared kaplan',
      'tom brown', 'nick frosst'
    ],
    'openai': [
      'sam altman', 'greg brockman', 'ilya sutskever', 
      'john schulman', 'wojciech zaremba', 'andrei karpathy'
    ],
    'midjourney': [
      'david holz', 'jim holz', 'natasha dow schüll'
    ],
    'mistral': [
      'arthur mensch', 'guillaume lample', 'timothée lacroix'
    ],
    'databricks': [
      'ali ghodsi', 'matei zaharia', 'reynold xin',
      'andy konwinski', 'patrick wendell', 'ion stoica'
    ]
  };
  
  // Check for company-specific founders
  const founders = companyFounders[companyName.toLowerCase()] || [];
  const isCompanyFounder = founders.some(founder => name.includes(founder));
  
  // Generic executive detection
  const executiveKeywords = [
    'ceo', 'chief executive', 
    'cto', 'chief technology', 
    'cfo', 'chief financial',
    'coo', 'chief operating',
    'founder', 'co-founder',
    'president', 
    'vice president', 'vp ',
    'svp', 'senior vice president',
    'chief' // Exclude all C-suite roles
  ];
  
  // Technical roles that are realistic sellers
  const allowedHeadRoles = [
    'head of hardware', 'head of engineering', 'head of product', 
    'head of design', 'head of research', 'head of ai', 'head of ml',
    'head of data', 'head of security', 'head of infrastructure',
    'head of platform', 'head of mobile', 'head of frontend',
    'head of backend', 'head of devops', 'head of qa',
    // Expanded roles:
    'head of people', 'head of talent', 'head of operations', 'head of business development',
    'head of partnerships', 'head of customer success', 'head of sales', 'head of marketing',
    'head of finance', 'head of legal', 'head of compliance', 'head of communications',
    'head of strategy', 'head of analytics', 'head of growth', 'head of support',
    'head of community', 'head of hr', 'head of recruiting', 'head of innovation',
    'head of commercialization', 'head of procurement', 'head of supply chain',
    'head of logistics', 'head of risk', 'head of privacy', 'head of content',
    'head of brand', 'head of revenue', 'head of business operations',
    'head of customer experience', 'head of enterprise', 'head of solutions',
    'head of enablement', 'head of insights', 'head of learning', 'head of development',
    'head of science', 'head of clinical', 'head of regulatory', 'head of quality',
    'head of manufacturing', 'head of distribution', 'head of alliances', 'head of capital',
    'head of management'
  ];
  
  // Director-level roles that are often senior ICs with equity
  const allowedDirectorRoles = [
    'director of engineering', 'director of product', 
    'director of design', 'director of research',
    'engineering director', 'product director',
    'research director', 'design director'
  ];
  
  // Check if this is an allowed senior IC role
  const isAllowedHead = allowedHeadRoles.some(role => title.includes(role));
  const isAllowedDirector = allowedDirectorRoles.some(role => title.includes(role));
  
  // Check for true executives (C-suite, VPs, founders)
  const isExecutive = executiveKeywords.some(keyword => title.includes(keyword));
  
  // Check for founder patterns in names or titles
  const hasFounderName = name.includes('founder') || title.includes('founder');
  
  // Allow if not executive AND not founder AND not company founder
  // OR if it's an allowed senior IC role
  const result = (!isExecutive && !hasFounderName && !isCompanyFounder) || isAllowedHead || isAllowedDirector;
  
  // Log detailed decision factors
  console.log(`\n📊 Decision factors for ${prospect.person_name}:`);
  console.log(`  isExecutive: ${isExecutive} (${executiveKeywords.filter(k => title.includes(k)).join(', ') || 'none'})`);
  console.log(`  hasFounderName: ${hasFounderName}`);
  console.log(`  isCompanyFounder: ${isCompanyFounder} (${founders.filter(f => name.includes(f)).join(', ') || 'none'})`);
  console.log(`  isAllowedHead: ${isAllowedHead} (${allowedHeadRoles.filter(r => title.includes(r)).join(', ') || 'none'})`);
  console.log(`  isAllowedDirector: ${isAllowedDirector} (${allowedDirectorRoles.filter(r => title.includes(r)).join(', ') || 'none'})`);
  console.log(`  Final result: ${result ? '✅ Realistic seller' : '❌ Not a realistic seller'}`);
  
  return result;
}

// ===== MAIN ENDPOINTS =====

// GET /api/find-prospects/:company endpoint
app.get('/api/find-prospects/:company', async (req, res) => {
  const startTime = Date.now();
  try {
    const company = req.params.company;
    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    console.log(`🏢 Starting prospect discovery for: ${company}`);

    // STEP 1: Hunter.io discovery
    console.log('🔍 Step 1: Finding prospects with Hunter.io...');
    const prospectResults = await findEquityProspects(company, {});
    console.log(`🔍 Discovery completed: found ${prospectResults?.results?.length || 0} prospects`);

    if (!prospectResults?.results || prospectResults.results.length === 0) {
      return res.json({
        success: true,
        company: company,
        prospects_found: 0,
        prospects_stored: 0,
        prospects: [],
        message: 'No prospects found for this company'
      });
    }

    // STEP 2: Filter prospects
    console.log('🔍 Step 2: Filtering for realistic sellers...');
    const filteredProspects = prospectResults.results.filter(prospect => {
      const isRealistic = isRealisticSeller(prospect, company);
      const isValid = isValidProspect(prospect);
      return isRealistic && isValid;
    });
    console.log(`✅ Found ${filteredProspects.length} realistic prospects`);

    if (filteredProspects.length === 0) {
      return res.json({
        success: true,
        company: company,
        prospects_found: 0,
        prospects_stored: 0,
        prospects: [],
        message: 'No realistic prospects found after filtering'
      });
    }

    // STEP 3: Perplexity analysis and processing
    console.log('💡 Step 3: Analyzing company and prospects with Perplexity...');
    let perplexityResponse;
    try {
      perplexityResponse = await researchCompanyAndProspects(company, filteredProspects);
      console.log('✅ Perplexity analysis complete');
    } catch (error) {
      console.error('💥 Perplexity analysis failed:', error.message);
      return res.status(500).json({
        error: 'Perplexity analysis failed',
        details: error.message,
        company: company
      });
    }

    // Extract company insights
    const companyInsights = extractCompanyInsights(perplexityResponse);
    console.log('🏢 Company insights extracted:', companyInsights);

    let storedCount = 0;
    console.log(`📊 Processing ${filteredProspects.length} prospects with Perplexity intelligence...`);

    // Process each prospect
    for (let i = 0; i < filteredProspects.length; i++) {
      const prospect = filteredProspects[i];
      console.log(`\n💾 Processing prospect ${i+1}/${filteredProspects.length}: ${prospect.person_name}`);
      
      try {
        // Calculate dynamic multiplier
        const companyMultiplier = extractCompanyMultiplier(perplexityResponse, company);
        
        // Build company profile
        const companyProfile = { 
          equityMultiplier: companyMultiplier,
          stage: companyInsights.stage || 'Unknown',
          valuation: companyInsights.valuation || 1000000000
        };

        // Calculate scores
        let equityScore = calculateEquityScore(prospect, companyProfile);
        let dataConfidence = calculateProspectConfidence(prospect, companyProfile, perplexityResponse);
        
        // Generate intelligence
        const enhancedIntelligence = createEnhancedIntelligence(prospect, perplexityResponse, company);
        
        // Debug checkpoint - ensure we reach status logic
        console.log(`🔍 REACHED STATUS SECTION for ${prospect.person_name} - equity: ${equityScore}, confidence: ${dataConfidence}`);
        
        // Determine status with debug logging
        let status = 'Needs Research';
        console.log(`🎯 STATUS CALCULATION for ${prospect.person_name}:`);
        console.log(`  equityScore: ${equityScore} (${typeof equityScore})`);
        console.log(`  dataConfidence: ${dataConfidence} (${typeof dataConfidence})`);

        if (equityScore >= 7 && dataConfidence >= 4) {
          status = 'Qualified';
          console.log(`  ✅ QUALIFIED: High equity (${equityScore}≥7) + High confidence (${dataConfidence}≥4)`);
        } else if (equityScore >= 6 && dataConfidence >= 3) {
          status = 'Qualified';
          console.log(`  ✅ QUALIFIED: Good equity (${equityScore}≥6) + Good confidence (${dataConfidence}≥3)`);
        } else {
          console.log(`  ❌ NEEDS RESEARCH: Low equity or confidence`);
        }

        console.log(`  FINAL STATUS: ${status}`);
        
        // After determining status, ensure it is lowercase
        status = status.toLowerCase();
        
        console.log(`📊 Final scores: Equity: ${equityScore}/10, Confidence: ${dataConfidence}/5, Status: ${status}`);
        
        // Store in database
        const { data, error } = await supabase
          .from('prospects')
          .insert([{
            full_name: prospect.person_name,
            role_title: prospect.current_job_title,
            company_name: company,
            prospect_type: 'seller',
            priority_score: equityScore,
            qualification_status: status,
            confidence_level: dataConfidence,
            research_notes: JSON.stringify(enhancedIntelligence),
            discovery_method: 'perplexity_automated'
          }]);
          
        if (error) {
          console.error('❌ Database error for', prospect.person_name, ':', error.message);
        } else {
          console.log('✅ STORED:', prospect.person_name);
          storedCount++;
        }
        
      } catch (err) {
        console.error('❌ Failed to process prospect:', prospect.person_name, err.message);
        continue;
      }
    }

    console.log(`🎉 Processing complete: ${storedCount}/${filteredProspects.length} prospects stored`);

    // Return success response
    res.json({
      success: true,
      company: company,
      prospects_found: filteredProspects.length,
      prospects_stored: storedCount,
      processing_time: `${Date.now() - startTime}ms`,
      processing_mode: 'perplexity_production'
    });

  } catch (error) {
    console.error('💥 Endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      company: req.params?.company || 'unknown',
      processing_time: `${Date.now() - startTime}ms`
    });
  }
});

// POST /api/find-prospects endpoint
app.post('/api/find-prospects', async (req, res) => {
  const startTime = Date.now();
  try {
    const { company } = req.body;
    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    console.log(`🏢 Starting prospect discovery for: ${company}`);

    // STEP 1: Hunter.io discovery
    console.log('🔍 Step 1: Finding prospects with Hunter.io...');
    const prospectResults = await findEquityProspects(company, {});
    console.log(`🔍 Discovery completed: found ${prospectResults?.results?.length || 0} prospects`);

    if (!prospectResults?.results || prospectResults.results.length === 0) {
      return res.json({
        success: true,
        company: company,
        prospects_found: 0,
        prospects_stored: 0,
        prospects: [],
        message: 'No prospects found for this company'
      });
    }

    // STEP 2: Filter prospects
    console.log('🔍 Step 2: Filtering for realistic sellers...');
    const filteredProspects = prospectResults.results.filter(prospect => {
      const isRealistic = isRealisticSeller(prospect, company);
      const isValid = isValidProspect(prospect);
      return isRealistic && isValid;
    });
    console.log(`✅ Found ${filteredProspects.length} realistic prospects`);

    if (filteredProspects.length === 0) {
      return res.json({
        success: true,
        company: company,
        prospects_found: 0,
        prospects_stored: 0,
        prospects: [],
        message: 'No realistic prospects found after filtering'
      });
    }

    // STEP 3: Perplexity analysis and processing
    console.log('💡 Step 3: Analyzing company and prospects with Perplexity...');
    let perplexityResponsePOST;
    try {
      perplexityResponsePOST = await researchCompanyAndProspects(company, filteredProspects);
      console.log('✅ Perplexity analysis complete');
    } catch (error) {
      console.error('💥 Perplexity analysis failed:', error.message);
      return res.status(500).json({
        error: 'Perplexity analysis failed',
        details: error.message,
        company: company
      });
    }

    // Extract company insights
    const companyInsights = extractCompanyInsights(perplexityResponsePOST);
    console.log('🏢 Company insights extracted:', companyInsights);

    let storedCount = 0;
    console.log(`📊 Processing ${filteredProspects.length} prospects with Perplexity intelligence...`);

    // Process each prospect
    for (let i = 0; i < filteredProspects.length; i++) {
      const prospect = filteredProspects[i];
      console.log(`\n💾 Processing prospect ${i+1}/${filteredProspects.length}: ${prospect.person_name}`);
      
      try {
        // Calculate dynamic multiplier
        const companyMultiplier = extractCompanyMultiplier(perplexityResponsePOST, company);
        
        // Build company profile
        const companyProfile = { 
          equityMultiplier: companyMultiplier,
          stage: companyInsights.stage || 'Unknown',
          valuation: companyInsights.valuation || 1000000000
        };

        // Calculate scores
        let equityScore = calculateEquityScore(prospect, companyProfile);
        let dataConfidence = calculateProspectConfidence(prospect, companyProfile, perplexityResponsePOST);
        
        // Generate intelligence
        const enhancedIntelligence = createEnhancedIntelligence(prospect, perplexityResponsePOST, company);
        
        // Debug checkpoint - ensure we reach status logic
        console.log(`🔍 REACHED STATUS SECTION for ${prospect.person_name} - equity: ${equityScore}, confidence: ${dataConfidence}`);
        
        // Determine status with debug logging
        let status = 'Needs Research';
        console.log(`🎯 STATUS CALCULATION for ${prospect.person_name}:`);
        console.log(`  equityScore: ${equityScore} (${typeof equityScore})`);
        console.log(`  dataConfidence: ${dataConfidence} (${typeof dataConfidence})`);

        if (equityScore >= 7 && dataConfidence >= 4) {
          status = 'Qualified';
          console.log(`  ✅ QUALIFIED: High equity (${equityScore}≥7) + High confidence (${dataConfidence}≥4)`);
        } else if (equityScore >= 6 && dataConfidence >= 3) {
          status = 'Qualified';
          console.log(`  ✅ QUALIFIED: Good equity (${equityScore}≥6) + Good confidence (${dataConfidence}≥3)`);
        } else {
          console.log(`  ❌ NEEDS RESEARCH: Low equity or confidence`);
        }

        console.log(`  FINAL STATUS: ${status}`);
        
        // After determining status, ensure it is lowercase
        status = status.toLowerCase();
        
        console.log(`📊 Final scores: Equity: ${equityScore}/10, Confidence: ${dataConfidence}/5, Status: ${status}`);
        
        // Store in database
        const { data, error } = await supabase
          .from('prospects')
          .insert([{
            full_name: prospect.person_name,
            role_title: prospect.current_job_title,
            company_name: company,
            prospect_type: 'seller',
            priority_score: equityScore,
            qualification_status: status,
            confidence_level: dataConfidence,
            research_notes: JSON.stringify(enhancedIntelligence),
            discovery_method: 'perplexity_automated'
          }]);
          
        if (error) {
          console.error('❌ Database error for', prospect.person_name, ':', error.message);
        } else {
          console.log('✅ STORED:', prospect.person_name);
          storedCount++;
        }
        
      } catch (err) {
        console.error('❌ Failed to process prospect:', prospect.person_name, err.message);
        continue;
      }
    }

    console.log(`🎉 Processing complete: ${storedCount}/${filteredProspects.length} prospects stored`);

    // Return success response
    res.json({
      success: true,
      company: company,
      prospects_found: filteredProspects.length,
      prospects_stored: storedCount,
      processing_time: `${Date.now() - startTime}ms`,
      processing_mode: 'perplexity_production'
    });

  } catch (error) {
    console.error('💥 Endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      company: req.body?.company || 'unknown',
      processing_time: `${Date.now() - startTime}ms`
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test database connection - show all prospects
app.get('/api/test-db', async (req, res) => {
  console.log('🔍 Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ Database test successful - found ${data.length} prospects`);
    res.json({ 
      status: 'db_working', 
      total_prospects: data.length,
      prospects: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Delete prospect endpoint
app.delete('/api/prospects/:id', async (req, res) => {
  console.log('🗑️ Delete prospect request for ID:', req.params.id);
  try {
    const prospectId = req.params.id;
    if (!prospectId) {
      return res.status(400).json({ error: 'Prospect ID is required' });
    }
    
    const { data, error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', prospectId);
    
    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ error: 'Failed to delete prospect from database' });
    }
    
    console.log('✅ Prospect deleted successfully:', prospectId);
    res.json({ success: true, message: 'Prospect deleted successfully' });
  } catch (error) {
    console.error('Delete prospect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Server running on port', PORT);
  console.log('\nAvailable endpoints:');
  console.log('💚 Health: http://localhost:' + PORT + '/api/health');
  console.log('💾 Test DB: http://localhost:' + PORT + '/api/test-db');
  console.log('🔍 Find Prospects GET: http://localhost:' + PORT + '/api/find-prospects/:company');
  console.log('🔍 Find Prospects POST: http://localhost:' + PORT + '/api/find-prospects');
  console.log('🗑️ Delete Prospect: DELETE http://localhost:' + PORT + '/api/prospects/:id');
});
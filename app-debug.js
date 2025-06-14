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

// Update Perplexity research with deep secondary market analysis
let lastPerplexityCall = 0;
const PERPLEXITY_DELAY = 15000; // 15 seconds between calls
const PERPLEXITY_TIMEOUT = 10000; // 10 second timeout

// Enhanced mock research data for testing
const MOCK_RESEARCH_DATA = {
  // Default mock data
  default: {
    role_details: "Senior Engineering Manager at Apple",
    career_history: "10+ years in software engineering, previously at Google",
    expertise: "Cloud infrastructure, distributed systems, team leadership",
    outreach_angles: ["Technical leadership experience", "Cloud migration expertise"]
  },
  // Specific mock data for known prospects
  "John Ternus": {
    role_details: "Senior VP Hardware Engineering at Apple, 15+ year veteran",
    career_history: "Long tenure at Apple, likely significant equity ownership",
    expertise: "Hardware engineering, product development",
    outreach_angles: ["Secondary market liquidity for Apple equity", "Executive-level equity discussion"]
  },
  "Tim Cook": {
    role_details: "CEO of Apple Inc., leading one of the world's most valuable companies",
    career_history: "Over 20 years at Apple, previously COO, extensive experience in operations and supply chain",
    expertise: "Global operations, supply chain management, corporate leadership",
    outreach_angles: ["Long-term equity planning", "Executive compensation strategies"]
  }
};

// Privacy-compliant prospect discovery configuration
const ethicalProspecting = {
  dataSources: [
    'Public LinkedIn profiles only',
    'Company press releases and blogs',
    'SEC filings and public documents',
    'Industry databases (Crunchbase, etc.)'
  ],
  
  disclaimers: {
    equityEstimates: 'Estimates based on public data and industry benchmarks',
    personalInfo: 'All data sourced from publicly available information',
    accuracy: 'Confidence levels indicate data reliability, not guarantees'
  },
  
  complianceFeatures: {
    optOutMechanism: true,
    dataRetentionLimits: '90 days unless prospect engaged',
    gdprCompliant: true
  }
};

// Realistic seller targeting configuration
const realisticSellerTargeting = {
  roles: {
    // High probability sellers
    primary: [
      "senior software engineer",
      "staff engineer", 
      "principal engineer",
      "senior product manager",
      "engineering manager",
      "senior designer",
      "technical lead",
      "senior data scientist"
    ],
    
    // Medium probability sellers  
    secondary: [
      "director of engineering",
      "senior director",
      "head of product"
    ],
    
    // Exclude (won't sell)
    exclude: [
      "CEO", "CTO", "CFO", "founder", "co-founder", 
      "VP", "SVP", "chief", "president"
    ]
  },

  sellingIndicators: {
    careerTransition: [
      "new job", "joined", "moved to", "now at", 
      "recently started", "career change"
    ],
    
    lifeStage: [
      "personal finance", "investment", "diversification",
      "financial planning", "portfolio"
    ],
    
    tenure: [
      "4+ years", "5+ years", "long-term", 
      "veteran", "experienced"
    ]
  },

  companySpecificTerms: {
    preIPO: "pre-IPO liquidity secondary market equity selling",
    unicorn: "unicorn equity diversification risk management",
    earlyStage: "startup equity vested options"
  }
};

// Hiive-specific integration features
const hiiveIntegration = {
  crmExport: {
    format: 'hiive_prospect_schema',
    fields: ['contact_info', 'equity_estimate', 'outreach_priority', 'research_notes'],
    workflow: 'Direct import to Hiive seller pipeline'
  },
  outreachTemplates: {
    diversification: 'Focus on portfolio risk management',
    liquidity: 'Emphasize immediate access to capital',
    lifeEvents: 'Personalized based on detected life stage needs'
  },
  conversionTracking: {
    trackOutreachToResponse: true,
    trackResponseToMeeting: true,
    trackMeetingToTransaction: true,
    improveTargetingBasedOnOutcomes: true
  }
};

// Market intelligence features
const marketIntelligence = {
  companyTiming: {
    ipoRumors: 'Track IPO timeline rumors and implications',
    fundingEvents: 'Recent funding = equity refresh = selling opportunity',
    executiveDepartures: 'Leadership changes often trigger employee equity decisions'
  },
  
  marketConditions: {
    secondaryMarketActivity: 'Track recent transactions in similar companies',
    valuationTrends: 'Company valuation appreciation drives selling motivation',
    taxImplications: 'Year-end selling for tax optimization'
  },
  
  competitorTracking: {
    otherMarketplaces: 'Monitor Forge, EquityZen activity',
    pricingData: 'Recent transaction prices for benchmarking'
  }
};

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

// Enhanced quality scoring function
function calculateQualityScore(result) {
  let score = 0;
  if (result.match_confidence) score += result.match_confidence * 50; // up to 50
  if (result.tenure_verification === 'Match') score += 20;
  if (result.position_validation === 'Match') score += 20;
  if (result.equity_indicators && result.equity_indicators.length > 0) score += 10;
  return Math.round(score);
}

// New comprehensive system prompt
const systemPrompt = `You are a senior equity sales analyst specializing in pre-IPO secondary market intelligence. For each individual prospect, provide structured, actionable data to support outbound equity sales. Analyze both company fundamentals and individual prospect details for comprehensive sales intelligence.`;

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

// Helper to build realistic seller query for Exa
function buildRealisticSellerQuery(companyName, companyProfile) {
  console.log(`\n🔍 Building equity-focused search query for ${companyName}`);
  
  // Expanded query targeting equity-holding roles
  const query = `${companyName} ` + [
    // Engineering IC roles
    '"Senior Software Engineer"',
    '"Staff Engineer"',
    '"Principal Engineer"',
    '"Member of Technical Staff"',
    '"Senior Research Scientist"',
    '"Research Engineer"',
    '"ML Engineer"',
    
    // Product roles
    '"Senior Product Manager"',
    '"Staff Product Manager"',
    '"Principal Product Manager"',
    
    // Design roles
    '"Senior Designer"',
    '"Staff Designer"',
    '"Principal Designer"',
    
    // Infrastructure & Security
    '"Senior DevOps Engineer"',
    '"Staff SRE"',
    '"Senior Platform Engineer"',
    '"Security Engineer"',
    '"Senior Security Engineer"',
    
    // Data & Research
    '"Data Scientist"',
    '"Senior Data Scientist"',
    '"Research Scientist"',
    
    // Engineering Management
    '"Engineering Manager"',
    '"Senior Engineering Manager"',
    '"Technical Lead"',
    '"Senior Technical Lead"'
  ].join(' ');
  
  console.log(`📝 Generated equity-focused query: ${query}`);
  return query;
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
    
    // Filter for realistic equity sellers
    console.log('\n🔍 Filtering for realistic equity sellers...');
    const filteredProspects = prospects.filter(prospect => {
      const isRealistic = isRealisticSeller(prospect, companyName);
      const isValid = isValidProspect(prospect);
      
      console.log(`\n📊 Evaluating ${prospect.person_name}:`);
      console.log(`  isRealisticSeller: ${isRealistic ? '✅' : '❌'}`);
      console.log(`  isValidProspect: ${isValid ? '✅' : '❌'}`);
      
      return isRealistic && isValid;
    });
    
    console.log(`\n✅ Found ${filteredProspects.length} realistic equity prospects`);
    return { results: filteredProspects };
    
  } catch (error) {
    console.error(`\n❌ Hunter.io API error:`, error);
    return { results: [] };
  }
}

// Update the main API endpoint
app.get('/api/find-prospects/:company', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log('🔍 Find prospects request for:', req.params.company);
    const company = req.params.company;
    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    req.setTimeout(300000); // 5 minutes
    console.log(`🏢 Starting prospect discovery for: ${company}`);

    // STEP 1: Find prospects with Hunter.io (NO Perplexity yet)
    console.log('🔍 Step 1: Finding prospects with Hunter.io...');
    let prospectResults = { results: [] };
    try {
      // Create minimal company profile without Perplexity
      const basicCompanyProfile = {
        companyName: company,
        stage: 'Unknown',
        estimatedValuation: 1000000000,
        equityMultiplier: 1.2
      };
      
      prospectResults = await findEquityProspects(company, basicCompanyProfile);
      console.log(`🔍 Discovery completed: found ${prospectResults?.results?.length || 0} prospects`);
    } catch (discoveryError) {
      console.error('💥 Discovery process failed:', discoveryError.message);
      return res.status(500).json({
        error: 'Prospect discovery failed',
        details: discoveryError.message,
        company: company
      });
    }

    if (!prospectResults?.results || prospectResults.results.length === 0) {
      console.log('⚠️ No prospects found');
      return res.json({
        success: true,
        company: company,
        prospects_found: 0,
        prospects_stored: 0,
        prospects: [],
        message: 'No prospects found for this company'
      });
    }

    // STEP 2: Filter prospects (basic filtering only)
    console.log('🔍 Step 2: Filtering for realistic sellers...');
    const filteredProspects = prospectResults.results.filter(prospect => {
      const isRealistic = isRealisticSeller(prospect, company);
      const isValid = isValidProspect(prospect);
      return isRealistic && isValid;
    });

    console.log(`✅ Found ${filteredProspects.length} realistic prospects`);

    // STEP 3: Process and store with emergency mode (single pass)
    console.log('💾 Step 3: Processing and storing prospects...');
    let storedCount = 0;
    if (filteredProspects.length > 0) {
      try {
        // Use emergency mode - it handles ALL processing internally:
        // - Company analysis
        // - Equity scoring  
        // - Data confidence
        // - Intelligence generation
        // - Database storage
        const processedProspects = await storeEnhancedEmergencyProspects(filteredProspects, company);
        storedCount = processedProspects.length;
        console.log(`💾 Emergency processing complete: ${storedCount} prospects stored`);
      } catch (storageError) {
        console.error('💥 Emergency processing failed:', storageError.message);
      }
    }

    console.log(`✅ Search completed successfully: ${filteredProspects.length} prospects found, ${storedCount} stored`);
    res.json({
      success: true,
      company: company,
      prospects_found: filteredProspects.length,
      prospects_stored: storedCount,
      processing_time: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('💥 Search endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      company: req.params?.company || 'unknown',
      processing_time: `${Date.now() - startTime}ms`
    });
  }
});

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
  
  // Generate LinkedIn URL from name if not present
  if (!prospect.linkedin_profile && hasRealName) {
    const firstName = name.split(' ')[0].toLowerCase();
    const lastName = name.split(' ').slice(1).join('-').toLowerCase();
    prospect.linkedin_profile = `https://www.linkedin.com/in/${firstName}-${lastName}`;
    console.log(`🔗 Generated LinkedIn URL: ${prospect.linkedin_profile}`);
  }
  
  const result = hasRealName && hasRealTitle;
  
  // Log detailed validation results
  console.log(`\n📊 Validation results for ${name}:`);
  console.log(`  hasRealName: ${hasRealName} (${name.length > 3 ? '✅' : '❌'} length, ${name.includes(' ') ? '✅' : '❌'} space, ${/^[A-Za-z\s'-]+$/.test(name) ? '✅' : '❌'} chars)`);
  console.log(`  hasRealTitle: ${hasRealTitle} (${title.length > 3 ? '✅' : '❌'} length, ${title !== 'Employed' ? '✅' : '❌'} not generic)`);
  console.log(`  Final result: ${result ? '✅ Valid prospect' : '❌ Invalid prospect'}`);
  
  return result;
}

// Add endpoint to clear mock prospects
app.delete('/api/clear-mock-prospects', async (req, res) => {
  try {
    console.log('\n=== CLEARING MOCK PROSPECTS ===');
    console.log('🧹 Starting mock data cleanup...');
    
    // Define mock data patterns to identify and remove
    const mockNames = ['Alex Chen', 'Maria Rodriguez', 'David Kim', 'Sarah Johnson'];
    const mockTitles = ['Senior Software Engineer', 'Staff Engineer', 'Senior Product Manager', 'Engineering Manager'];
    
    // First, find all mock prospects
    const { data: mockProspects, error: findError } = await supabase
      .from('prospects')
      .select('id, full_name, role_title, company_name')
      .or(`full_name.in.(${mockNames.map(name => `"${name}"`).join(',')})`);
    
    if (findError) {
      console.error('❌ Error finding mock prospects:', findError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to find mock prospects',
        details: findError.message 
      });
    }
    
    console.log(`\n🔍 Found ${mockProspects?.length || 0} mock prospects to delete:`);
    if (mockProspects?.length > 0) {
      mockProspects.forEach(prospect => {
        console.log(`  - ID ${prospect.id}: ${prospect.full_name} (${prospect.role_title}) at ${prospect.company_name}`);
      });
    } else {
      console.log('✅ No mock prospects found to delete');
      return res.json({ 
        success: true, 
        message: 'No mock prospects found', 
        deleted_count: 0 
      });
    }
    
    // Delete mock prospects by IDs
    const mockIds = mockProspects.map(p => p.id);
    const { error: deleteError } = await supabase
      .from('prospects')
      .delete()
      .in('id', mockIds);
    
    if (deleteError) {
      console.error('❌ Error deleting mock prospects:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete mock prospects',
        details: deleteError.message 
      });
    }
    
    console.log(`\n✅ Successfully deleted ${mockProspects.length} mock prospects`);
    
    // Verify remaining prospects
    const { data: remainingProspects, error: verifyError } = await supabase
      .from('prospects')
      .select('id, full_name, role_title, company_name')
      .order('id');
    
    if (verifyError) {
      console.error('⚠️ Error verifying remaining prospects:', verifyError);
    } else {
      console.log('\n📊 Remaining prospects after cleanup:');
      remainingProspects.forEach(prospect => {
        console.log(`  - ID ${prospect.id}: ${prospect.full_name} (${prospect.role_title}) at ${prospect.company_name}`);
      });
    }
    
    res.json({
      success: true,
      message: `Cleared ${mockProspects.length} mock prospects`,
      deleted_count: mockProspects.length,
      remaining_count: remainingProspects?.length || 0,
      deleted_prospects: mockProspects,
      remaining_prospects: remainingProspects
    });
    
  } catch (error) {
    console.error('❌ Error in clear-mock-prospects:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function to determine seniority
function determineSeniorityLevel(title) {
  const titleLower = (title || "").toLowerCase();
  if (titleLower.includes('ceo') || titleLower.includes('cto') || titleLower.includes('cfo')) return 'C-Suite';
  if (titleLower.includes('vp') || titleLower.includes('vice president')) return 'VP';
  if (titleLower.includes('director')) return 'Director';
  if (titleLower.includes('principal') || titleLower.includes('staff')) return 'Principal';
  return 'Senior';
}

function generateEquityRanges(companyProfile) {
  const baseRanges = {
    "CEO|CTO|CFO": { min: 0.1, max: 1.0 },
    "VP|Vice President": { min: 0.02, max: 0.3 },
    "Director": { min: 0.01, max: 0.15 },
    "Principal|Staff": { min: 0.005, max: 0.08 },
    "Senior|Lead": { min: 0.001, max: 0.03 }
  };
  const adjustedRanges = {};
  Object.keys(baseRanges).forEach(level => {
    adjustedRanges[level] = {
      min: baseRanges[level].min * companyProfile.equityMultiplier,
      max: baseRanges[level].max * companyProfile.equityMultiplier
    };
  });
  return adjustedRanges;
}

function calculateEquityLikelihood(prospect, companyProfile, equityRanges) {
  const tenureMatch = prospect.years_at_company?.match(/(\d+)/);
  const tenureYears = tenureMatch ? parseInt(tenureMatch[1]) : 3;
  const title = prospect.current_job_title?.toLowerCase() || '';
  let positionLevel = 'Senior|Lead';
  for (const level of Object.keys(equityRanges)) {
    if (level.toLowerCase().split('|').some(pos => title.includes(pos.toLowerCase()))) {
      positionLevel = level;
      break;
    }
  }
  const positionMultipliers = {
    "CEO|CTO|CFO": 1.5,
    "VP|Vice President": 1.0,
    "Director": 0.7,
    "Principal|Staff": 0.5,
    "Senior|Lead": 0.3
  };
  const vestingMultiplier = Math.min(tenureYears / 4, 1.0);
  const currentYear = new Date().getFullYear();
  const joinYear = currentYear - tenureYears;
  const earlyJoinerBonus = joinYear < 2010 ? 2.0 : 
                          joinYear < 2015 ? 1.5 : 
                          joinYear < 2020 ? 1.2 : 1.0;
  const baseMultiplier = positionMultipliers[positionLevel] || 0.3;
  const equityScore = baseMultiplier * vestingMultiplier * earlyJoinerBonus * companyProfile.equityMultiplier;
  const equityRange = equityRanges[positionLevel];
  const estimatedOwnership = (equityRange.min + equityRange.max) / 2 * equityScore;
  const liquidityMotivation = Math.min(
    (tenureYears >= 4 ? 3 : 1) +
    (estimatedOwnership > 0.1 ? 3 : estimatedOwnership > 0.05 ? 2 : 1) +
    (companyProfile.estimatedValuation > 100000000000 ? 3 : 2) +
    (earlyJoinerBonus > 1.2 ? 2 : 1),
    10
  );
  return {
    equityScore: Math.min(equityScore * 10, 10),
    estimatedOwnership: estimatedOwnership,
    estimatedValue: estimatedOwnership * companyProfile.estimatedValuation / 100,
    liquidityMotivation: liquidityMotivation,
    confidenceLevel: tenureYears >= 3 ? 5 : 3,
    positionLevel: positionLevel,
    tenureYears: tenureYears,
    joinYear: joinYear
  };
}

// Enhanced confidence calculation
function calculateProspectConfidence(prospect, companyData, sources) {
  const confidenceFactors = {
    // Data source reliability
    linkedinVerified: prospect.linkedin_profile?.includes('linkedin.com') ? 0.3 : 0.1,
    crunchbaseData: companyData.stage !== "Unknown" ? 0.2 : 0.1,
    multipleSourcesConfirm: sources?.length > 2 ? 0.2 : 0.1,
    
    // Role-based confidence
    seniorityLevel: getSeniorityConfidence(prospect.current_job_title),
    tenureConfirmed: prospect.tenure_verification === 'Match' ? 0.2 : 0.1,
    
    // Company context confidence
    fundingStageKnown: companyData.stage !== "Unknown" ? 0.15 : 0.05,
    employeeCountReliable: companyData.employeeCount > 0 ? 0.1 : 0.05
  };
  
  return Math.min(Object.values(confidenceFactors).reduce((a, b) => a + b, 0), 1.0);
}

// Helper function to determine seniority confidence
function getSeniorityConfidence(title) {
  if (!title) return 0.1;
  
  const titleLower = title.toLowerCase();
  if (titleLower.includes('ceo') || titleLower.includes('cto') || titleLower.includes('cfo')) return 0.3;
  if (titleLower.includes('vp') || titleLower.includes('vice president')) return 0.25;
  if (titleLower.includes('director')) return 0.2;
  if (titleLower.includes('principal') || titleLower.includes('staff')) return 0.15;
  if (titleLower.includes('senior') || titleLower.includes('lead')) return 0.1;
  return 0.05;
}

// Helper function to format privacy-compliant research notes
function formatPrivacyCompliantNotes(prospect, equityAnalysis, confidenceScore, companyProfile) {
  return JSON.stringify({
    equity_analysis: {
      estimated_ownership: Math.round(equityAnalysis.estimatedOwnership * 100) / 100,
      confidence_score: confidenceScore,
      seniority_level: getSeniorityConfidence(prospect.current_job_title),
      disclaimer: ethicalProspecting.disclaimers.equityEstimates
    },
    role_details: {
      title: prospect.current_job_title,
      company: companyProfile.companyName,
      data_source: ethicalProspecting.dataSources[0] // LinkedIn
    },
    company_context: {
      stage: companyProfile.stage,
      valuation: companyProfile.estimatedValuation,
      data_source: ethicalProspecting.dataSources[2] // SEC filings
    },
    privacy_compliance: {
      data_retention: ethicalProspecting.complianceFeatures.dataRetentionLimits,
      opt_out_available: ethicalProspecting.complianceFeatures.optOutMechanism,
      gdpr_compliant: ethicalProspecting.complianceFeatures.gdprCompliant
    }
  }, null, 2);
}

// Helper function to determine prospect targeting profile
function determineTargetingProfile(prospect, companyProfile) {
  const title = (prospect.current_job_title || '').toLowerCase();
  const tenure = prospect.years_at_company || 'Unknown';
  
  // Check if prospect should be avoided
  if (title.includes('founder') || title.includes('co-founder')) {
    return {
      profile: 'avoid',
      reason: realisticSellerTargeting.roles.exclude.join(', '),
      conversionProbability: 0.05
    };
  }
  
  if (tenure.includes('1') || tenure.includes('2')) {
    return {
      profile: 'avoid',
      reason: realisticSellerTargeting.roles.exclude.join(', '),
      conversionProbability: 0.1
    };
  }
  
  // Check for primary target profiles
  const isMidLevelWithTenure = realisticSellerTargeting.roles.primary.some(role => 
    title.includes(role.toLowerCase())
  ) && tenure.includes('3') || tenure.includes('4') || tenure.includes('5') || tenure.includes('6') || tenure.includes('7');
  
  const isPreRetirement = realisticSellerTargeting.roles.secondary.some(role =>
    title.includes(role.toLowerCase())
  ) && (tenure.includes('8') || tenure.includes('9') || tenure.includes('10'));
  
  if (isMidLevelWithTenure) {
    return {
      profile: 'midLevelWithTenure',
      motivation: realisticSellerTargeting.roles.primary.join(', '),
      conversionProbability: 0.2
    };
  }
  
  if (isPreRetirement) {
    return {
      profile: 'preRetirement',
      motivation: realisticSellerTargeting.roles.secondary.join(', '),
      conversionProbability: 0.25
    };
  }
  
  // Default to medium probability for other senior roles
  return {
    profile: 'other',
    motivation: 'General equity diversification',
    conversionProbability: 0.15
  };
}

// Helper to format prospect data for Hiive CRM
function formatForHiiveCRM(prospectData, targetingProfile, equityAnalysis) {
  return {
    contact_info: {
      full_name: prospectData.full_name,
      role_title: prospectData.role_title,
      company_name: prospectData.company_name,
      linkedin_url: prospectData.source_urls[0] || null,
      last_updated: new Date().toISOString()
    },
    equity_estimate: {
      estimated_value: equityAnalysis.estimatedValue,
      confidence_score: equityAnalysis.confidenceScore,
      equity_type: equityAnalysis.equityType,
      vesting_status: equityAnalysis.vestingStatus
    },
    outreach_priority: {
      score: prospectData.priority_score,
      qualification_status: prospectData.qualification_status,
      targeting_profile: targetingProfile.profile,
      conversion_probability: targetingProfile.conversionProbability
    },
    research_notes: {
      targeting_insights: targetingProfile.motivation,
      outreach_angle: prospectData.outreach_angle,
      targeting_strategy: JSON.parse(prospectData.targeting_metadata).targeting_strategy,
      privacy_compliant_notes: prospectData.research_notes
    },
    hiive_metadata: {
      export_format: hiiveIntegration.crmExport.format,
      workflow_stage: 'new_prospect',
      outreach_template: determineOutreachTemplate(targetingProfile),
      conversion_tracking: {
        outreach_sent: false,
        response_received: false,
        meeting_scheduled: false,
        transaction_completed: false,
        last_updated: new Date().toISOString()
      }
    }
  };
}

// Helper to determine outreach template
function determineOutreachTemplate(targetingProfile) {
  switch(targetingProfile.profile) {
    case 'midLevelWithTenure':
      return {
        template: 'diversification',
        focus: hiiveIntegration.outreachTemplates.diversification,
        key_points: ['Portfolio diversification', 'Risk management', 'Financial planning']
      };
    case 'preRetirement':
      return {
        template: 'liquidity',
        focus: hiiveIntegration.outreachTemplates.liquidity,
        key_points: ['Retirement planning', 'Wealth preservation', 'Immediate access to capital']
      };
    case 'lifeStageEvents':
      return {
        template: 'lifeEvents',
        focus: hiiveIntegration.outreachTemplates.lifeEvents,
        key_points: ['Life stage planning', 'Major purchase funding', 'Education costs']
      };
    default:
      return {
        template: 'general',
        focus: 'Equity liquidity discussion',
        key_points: ['Portfolio diversification', 'Financial planning', 'Wealth management']
      };
  }
}

// Helper to analyze market timing factors
function analyzeMarketTiming(companyProfile, prospect) {
  const timingFactors = {
    urgencyScore: 0,
    timingInsights: [],
    recommendedOutreachWindow: null
  };

  // Check for recent funding events
  if (companyProfile.lastFundingDate) {
    const fundingDate = new Date(companyProfile.lastFundingDate);
    const monthsSinceFunding = (new Date() - fundingDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceFunding < 3) {
      timingFactors.urgencyScore += 0.3;
      timingFactors.timingInsights.push({
        factor: 'Recent Funding',
        impact: 'High',
        insight: 'Recent funding round likely triggered equity refresh'
      });
    }
  }

  // Check for executive departures
  if (companyProfile.recentDepartures?.length > 0) {
    const recentDeparture = companyProfile.recentDepartures[0];
    const monthsSinceDeparture = (new Date() - new Date(recentDeparture.date)) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsSinceDeparture < 6) {
      timingFactors.urgencyScore += 0.2;
      timingFactors.timingInsights.push({
        factor: 'Executive Departure',
        impact: 'Medium',
        insight: `Recent ${recentDeparture.role} departure may influence equity decisions`
      });
    }
  }

  // Check for IPO rumors
  if (companyProfile.ipoRumors?.active) {
    timingFactors.urgencyScore += 0.4;
    timingFactors.timingInsights.push({
      factor: 'IPO Timeline',
      impact: 'High',
      insight: `Active IPO rumors suggest ${companyProfile.ipoRumors.estimatedTimeline} timeline`
    });
  }

  // Check for tax optimization timing
  const currentMonth = new Date().getMonth();
  if (currentMonth >= 10) { // November or December
    timingFactors.urgencyScore += 0.2;
    timingFactors.timingInsights.push({
      factor: 'Tax Timing',
      impact: 'Medium',
      insight: 'Year-end tax optimization window approaching'
    });
  }

  // Determine recommended outreach window
  if (timingFactors.urgencyScore >= 0.7) {
    timingFactors.recommendedOutreachWindow = 'immediate';
  } else if (timingFactors.urgencyScore >= 0.4) {
    timingFactors.recommendedOutreachWindow = 'within_week';
  } else {
    timingFactors.recommendedOutreachWindow = 'standard';
  }

  return timingFactors;
}

// Helper to analyze market conditions
function analyzeMarketConditions(companyProfile) {
  const marketConditions = {
    marketScore: 0,
    marketInsights: [],
    pricingGuidance: null
  };

  // Analyze secondary market activity
  if (companyProfile.secondaryMarketActivity) {
    const recentTransactions = companyProfile.secondaryMarketActivity.recentTransactions || [];
    if (recentTransactions.length > 0) {
      const avgPrice = recentTransactions.reduce((sum, t) => sum + t.price, 0) / recentTransactions.length;
      marketConditions.marketScore += 0.3;
      marketConditions.marketInsights.push({
        factor: 'Secondary Market Activity',
        impact: 'High',
        insight: `Recent transactions at ${avgPrice.toFixed(2)}x last round`
      });
      marketConditions.pricingGuidance = {
        benchmark: avgPrice,
        confidence: 'high',
        source: 'recent_transactions'
      };
    }
  }

  // Analyze valuation trends
  if (companyProfile.valuationTrend) {
    const trend = companyProfile.valuationTrend;
    if (trend.direction === 'up' && trend.percentage > 20) {
      marketConditions.marketScore += 0.3;
      marketConditions.marketInsights.push({
        factor: 'Valuation Appreciation',
        impact: 'High',
        insight: `Significant valuation increase (${trend.percentage}%) driving selling motivation`
      });
    }
  }

  // Analyze competitor activity
  if (companyProfile.competitorActivity) {
    const competitorData = companyProfile.competitorActivity;
    if (competitorData.recentListings > 0) {
      marketConditions.marketScore += 0.2;
      marketConditions.marketInsights.push({
        factor: 'Competitor Activity',
        impact: 'Medium',
        insight: `Active listings on competitor platforms indicate market demand`
      });
    }
  }

  return marketConditions;
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
  
  // Seniority adjustments (existing logic)
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

// Add helper function to extract specific signals
function extractLiquiditySignals(content) {
  const signals = [];
  
  if (content.includes('layoffs') || content.includes('restructuring')) {
    signals.push('Company announced layoffs/restructuring creating urgency');
  }
  
  if (content.includes('CEO') || content.includes('leadership')) {
    signals.push('Leadership transition increasing uncertainty');
  }
  
  if (content.includes('IPO delays') || content.includes('delayed')) {
    signals.push('IPO delays extending liquidity timeline');
  }
  
  if (content.includes('fully vested') || content.includes('vesting')) {
    signals.push('Employee likely approaching/reached vesting milestones');
  }
  
  if (content.includes('funding round')) {
    signals.push('Recent funding round may enable secondary transactions');
  }
  
  if (content.includes('market volatility') || content.includes('uncertainty')) {
    signals.push('Market conditions favoring portfolio diversification');
  }
  
  return signals.length > 0 ? signals.join('; ') : 'Multiple liquidity drivers identified';
}

// SAFETY: Extraction helpers
const extractSpecificSignals = (perplexityResponse) => {
  try {
    if (!perplexityResponse || typeof perplexityResponse !== 'string') {
      return ['Market conditions favorable for portfolio diversification'];
    }
    const signals = [];
    if (perplexityResponse.includes('$40B') || perplexityResponse.includes('funding')) {
      signals.push('Recent funding activity creates liquidity opportunities');
    }
    if (perplexityResponse.includes('tender') || perplexityResponse.includes('secondary')) {
      signals.push('Secondary market programs available');
    }
    if (perplexityResponse.includes('vested') || perplexityResponse.includes('4+ years')) {
      signals.push('Employee likely approaching or reached vesting milestones');
    }
    return signals.length > 0 ? signals : ['Market timing favorable for equity transactions'];
  } catch (error) {
    console.error('💥 Signal extraction failed:', error);
    return ['Standard market conditions apply'];
  }
};

const createEnhancedIntelligence = (prospect, perplexityResponse, companyName) => {
  try {
    const prospectName = prospect.person_name || prospect.full_name || 'Unknown';
    const prospectRole = prospect.current_job_title || prospect.role_title || 'Unknown Role';
    return {
      job_seniority: 'Senior level',
      estimated_tenure: '2-4 years',
      employment_status: 'Current',
      estimated_equity_value: '0.05-0.15%',
      preferred_channel: 'LinkedIn',
      liquidity_signals: extractSpecificSignals(perplexityResponse).join('; ') || 'Standard market conditions',
      equity_likelihood: 'High',
      liquidity_score: prospect.liquidity_score || 7,
      outreach_strategy: extractOutreachStrategy(perplexityResponse, companyName, prospectName, prospectRole) || `Contact ${prospectName} regarding equity opportunities`,
      sales_summary: extractSalesSummary(perplexityResponse, prospectName, prospectRole, companyName) || `${prospectName} represents a qualified prospect for equity transactions`
    };
  } catch (error) {
    console.error('💥 Enhanced intelligence creation failed:', error);
    return {
      job_seniority: 'Senior level',
      estimated_tenure: '2-4 years',
      employment_status: 'Current',
      estimated_equity_value: '0.05-0.15%',
      preferred_channel: 'LinkedIn',
      liquidity_signals: 'Market conditions favorable for equity transactions',
      equity_likelihood: 'High',
      liquidity_score: 7,
      outreach_strategy: 'Reference company developments and market timing',
      sales_summary: 'Qualified prospect with equity potential'
    };
  }
};

// Add process handlers to prevent abrupt termination
process.on('SIGTERM', () => {
  console.log('📱 Received SIGTERM, gracefully finishing...');
  // Allow current operations to complete
});
process.on('SIGINT', () => {
  console.log('📱 Received SIGINT, gracefully finishing...');
  process.exit(0);
});

// Add Perplexity API call wrapper with timeout
const callPerplexityWithTimeout = async (fetchPromise, timeout = 30000) => {
  return Promise.race([
    fetchPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Perplexity API timeout')), timeout)
    )
  ]);
};

// In storeProspects, process only first 5 prospects to avoid timeout
async function storeProspects(prospects, companyName, companyProfile) {
  const prospectsToProcess = prospects.slice(0, 5);
  console.log(`📊 Processing ${prospectsToProcess.length} prospects (limited to avoid timeout)`);
  let successCount = 0;
  const errors = [];
  for (let i = 0; i < prospectsToProcess.length; i++) {
    const prospect = prospectsToProcess[i];
    console.log(`💾 Processing prospect ${i+1}/${prospectsToProcess.length}: ${prospect.person_name}`);
    try {
      // Add timeout for individual prospect processing
      await Promise.race([
        (async () => {
          // Existing prospect processing logic
          // Add explicit equity scoring with fallback
          try {
            console.log('📊 CALCULATING EQUITY SCORE for:', prospect.person_name);
            const equityScore = calculateEquityScore(prospect, companyProfile);
            prospect.equity_score = equityScore;
            console.log('📊 CALCULATED SCORE:', equityScore, 'for', prospect.person_name);
          } catch (error) {
            console.log('❌ Equity scoring failed, using fallback');
            prospect.equity_score = 5; // Fallback score
          }
          // ... rest of your prospect processing logic ...
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Prospect processing timeout')), 15000)
        )
      ]);
    } catch (error) {
      console.log(`❌ Failed to process ${prospect.person_name}:`, error.message);
      // Continue with next prospect instead of crashing
      continue;
    }
  }
  // ... rest of storeProspects ...
}

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

// Keep working endpoints for reference
app.get('/api/fresh-health', (req, res) => {
  console.log('🎯 Health called');
  res.json({ status: 'working', endpoint: 'health' });
});

app.get('/api/fresh-test', (req, res) => {
  console.log('🎯 Test called');
  res.json({ status: 'working', endpoint: 'test' });
});

app.get('/api/exa-simple', (req, res) => {
  console.log('🎯 Exa simple called');
  res.json({ status: 'working', endpoint: 'exa-simple' });
});

app.get('/api/exa-param/:company', (req, res) => {
  console.log('🎯 Exa param called');
  res.json({ status: 'working', endpoint: 'exa-param', company: req.params.company });
});

// Test Exa API key validity
app.get('/api/test-exa-key', async (req, res) => {
  try {
    const exaKey = process.env.EXA_API_KEY;
    console.log('🔑 Testing Exa API key:', exaKey ? `${exaKey.substring(0, 8)}...` : 'NOT FOUND');
    console.log('🔑 Key length:', exaKey ? exaKey.length : 0);
    
    if (!exaKey) {
      throw new Error('EXA_API_KEY not found in environment variables');
    }

    if (exaKey.length < 32) {
      throw new Error(`Invalid API key length: ${exaKey.length} (expected at least 32 characters)`);
    }
    
    console.log('🔍 Making test request to Exa API...');
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${exaKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'test search',
        numResults: 1
      })
    });
    
    console.log('🔍 Exa API response status:', response.status);
    console.log('🔍 Exa API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Exa API error response:', errorText);
      throw new Error(`Exa API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Exa API test successful');
    
    res.json({
      status: 'exa_key_valid',
      api_response: data,
      key_info: {
        length: exaKey.length,
        prefix: exaKey.substring(0, 8),
        format: 'Bearer token'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Exa API test failed:', error);
    res.status(500).json({
      error: 'Exa API test failed',
      message: error.message,
      key_info: {
        length: process.env.EXA_API_KEY ? process.env.EXA_API_KEY.length : 0,
        exists: !!process.env.EXA_API_KEY
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Test Perplexity API key endpoint
app.get('/api/test-perplexity-key', async (req, res) => {
  console.log('\n🔑 Testing Perplexity API key...');
  const key = process.env.PERPLEXITY_API_KEY;
  console.log('🔑 Key status:', key ? `${key.substring(0,8)}...` : 'Missing');
  
  if (!key) {
    return res.json({
      status: 'missing',
      message: 'Perplexity API key not found in environment',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    console.log('🔍 Making test API call...');
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      })
    });
    
    const status = response.ok ? 'valid' : 'invalid';
    console.log(`✅ API key test result: ${status} (${response.status})`);
    
    res.json({
      status,
      code: response.status,
      message: response.ok ? 'API key is valid' : 'API key is invalid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ API key test failed:', error);
    res.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple API key test endpoint
app.get('/api/test-key', (req, res) => {
  console.log('\n🔑 Testing API key status...');
  const key = process.env.PERPLEXITY_API_KEY;
  const response = {
    status: 'test_complete',
    key_exists: !!key,
    key_length: key ? key.length : 0,
    key_prefix: key ? key.substring(0, 8) : 'none',
    timestamp: new Date().toISOString()
  };
  console.log('🔑 Key status:', response);
  res.json(response);
});

// Generic Exa Neural Search result parsing
function parseNeuralSearchResults(results, companyName) {
  console.log(`\n🔍 Parsing ${results.length} search results for ${companyName}`);
  
  const prospects = [];
  const seenNames = new Set();
  
  for (const result of results) {
    try {
      // Extract name and title from any source
      const nameMatch = result.text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
      const titleMatch = result.text.match(/(?:works as|is|was|role|position|title)[^.]*?([A-Z][a-z]+(?:\s+[A-Za-z]+)+)/i);
      
      if (!nameMatch || !titleMatch) {
        console.log(`❌ Could not extract name/title from: ${result.text.substring(0, 100)}...`);
        continue;
      }
      
      const name = nameMatch[0].trim();
      const title = titleMatch[1].trim();
      
      // Skip if we've seen this name before
      if (seenNames.has(name.toLowerCase())) {
        console.log(`⏭️ Skipping duplicate name: ${name}`);
        continue;
      }
      seenNames.add(name.toLowerCase());
      
      // Create prospect object
      const prospect = {
        person_name: name,
        current_job_title: title,
        company_name: companyName,
        confidence_score: result.score || 0.5,
        source: result.url || 'unknown',
        discovered_at: new Date().toISOString()
      };
      
      // Validate the prospect
      if (isValidProspect(prospect)) {
        console.log(`✅ Found valid prospect: ${name} (${title})`);
        prospects.push(prospect);
      } else {
        console.log(`❌ Invalid prospect: ${name} (${title})`);
      }
      
    } catch (error) {
      console.error(`❌ Error parsing result:`, error);
      continue;
    }
  }
  
  console.log(`\n📊 Found ${prospects.length} valid prospects out of ${results.length} results`);
  return prospects;
}

function extractLinkedInEmployees(text, companyName) {
  const employees = [];
  
  // Multiple patterns for LinkedIn employee entries
  const patterns = [
    // **Name** **Title at Company**
    /\*\*([^*]+)\*\* \*\*([^*]+at [^*]+)\*\*/g,
    // **Name** **Title**
    /\*\*([^*]+)\*\* \*\*([^*]+)\*\*/g,
    // [Name](linkedin-url) Title
    /\[([^\]]+)\]\([^)]*linkedin[^)]*\)\s*([^\n]+)/g,
    // Name - Title at Company
    /([A-Z][a-zA-Z\s]{2,25})\s*[-–]\s*([^,\n]+)(?:at\s+[^,\n]+)?/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      let title = match[2].trim();
      
      // Clean up title
      title = title.replace(new RegExp(`at ${companyName}`, 'i'), '').trim();
      title = title.replace(/^at\s+/i, '').trim();
      
      if (name && title && name.length > 2) {
        employees.push({
          person_name: name,
          current_job_title: title,
          linkedin_profile: buildLinkedInURL(name),
          years_at_company: "2+ years",
          match_confidence: 0.9,
          source: 'linkedin_company_page'
        });
      }
    }
  });
  
  return employees;
}

function extractTeamMembers(text, companyName) {
  const members = [];
  
  // Generic patterns for team member descriptions
  const patterns = [
    // **Name** - Description
    /\*\*([^*]+)\*\* \\?[-–] ([^\n]+)/g,
    // Name: Title/Description
    /([A-Z][a-zA-Z\s]+):\s*([^\n]+)/g,
    // Name, Title
    /([A-Z][a-zA-Z\s]{2,20}),\s*([A-Z][a-zA-Z\s]+)/g,
    // Name - Title at Company
    /([A-Z][a-zA-Z\s]{2,25})\s*[-–]\s*([^,\n]+)(?:at\s+[^,\n]+)?/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();
      
      // Extract or infer job title from description
      const title = inferJobTitle(description);
      
      if (name && title && name.length > 2 && name.split(' ').length <= 4) {
        members.push({
          person_name: name,
          current_job_title: title,
          linkedin_profile: buildLinkedInURL(name),
          years_at_company: inferTenure(description),
          match_confidence: 0.85,
          source: 'company_team_page'
        });
      }
    }
  });
  
  return members;
}

// Helper to extract and clean LinkedIn profile data
function extractLinkedInProfile(text, title, url, companyName) {
  console.log(`\n🔍 Extracting LinkedIn profile from: ${title}`);
  
  // Extract name from LinkedIn profile title
  let nameMatch = title.match(/^([^|]+)/);
  if (!nameMatch) {
    console.log('❌ No name found in title');
    return null;
  }
  
  let name = nameMatch[1].trim();
  console.log(`📝 Raw name: ${name}`);
  
  // Clean up name by removing job titles and company references
  name = name.replace(/\s*-\s*.+$/, ''); // Remove " - Job Title" from name
  name = name.replace(new RegExp(`\\s*at\\s*${companyName}.*`, 'i'), ''); // Remove company references
  name = name.replace(/\s*\|\s*.+$/, ''); // Remove " | Job Title" from name
  name = name.replace(/\s*\([^)]*\)/, ''); // Remove parenthetical notes
  name = name.replace(/\s*\[[^\]]*\]/, ''); // Remove bracketed notes
  name = name.trim();
  
  console.log(`📝 Cleaned name: ${name}`);
  
  // Check if profile mentions the target company
  if (!text.toLowerCase().includes(companyName.toLowerCase()) && 
      !title.toLowerCase().includes(companyName.toLowerCase())) {
    console.log(`❌ Profile does not mention ${companyName}`);
    return null;
  }
  
  // Extract job title from profile content or title
  let jobTitle = inferJobTitleFromProfile(text, title, companyName);
  console.log(`📝 Raw title: ${jobTitle}`);
  
  // Clean up job title by removing company name and extra info
  jobTitle = jobTitle.replace(new RegExp(`\\s*at\\s*${companyName}.*`, 'i'), '');
  jobTitle = jobTitle.replace(new RegExp(`\\s*,\\s*${companyName}.*`, 'i'), '');
  jobTitle = jobTitle.replace(/\s*\([^)]*\)/, ''); // Remove parenthetical notes
  jobTitle = jobTitle.replace(/\s*\[[^\]]*\]/, ''); // Remove bracketed notes
  jobTitle = jobTitle.replace(/\s*\|\s*.+$/, ''); // Remove trailing info after |
  jobTitle = jobTitle.trim();
  
  console.log(`📝 Cleaned title: ${jobTitle}`);
  
  // Validate the cleaned data
  if (!name || !jobTitle) {
    console.log('❌ Missing name or title after cleaning');
    return null;
  }
  
  return {
    person_name: name,
    current_job_title: jobTitle,
    linkedin_profile: url,
    years_at_company: "Unknown",
    match_confidence: 0.8,
    source: 'linkedin_profile'
  };
}

function isTeamPage(url, title, text) {
  const teamIndicators = ['team', 'about', 'people', 'staff', 'employees', 'founders', 'leadership'];
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  const textLower = text.toLowerCase();
  
  return teamIndicators.some(indicator => 
    urlLower.includes(indicator) || 
    titleLower.includes(indicator) ||
    textLower.includes(`our ${indicator}`) ||
    textLower.includes(`meet our ${indicator}`)
  );
}

function inferJobTitle(description) {
  const titlePatterns = {
    'Senior Software Engineer': ['senior engineer', 'senior software', 'senior dev', 'senior developer'],
    'Staff Engineer': ['staff engineer', 'staff software', 'staff dev'],
    'Principal Engineer': ['principal engineer', 'principal software', 'principal dev'],
    'Software Engineer': ['engineer', 'developer', 'dev', 'software', 'programmer'],
    'Product Manager': ['product manager', 'pm', 'product', 'product lead'],
    'Designer': ['designer', 'design', 'ux', 'ui', 'user experience', 'user interface'],
    'AI Research Engineer': ['research', 'ai', 'ml', 'machine learning', 'artificial intelligence'],
    'Data Scientist': ['data scientist', 'data', 'analytics', 'data science'],
    'DevOps Engineer': ['devops', 'infrastructure', 'platform', 'site reliability'],
    'Engineering Manager': ['engineering manager', 'eng manager', 'team lead', 'tech lead'],
    'Technical Lead': ['technical lead', 'tech lead', 'lead engineer', 'lead developer'],
    'Solutions Architect': ['architect', 'solution architect', 'systems architect'],
    'Security Engineer': ['security', 'security engineer', 'security dev'],
    'Mobile Engineer': ['mobile', 'ios', 'android', 'mobile developer'],
    'Frontend Engineer': ['frontend', 'front-end', 'front end', 'web developer'],
    'Backend Engineer': ['backend', 'back-end', 'back end', 'server developer']
  };
  
  const descLower = description.toLowerCase();
  
  for (const [title, keywords] of Object.entries(titlePatterns)) {
    if (keywords.some(keyword => descLower.includes(keyword))) {
      return title;
    }
  }
  
  // Try to extract a title from the description
  const titleMatch = description.match(/([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Lead|Architect|Scientist))/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return 'Software Engineer'; // default
}

function inferJobTitleFromProfile(text, title, companyName) {
  // Extract from title like "Name | Job Title at Company"
  const titleMatch = title.match(/\|\s*([^|]+)\s*at\s+/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // Extract from text content
  const patterns = [
    new RegExp(`Position at ${companyName}:\\s*([^\\n]+)`, 'i'),
    /Position:\s*([^\n]+)/,
    /Current:\s*([^\n]+)/,
    /Job Title:\s*([^\n]+)/,
    /Title:\s*([^\n]+)/,
    /Role:\s*([^\n]+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return inferJobTitle(text);
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
    'head of backend', 'head of devops', 'head of qa'
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

function buildLinkedInURL(name) {
  const urlSlug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, ''); // remove leading/trailing dashes
  return `https://linkedin.com/in/${urlSlug}`;
}

function inferTenure(description) {
  const descLower = description.toLowerCase();
  
  if (descLower.includes('founding') || descLower.includes('early')) return '3+ years';
  if (descLower.includes('senior') || descLower.includes('lead')) return '2+ years';
  if (descLower.includes('staff') || descLower.includes('principal')) return '3+ years';
  
  // Try to extract specific tenure
  const tenureMatch = description.match(/(\d+)\+?\s*years?/i);
  if (tenureMatch) {
    const years = parseInt(tenureMatch[1]);
    return `${years}+ years`;
  }
  
  return '1+ years';
}

function isBlogPost(url) {
  return url.includes('/blog/') || 
         url.includes('/news/') || 
         url.includes('/post/') || 
         url.includes('/articles/') ||
         url.includes('/press/');
}

function mentionsEmployees(text, companyName) {
  const employeeKeywords = ['team', 'engineer', 'developer', 'staff', 'employee', 'member', 'colleague'];
  const textLower = text.toLowerCase();
  const companyLower = companyName.toLowerCase();
  
  return textLower.includes(companyLower) && 
         employeeKeywords.some(keyword => textLower.includes(keyword));
}

function extractBlogEmployees(text, companyName) {
  const employees = [];
  
  // Multiple patterns for employee mentions in blog posts
  const patterns = [
    // "John Smith, Senior Engineer at Company"
    new RegExp(`([A-Z][a-zA-Z\\s]{2,25}),\\s*([^,]+)\\s*at\\s*${companyName}`, 'gi'),
    // "John Smith - Senior Engineer"
    /([A-Z][a-zA-Z\s]{2,25})\s*[-–]\s*([^,\n]+)/g,
    // "John Smith joined as Senior Engineer"
    new RegExp(`([A-Z][a-zA-Z\\s]{2,25})\\s+joined\\s+(?:as\\s+)?([^,.]+)`, 'gi')
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      const title = match[2].trim();
      
      if (name && title && name.length > 2) {
        employees.push({
          person_name: name,
          current_job_title: title,
          linkedin_profile: buildLinkedInURL(name),
          years_at_company: inferTenure(text),
          match_confidence: 0.7,
          source: 'blog_mention'
        });
      }
    }
  });
  
  return employees;
}

function deduplicateProspects(prospects) {
  const seen = new Set();
  return prospects.filter(prospect => {
    const key = prospect.person_name.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Helper function to generate research notes
function generateResearchNotes(prospect, companyProfile) {
  return {
    equity_analysis: {
      estimated_ownership: calculateEquityEstimate(prospect.current_job_title, companyProfile),
      confidence_score: prospect.match_confidence,
      seniority_level: prospect.seniority_level || "mid-level",
      disclaimer: "Estimates based on Hunter.io data and industry benchmarks"
    },
    role_details: {
      title: prospect.current_job_title,
      department: prospect.department || "unknown",
      data_source: "Hunter.io Domain Search"
    },
    company_context: {
      stage: companyProfile.stage,
      valuation: companyProfile.estimatedValuation,
      data_source: "Perplexity company research"
    },
    privacy_compliance: {
      data_retention: "90 days unless prospect engaged",
      opt_out_available: true,
      gdpr_compliant: true
    }
  };
}

// Helper function to generate outreach angle
function generateOutreachAngle(prospect, companyProfile) {
  const role = prospect.current_job_title.toLowerCase();
  const company = companyProfile.companyName || "company";
  
  if (role.includes('engineer') || role.includes('technical')) {
    return `Pre-IPO equity liquidity for ${prospect.current_job_title} - Technical role equity diversification`;
  } else if (role.includes('product') || role.includes('manager')) {
    return `Pre-IPO equity liquidity for ${prospect.current_job_title} - Product role equity optimization`;
  } else if (role.includes('head of') || role.includes('director')) {
    return `Senior role equity diversification at ${company} - Strategic liquidity planning`;
  } else {
    return `Pre-IPO equity liquidity discussion for ${prospect.current_job_title} - Professional equity diversification`;
  }
}

// Helper function to calculate equity estimate
function calculateEquityEstimate(title, companyProfile) {
  const normalizedTitle = title.toLowerCase();
  let estimate = '0.01-0.05%'; // Default conservative estimate
  
  if (normalizedTitle.includes('senior') || normalizedTitle.includes('staff')) {
    estimate = '0.05-0.15%';
  } else if (normalizedTitle.includes('principal') || normalizedTitle.includes('lead')) {
    estimate = '0.15-0.25%';
  } else if (normalizedTitle.includes('director') || normalizedTitle.includes('head of')) {
    estimate = '0.25-0.5%';
  }
  
  // Adjust based on company stage
  if (companyProfile.stage === 'Series D' || companyProfile.stage === 'Series E') {
    // Later stage companies typically have smaller equity grants
    estimate = estimate.split('-').map(v => (parseFloat(v) * 0.7).toFixed(2) + '%').join('-');
  }
  
  return estimate;
}

// Add DELETE endpoint for prospects
app.delete('/api/delete-prospect/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting prospect ID: ${id}`);
    
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Delete error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    console.log(`✅ Successfully deleted prospect ID: ${id}`);
    res.json({ success: true, message: 'Prospect deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
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
    // Delete from Supabase
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

// Endpoint to list all available routes
app.get('/api/endpoints', (req, res) => {
  const routes = [];
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      routes.push({
        method: Object.keys(r.route.methods)[0].toUpperCase(),
        path: r.route.path
      });
    }
  });
  res.json(routes);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n🚀 Server running on port', PORT);
  console.log('\nAvailable endpoints:');
  console.log('💚 Health: http://localhost:' + PORT + '/api/health');
  console.log('💚 Fresh Health: http://localhost:' + PORT + '/api/fresh-health');
  console.log('🔍 Fresh Test: http://localhost:' + PORT + '/api/fresh-test');
  console.log('🔎 Exa Simple: http://localhost:' + PORT + '/api/exa-simple');
  console.log('🔎 Exa Param: http://localhost:' + PORT + '/api/exa-param/:company');
  console.log('💾 Test DB: http://localhost:' + PORT + '/api/test-db');
  console.log('🔍 Find Prospects: http://localhost:' + PORT + '/api/find-prospects/:company');
  console.log('🔑 Test Exa Key: http://localhost:' + PORT + '/api/test-exa-key');
  console.log('🔑 Test Perplexity Key: http://localhost:' + PORT + '/api/test-perplexity-key');
  console.log('🔑 Test Key Status: http://localhost:' + PORT + '/api/test-key');
  console.log('🔬 Research Prospect: http://localhost:' + PORT + '/api/research-prospect/:id');
});

// POST /api/find-prospects endpoint
app.post('/api/find-prospects', async (req, res) => {
  console.log('🔍 Find prospects request:', req.body);
  try {
    const { company } = req.body;
    if (!company) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    console.log(`🏢 Searching for prospects at: ${company}`);

    // Use the same logic as GET endpoint
    const companyProfile = await researchCompanyAndProspects(company, []);
    const prospectResults = await findEquityProspects(company, companyProfile);
    const filteredProspects = prospectResults.results.filter(prospect => {
      const isRealistic = isRealisticSeller(prospect, company);
      const isValid = isValidProspect(prospect);
      return isRealistic && isValid;
    });

    let storedCount = 0;
    if (filteredProspects.length > 0) {
      storedCount = await storeProspects(filteredProspects, company, companyProfile);
    }

    res.json({
      success: true,
      company: companyProfile,
      prospects_found: filteredProspects.length,
      prospects_stored: storedCount,
      prospects: filteredProspects
    });
  } catch (error) {
    console.error('Find prospects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); // Force redeploy Fri Jun 13 16:21:37 PDT 2025

// Add environment check endpoint
app.get('/api/debug/env', (req, res) => {
  res.json({
    supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
    supabase_key: process.env.SUPABASE_ANON_KEY ? 'configured' : 'missing',
    hunter_key: process.env.HUNTER_API_KEY ? 'configured' : 'missing',
    perplexity_key: process.env.PERPLEXITY_API_KEY ? 'configured' : 'missing',
    node_env: process.env.NODE_ENV || 'not set'
  });
});

// Add comprehensive database debugging endpoint
app.get('/api/debug/database', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('prospects')
      .select('id, full_name, company_name')
      .limit(5);
    if (testError) {
      console.error('❌ Database connection error:', testError);
      return res.json({
        status: 'error',
        error: testError.message,
        supabase_url: process.env.SUPABASE_URL ? 'present' : 'missing',
        supabase_key: process.env.SUPABASE_ANON_KEY ? 'present' : 'missing'
      });
    }
    // Get total count
    const { count, error: countError } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true });
    // Get recent prospects
    const { data: recentData, error: recentError } = await supabase
      .from('prospects')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('✅ Database test successful');
    console.log('📊 Total prospects:', count);
    console.log('📋 Recent prospects:', recentData?.length || 0);
    res.json({
      status: 'success',
      total_prospects: count,
      recent_prospects: recentData?.length || 0,
      sample_data: testData,
      recent_data: recentData?.map(p => ({
        id: p.id,
        name: p.full_name,
        company: p.company_name,
        created: p.created_at
      }))
    });
  } catch (error) {
    console.error('💥 Database debug error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Add missing helper functions for enhanced intelligence
const extractOutreachStrategy = (perplexityResponse, companyName, prospectName, prospectRole) => {
  try {
    // Extract strategy from Perplexity response
    const strategyMatch = perplexityResponse && typeof perplexityResponse === 'string'
      ? perplexityResponse.match(/outreach strategy[^>]*?>\s*"?(.*?)"?\s*</is)
      : null;
    if (strategyMatch) {
      return strategyMatch[1].trim();
    }
    // Fallback: create personalized strategy
    return `Reference ${companyName}'s recent developments when reaching out to ${prospectName}. Given their ${prospectRole} position, emphasize strategic opportunities and market timing.`;
  } catch (error) {
    console.log('❌ extractOutreachStrategy error:', error);
    return `Reference company developments when reaching out to ${prospectName}.`;
  }
};

const extractSalesSummary = (perplexityResponse, prospectName, prospectRole, companyName) => {
  try {
    // Extract summary from Perplexity response
    const summaryMatch = perplexityResponse && typeof perplexityResponse === 'string'
      ? perplexityResponse.match(/sales summary[^>]*?>\s*"?(.*?)"?\s*</is)
      : null;
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
    // Fallback: create personalized summary
    return `${prospectName}, as a ${prospectRole} at ${companyName}, represents a qualified prospect with significant equity potential and multiple liquidity drivers.`;
  } catch (error) {
    console.log('❌ extractSalesSummary error:', error);
    return `${prospectName} represents a qualified prospect with equity potential.`;
  }
};

// EMERGENCY: Enhanced minimal processing with company analysis
const storeEnhancedEmergencyProspects = async (prospects, companyName) => {
  console.log('🚨 EMERGENCY MODE: Enhanced processing with company analysis');
  
  // Step 1: Quick company analysis (no external API calls)
  const companyProfile = getCompanyProfile(companyName);
  console.log('🏢 Company Profile:', companyProfile);
  
  // Process only 3 prospects to minimize time
  const prospectsToProcess = prospects.slice(0, 3);
  console.log(`📊 Processing ${prospectsToProcess.length} prospects with company analysis`);
  
  const processedProspects = [];
  
  for (let i = 0; i < prospectsToProcess.length; i++) {
    const prospect = prospectsToProcess[i];
    console.log(`💾 Enhanced processing ${i+1}/${prospectsToProcess.length}: ${prospect.person_name}`);
    
    try {
      // EQUITY SCORING with company multiplier
      console.log('📊 CALCULATING EQUITY SCORE for:', prospect.person_name);
      const title = (prospect.current_job_title || '').toLowerCase().trim();
      
      let baseScore = 5;
      
      // Enhanced scoring logic
      if (title.includes('board') && title.includes('member')) {
        baseScore = 9;
        console.log('  - BOARD MEMBER → baseScore: 9');
      } else if (title.includes('ceo') || title.includes('cto') || title.includes('cfo')) {
        baseScore = 9;
        console.log('  - C-LEVEL EXECUTIVE → baseScore: 9');
      } else if (title.includes('head') || title.includes('director')) {
        baseScore = 8;
        console.log('  - HEAD/DIRECTOR → baseScore: 8');
      } else if (title.includes('vp') || title.includes('vice president')) {
        baseScore = 8;
        console.log('  - VP LEVEL → baseScore: 8');
      } else if (title.includes('senior') || title.includes('staff') || title.includes('principal')) {
        baseScore = 7;
        console.log('  - SENIOR IC → baseScore: 7');
      } else if (title.includes('manager') || title.includes('lead')) {
        baseScore = 6;
        console.log('  - MANAGER/LEAD → baseScore: 6');
      } else if (title.includes('engineer') || title.includes('scientist')) {
        baseScore = 6;
        console.log('  - TECHNICAL ROLE → baseScore: 6');
      } else if (title.includes('assistant') || title.includes('coordinator')) {
        baseScore = 3;
        console.log('  - SUPPORT ROLE → baseScore: 3');
      } else {
        console.log('  - DEFAULT → baseScore: 5');
      }
      
      // Apply company stage multiplier
      const stageMultiplier = companyProfile.equityMultiplier || 1.0;
      const equityScore = Math.min(10, Math.max(1, Math.round(baseScore * stageMultiplier)));
      console.log('  - Stage multiplier:', stageMultiplier, '→ Final score:', equityScore);
      
      // DATA CONFIDENCE SCORING based on available information
      let dataConfidence = 2; // Base confidence
      if (prospect.person_name && prospect.person_name.includes(' ')) dataConfidence += 1; // Has full name
      if (prospect.current_job_title && prospect.current_job_title.length > 5) dataConfidence += 1; // Has real title
      if (prospect.email && prospect.email.includes('@')) dataConfidence += 1; // Has email
      dataConfidence = Math.min(5, dataConfidence); // Cap at 5
      console.log('📊 DATA CONFIDENCE:', dataConfidence, '/5 for', prospect.person_name);
      
      // STATUS based on equity score and confidence
      let status = 'Needs Research';
      if (equityScore >= 7 && dataConfidence >= 4) {
        status = 'Qualified';
      } else if (equityScore >= 6 && dataConfidence >= 3) {
        status = 'Qualified';
      }
      console.log('📊 STATUS:', status);
      
      // COMPANY-SPECIFIC INTELLIGENCE (fast, no API calls)
      const companyIntelligence = generateCompanyIntelligence(companyName, prospect, companyProfile);
      console.log('🧠 Generated company intelligence for:', prospect.person_name);
      
      // Set prospect data
      prospect.equity_score = equityScore;
      prospect.data_confidence = dataConfidence;
      prospect.status = status;
      prospect.enhanced_intelligence = companyIntelligence;
      
      console.log('📊 FINAL SCORES:', { equity: equityScore, confidence: dataConfidence, status: status });
      
      // Database insert with all fields
      const { data, error } = await supabase
        .from('prospects')
        .insert([{
          person_name: prospect.person_name,
          current_job_title: prospect.current_job_title,
          company_name: companyName,
          priority_score: prospect.equity_score,
          data_confidence: prospect.data_confidence,
          status: prospect.status,
          enhanced_intelligence: JSON.stringify(prospect.enhanced_intelligence),
          company_profile: JSON.stringify(companyProfile)
        }]);
      
      if (error) {
        console.log('❌ Database error for', prospect.person_name, ':', error.message);
      } else {
        console.log('✅ STORED:', prospect.person_name, 
          `Equity: ${prospect.equity_score}/10,`, 
          `Confidence: ${prospect.data_confidence}/5,`,
          `Status: ${prospect.status}`);
        processedProspects.push(prospect);
      }
    } catch (error) {
      console.log(`❌ Failed ${prospect.person_name}:`, error.message);
    }
  }
  
  console.log(`🎉 Enhanced processing complete: ${processedProspects.length} prospects stored`);
  return processedProspects;
};

// FAST COMPANY PROFILE FUNCTION (no API calls)
const getCompanyProfile = (companyName) => {
  const company = companyName.toLowerCase();
  if (company.includes('openai')) {
    return { stage: 'Late Stage', equityMultiplier: 1.2, marketCap: '$86B', recentFunding: '$40B Series F (April 2025)', liquidityPrograms: 'Employee tender offers confirmed', riskLevel: 'Medium - High valuation, uncertain IPO timing' };
  } else if (company.includes('stripe')) {
    return { stage: 'Late Stage', equityMultiplier: 1.1, marketCap: '$95B', recentFunding: 'Series I (2023)', liquidityPrograms: 'Secondary market transactions available', riskLevel: 'Low - Established revenue, clear path to IPO' };
  } else if (company.includes('anthropic')) {
    return { stage: 'Growth Stage', equityMultiplier: 1.0, marketCap: '$18B', recentFunding: 'Series C (2023)', liquidityPrograms: 'Limited secondary opportunities', riskLevel: 'Medium - Strong backing, competitive market' };
  } else {
    return { stage: 'Unknown', equityMultiplier: 1.0, marketCap: 'Not disclosed', recentFunding: 'Research pending', liquidityPrograms: 'To be determined', riskLevel: 'Unknown - Requires analysis' };
  }
};

// FAST COMPANY INTELLIGENCE FUNCTION
const generateCompanyIntelligence = (companyName, prospect, companyProfile) => {
  const company = companyName.toLowerCase();
  const name = prospect.person_name;
  const role = prospect.current_job_title;
  if (company.includes('openai')) {
    return { liquidity_signals: `Current valuation: ${companyProfile.marketCap}. ${companyProfile.liquidityPrograms}. Recent ${companyProfile.recentFunding} creates new liquidity opportunities for senior employees.`, outreach_strategy: `Reference OpenAI's $40B funding when reaching out to ${name}. Given their ${role} position, emphasize the strategic timing for equity optimization and portfolio diversification.`, sales_summary: `${name}, as a ${role} at OpenAI, represents a high-priority prospect following the company's historic funding round. Strong equity potential with confirmed liquidity programs.` };
  } else if (company.includes('stripe')) {
    return { liquidity_signals: `Current valuation: ${companyProfile.marketCap}. ${companyProfile.liquidityPrograms}. Established fintech leader with clear path to public markets.`, outreach_strategy: `Reference Stripe's market leadership when reaching out to ${name}. Highlight the opportunity to optimize equity position ahead of potential IPO developments.`, sales_summary: `${name}, as a ${role} at Stripe, represents a qualified prospect at a mature fintech company with strong liquidity prospects and established secondary markets.` };
  } else {
    return { liquidity_signals: `Company stage: ${companyProfile.stage}. Recent funding: ${companyProfile.recentFunding}. Market conditions favorable for equity transactions.`, outreach_strategy: `Reference ${companyName}'s growth trajectory when reaching out to ${name}. Focus on portfolio diversification and strategic equity planning opportunities.`, sales_summary: `${name}, as a ${role} at ${companyName}, represents a potential prospect. Company analysis indicates ${companyProfile.riskLevel.toLowerCase()}.` };
  }
};
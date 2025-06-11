require('dotenv').config();

const fetch = require('node-fetch');

class ExaClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.exa.ai';
  }

  async searchAndContents(query, options = {}) {
    console.log(`🔍 Searching Exa for: ${query}`);
    
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        numResults: options.numResults || 5,
        includeDomains: options.includeDomains || ["linkedin.com", "techcrunch.com"],
        type: 'neural',
        contents: {
          text: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Exa API error:', error);
      throw new Error(`Exa API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Exa found ${data.results?.length || 0} results`);
    return data;
  }
}

// Rate limiting helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search for seller prospects using Exa AI API
 * @param {string} companyName - The company to search for prospects
 * @returns {Promise<Array>} Array of prospect objects
 */
async function findSellerProspects(companyName) {
  console.log(`🔍 Searching Exa API for prospects at ${companyName}`);
  
  if (!process.env.EXA_API_KEY) {
    console.error('❌ EXA_API_KEY not found in environment variables');
    return [];
  }

  const EXA_API_URL = 'https://api.exa.ai/search';
  const searchQuery = `${companyName} site:linkedin.com/in/ (VP OR Director OR Head OR Chief OR President OR Founder)`;
  
  try {
    // Add 1 second delay for rate limiting
    await delay(1000);

    const response = await fetch(EXA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchQuery,
        numResults: 3,
        includeDomains: ['linkedin.com'],
        type: 'neural',
        contents: { text: true }
      })
    });

    if (!response.ok) {
      throw new Error(`Exa API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.results?.length || 0} results from Exa API`);

    // Process and structure the results
    const prospects = data.results?.map(result => {
      // Extract name from LinkedIn URL or title
      const nameMatch = result.url.match(/linkedin\.com\/in\/([^\/]+)/);
      const name = nameMatch ? nameMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
      
      // Extract role from title or content
      const roleMatch = result.title?.match(/(VP|Director|Head|Chief|President|Founder)[^,]*/i);
      const potentialRole = roleMatch ? roleMatch[0].trim() : 'Unknown Role';

      return {
        name,
        company: companyName,
        potential_role: potentialRole,
        source_url: result.url,
        confidence: result.score || 0.5, // Default to 0.5 if no score provided
        raw_title: result.title || '',
        raw_content: result.text || ''
      };
    }) || [];

    console.log(`✅ Successfully processed ${prospects.length} prospects`);
    return prospects;

  } catch (error) {
    console.error('❌ Exa API error:', error.message);
    // Return empty array on failure as per requirements
    return [];
  }
}

// For testing without API calls
async function mockFindSellerProspects(companyName) {
  console.log(`🔍 [MOCK] Searching for prospects at ${companyName}`);
  await delay(1000); // Simulate API delay
  
  return [
    {
      name: "John Smith",
      company: companyName,
      potential_role: "VP of Sales",
      source_url: "https://linkedin.com/in/john-smith",
      confidence: 0.85,
      raw_title: "VP of Sales at " + companyName,
      raw_content: "Experienced sales leader..."
    },
    {
      name: "Sarah Johnson",
      company: companyName,
      potential_role: "Director of Business Development",
      source_url: "https://linkedin.com/in/sarah-johnson",
      confidence: 0.75,
      raw_title: "Director of Business Development at " + companyName,
      raw_content: "Strategic business development professional..."
    }
  ];
}

// Export the function
module.exports = {
  findSellerProspects,
  // Export mock function for testing
  mockFindSellerProspects
};
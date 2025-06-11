const API_BASE = 'https://hiive-prospect-automation-production.up.railway.app';

// DOM elements
const statTotal = document.getElementById('stat-total');
const statResearched = document.getElementById('stat-researched');
const statNew = document.getElementById('stat-new');
const tableBody = document.querySelector('#prospects-table tbody');
const searchInput = document.getElementById('search-input');
const discoveryForm = document.getElementById('discovery-form');
const companyInput = document.getElementById('company-input');
const discoverBtn = document.getElementById('discover-btn');

// Status indicators
const statusSupabase = document.querySelector('.status.supabase');
const statusExa = document.querySelector('.status.exa');
const statusPerplexity = document.querySelector('.status.perplexity');

// Modal elements
const modal = document.getElementById('research-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const modalResearch = document.getElementById('modal-research');

// Table controls
const sortQualityBtn = document.getElementById('sort-quality');
const filterHighBtn = document.getElementById('filter-high');
let filterHighQuality = false;

// Add confidence filter state
let filterHighConfidence = false;

let allProspects = [];

function setStatusIndicator(el, ok) {
  if (!el) return;
  el.style.color = ok ? (el.classList.contains('supabase') ? '#22d3ee' : el.classList.contains('perplexity') ? '#3b82f6' : '#ef4444') : '#6b7280';
}

async function checkStatus() {
  // Supabase: always green if backend is up
  setStatusIndicator(statusSupabase, true);
  
  // Update Hunter.io status
  try {
    const response = await fetch(`${API_BASE}/api/test-db`);
    setStatusIndicator(statusExa, response.ok);
  } catch {
    setStatusIndicator(statusExa, false);
  }
  
  // Perplexity: check connection
  try {
    const response = await fetch(`${API_BASE}/api/test-db`);
    setStatusIndicator(statusPerplexity, response.ok);
  } catch {
    setStatusIndicator(statusPerplexity, false);
  }
}

function renderStats(prospects) {
  const qualified = prospects.filter(p => p.qualification_status === 'qualified').length;
  const highEquity = prospects.filter(p => p.priority_score >= 9).length;
  
  // Update stats to show new metrics
  const statsDiv = document.querySelector('.stats');
  statsDiv.innerHTML = `
    Total Prospects: <span id="stat-total">${prospects.length}</span> |
    Qualified: <span id="stat-researched">${qualified}</span> |
    High Equity (9-10): <span id="stat-new">${highEquity}</span>
  `;
}

function getEquityScoreColor(score) {
  if (score >= 9) return 'text-emerald-500';
  if (score >= 7) return 'text-blue-500';
  if (score >= 5) return 'text-yellow-500';
  return 'text-gray-500';
}

function getDataQualityColor(score) {
  if (score >= 4) return 'text-emerald-500';
  if (score >= 3) return 'text-blue-500';
  if (score >= 2) return 'text-yellow-500';
  return 'text-gray-500';
}

function displayProspectRow(prospect) {
  // Parse research notes to get scoring details
  let scoringDetails = null;
  try {
    const researchNotes = typeof prospect.research_notes === 'string' ? 
      JSON.parse(prospect.research_notes) : prospect.research_notes;
    scoringDetails = researchNotes?.scoring_details || null;
  } catch (e) {
    scoringDetails = null;
  }
  
  // Get qualification badge with better logic
  const shouldBeQualified = prospect.priority_score >= 6;
  const actualStatus = prospect.qualification_status;
  
  // Show discrepancy if status doesn't match expected
  let qualificationBadge;
  if (actualStatus === 'qualified') {
    qualificationBadge = '<span class="badge verified">✓ Qualified</span>';
  } else if (actualStatus === 'needs_research' && shouldBeQualified) {
    qualificationBadge = '<span class="badge unverified">⚠ Should be Qualified</span>';
  } else {
    qualificationBadge = '<span class="badge unverified">⚠ Needs Research</span>';
  }
  
  // Get equity score color
  const equityColor = getEquityScoreColor(prospect.priority_score || 0);
  const dataQualityColor = getDataQualityColor(prospect.confidence_level || 0);
  
  // Get raw confidence percentage
  const rawConfidence = scoringDetails?.data_quality?.raw_confidence;
  const confidenceDisplay = rawConfidence ? 
    `${Math.round(rawConfidence * 100)}%` : `${prospect.confidence_level || 0}/5`;
  
  return `
    <tr>
      <td>
        <div style="font-weight: 600;">${prospect.full_name || 'Unknown'}</div>
      </td>
      <td>
        <div>${prospect.role_title || 'Unknown'}</div>
        <div style="font-size: 0.85em; color: #9ca3af;">${prospect.company_name || 'Unknown'}</div>
      </td>
      <td>
        <div class="equity-score">
          ${prospect.priority_score || 0}/10
        </div>
      </td>
      <td><strong>${confidenceDisplay}</strong></td>
      <td>${qualificationBadge}</td>
      <td>
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
          <button class="btn-view" data-view="${prospect.id}">View Details</button>
          <button class="btn-delete" data-delete="${prospect.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function renderTable(prospects) {
  tableBody.innerHTML = '';
  prospects.forEach(p => {
    tableBody.insertAdjacentHTML('beforeend', displayProspectRow(p));
  });
}

function filterTable() {
  const q = searchInput.value.toLowerCase();
  let filtered = allProspects.filter(p =>
    (p.full_name || '').toLowerCase().includes(q) ||
    (p.company_name || '').toLowerCase().includes(q) ||
    (p.role_title || '').toLowerCase().includes(q)
  );
  if (filterHighQuality) {
    filtered = filtered.filter(p => p.priority_score >= 9);
  }
  renderTable(filtered);
}

function sortProspectsByQuality() {
  allProspects.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  filterTable();
}

sortQualityBtn.addEventListener('click', () => {
  sortProspectsByQuality();
  sortQualityBtn.classList.add('active');
  setTimeout(() => sortQualityBtn.classList.remove('active'), 200);
});

filterHighBtn.addEventListener('click', () => {
  filterHighQuality = !filterHighQuality;
  filterHighBtn.classList.toggle('active', filterHighQuality);
  filterHighBtn.textContent = filterHighQuality ? 'Show All' : 'High Equity Only';
  filterTable();
});

async function loadProspects() {
  try {
    const res = await fetch(`${API_BASE}/api/test-db`);
    const json = await res.json();
    
    if (json.status === 'db_working') {
      allProspects = json.prospects || [];
      renderStats(allProspects);
      filterTable();
    } else {
      console.error('Database not working:', json);
    }
  } catch (error) {
    console.error('Error loading prospects:', error);
  }
}

discoveryForm.addEventListener('submit', async e => {
  e.preventDefault();
  const company = companyInput.value.trim();
  if (!company) return;
  
  discoverBtn.disabled = true;
  discoverBtn.textContent = 'Discovering...';
  
  try {
    const response = await fetch(`${API_BASE}/api/find-prospects/${encodeURIComponent(company)}`);
    const result = await response.json();
    
    if (result.success) {
      console.log(`Found ${result.prospects_found} prospects, stored ${result.prospects_stored}`);
      await loadProspects();
      companyInput.value = '';
    } else {
      console.error('Discovery failed:', result);
    }
  } catch (error) {
    console.error('Discovery error:', error);
  } finally {
    discoverBtn.disabled = false;
    discoverBtn.textContent = 'Discover Prospects';
  }
});

function openModal() {
  modal.style.display = 'flex';
  setTimeout(() => { modalContent.focus(); }, 10);
}

function closeModal() {
  modal.style.display = 'none';
  modalResearch.innerHTML = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('mousedown', e => {
  if (e.target === modal) closeModal();
});

tableBody.addEventListener('click', async e => {
  if (e.target.matches('[data-delete]')) {
    const id = e.target.getAttribute('data-delete');
    const prospect = allProspects.find(p => String(p.id) === String(id));
    
    if (confirm(`Delete ${prospect?.full_name || 'this prospect'}?`)) {
      try {
        const response = await fetch(`${API_BASE}/api/delete-prospect/${id}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await loadProspects(); // Reload the table
        } else {
          alert('Failed to delete prospect');
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting prospect');
      }
    }
  }
  
  if (e.target.matches('[data-view]')) {
    const id = e.target.getAttribute('data-view');
    const prospect = allProspects.find(p => String(p.id) === String(id));
    
    if (!prospect) {
      modalResearch.innerHTML = '<div class="research-section"><p>Prospect not found.</p></div>';
      openModal();
      return;
    }
    
    let research = null;
    let enhancedIntel = null;
    try {
      research = prospect.research_notes ? JSON.parse(prospect.research_notes) : null;
      if (research && research.enhanced_intelligence) {
        enhancedIntel = research.enhanced_intelligence;
      }
    } catch (e) {
      research = null;
    }
    
    // BUILD MODAL WITH ENHANCED INTELLIGENCE IF AVAILABLE
    let html = `
      <div class="research-section">
        <h3>🎯 Prospect Profile</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <p><strong>Name:</strong> ${prospect.full_name}</p>
          <p><strong>Company:</strong> ${prospect.company_name}</p>
          <p><strong>Title:</strong> ${prospect.role_title}</p>
          <p><strong>Status:</strong> ${prospect.qualification_status?.replace('_', ' ') || 'Unknown'}</p>
        </div>
      </div>
    `;
    
    if (researchNotes.enhanced_intelligence) {
      html += `
        <div class="enhanced-intelligence" style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); border-radius: 8px;">
          <h3 style="color: #ffffff; margin-bottom: 15px;">🎯 Enhanced Sales Intelligence</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
            <div style="color: #e5e7eb;"><strong>Seniority:</strong> ${researchNotes.enhanced_intelligence.job_seniority}</div>
            <div style="color: #e5e7eb;"><strong>Tenure:</strong> ${researchNotes.enhanced_intelligence.estimated_tenure}</div>
            <div style="color: #e5e7eb;"><strong>Equity Value:</strong> ${researchNotes.enhanced_intelligence.estimated_equity_value}</div>
            <div style="color: #e5e7eb;"><strong>Best Channel:</strong> ${researchNotes.enhanced_intelligence.preferred_channel}</div>
            <div style="color: #e5e7eb;"><strong>Liquidity Signals:</strong> ${researchNotes.enhanced_intelligence.liquidity_signals}</div>
            <div style="color: #e5e7eb;"><strong>Liquidity Score:</strong> ${researchNotes.enhanced_intelligence.liquidity_score}/10</div>
          </div>
          <div style="margin-bottom: 10px;">
            <h4 style="color: #ffffff; margin-bottom: 8px;">📧 Outreach Strategy:</h4>
            <p style="color: #e5e7eb; margin: 0;">${researchNotes.enhanced_intelligence.outreach_strategy}</p>
          </div>
          <div>
            <h4 style="color: #ffffff; margin-bottom: 8px;">📊 Sales Summary:</h4>
            <p style="color: #e5e7eb; margin: 0;">${researchNotes.enhanced_intelligence.sales_summary}</p>
          </div>
        </div>
      `;
    }
    
    // Add other research sections as before (basic, scoring, etc.)
    // ... existing code for other research sections ...
    
    modalResearch.innerHTML = html;
    openModal();
  }
});

searchInput.addEventListener('input', filterTable);

// Remove the DOMContentLoaded event listener that updates table headers since they're now in HTML
document.addEventListener('DOMContentLoaded', () => {
  // Update filter button text
  filterHighBtn.textContent = 'High Equity Only';
  sortQualityBtn.textContent = 'Sort by Equity Score';
});

// Initial load
checkStatus();
loadProspects();

// Helper functions for enhanced research display
function getRoleAssessment(title, equityScore) {
  if (equityScore >= 9) return "High-value role with significant equity potential";
  if (equityScore >= 7) return "Good role with meaningful equity grants";
  if (equityScore >= 5) return "Standard role with some equity participation";
  return "Support role with minimal equity";
}

function getPriorityRecommendation(score) {
  if (score >= 9) return "🔥 High Priority - Contact immediately";
  if (score >= 7) return "⭐ Medium Priority - Contact within 1 week";
  if (score >= 5) return "📋 Low Priority - Add to nurture campaign";
  return "❌ Skip - Unlikely to have significant equity";
}

function getEquityContext(stage, valuation) {
  if (stage === 'Series A' && valuation >= 1000000000) {
    return "High-growth Series A with significant employee equity value";
  }
  return "Early-stage company with developing equity program";
}

function getResearchQuality(research) {
  let score = 0;
  if (research.equity_analysis) score += 2;
  if (research.scoring_details) score += 2;
  if (research.company_context) score += 2;
  
  if (score >= 5) return "⭐⭐⭐ Comprehensive";
  if (score >= 3) return "⭐⭐ Good";
  return "⭐ Basic";
}

function getOverallConfidence(prospect) {
  const equity = prospect.priority_score || 0;
  const data = prospect.confidence_level || 0;
  const combined = (equity/10 * 0.7 + data/5 * 0.3) * 100;
  
  if (combined >= 80) return "🟢 High";
  if (combined >= 60) return "🟡 Medium";
  return "🔴 Low";
}

function getNextSteps(equityScore, status, enhanced) {
  if (enhanced?.liquidity_motivation_score >= 7) {
    return "🔥 Priority Contact - High liquidity motivation";
  }
  if (equityScore >= 9 && status === 'qualified') {
    return "✅ Ready for outreach - High-value prospect";
  }
  if (equityScore >= 6 && status !== 'qualified') {
    return "🔄 Update qualification status";
  }
  return "📋 Standard nurture campaign";
}

// Enhanced helper functions for research display
function getDataSources(basic, enhanced) {
  let sources = ["Hunter.io Domain Search"];
  
  if (basic?.company_context) {
    sources.push("Perplexity Company Research");
  }
  
  if (enhanced?.equity_ownership_likelihood) {
    sources.push("Perplexity Deep Research");
  }
  
  return sources.join(", ");
}

function getResearchDepth(basic, enhanced) {
  if (enhanced?.equity_ownership_likelihood) {
    return "⭐⭐⭐ Comprehensive (AI Enhanced)";
  }
  if (basic?.equity_analysis) {
    return "⭐⭐ Good (Basic Analysis)";
  }
  return "⭐ Limited (Hunter Data Only)";
}

function getOverallRating(prospect) {
  const equity = prospect.priority_score || 0;
  const data = prospect.confidence_level || 0;
  const combined = (equity/10 * 0.7 + data/5 * 0.3) * 100;
  
  if (combined >= 80) return "🟢 High";
  if (combined >= 60) return "🟡 Medium";
  return "🔴 Low";
}

// Update status indicators on load
function updateStatus() {
  const supabaseStatus = document.querySelector('.status.supabase');
  const hunterStatus = document.querySelector('.status.exa');
  const perplexityStatus = document.querySelector('.status.perplexity');
  
  if (supabaseStatus) supabaseStatus.textContent = 'Supabase';
  if (hunterStatus) hunterStatus.textContent = 'Hunter.io';
  if (perplexityStatus) perplexityStatus.textContent = 'Perplexity';
  
  // Check status and update colors
  fetch(`${API_BASE}/api/status`)
    .then(res => res.json())
    .then(data => {
      setStatusIndicator(supabaseStatus, data.supabase);
      setStatusIndicator(hunterStatus, data.hunter);
      setStatusIndicator(perplexityStatus, data.perplexity);
    })
    .catch(err => {
      console.error('Status check failed:', err);
      setStatusIndicator(supabaseStatus, false);
      setStatusIndicator(hunterStatus, false);
      setStatusIndicator(perplexityStatus, false);
    });
}

// Updated table generation with standardized confidence display
function generateTableHTML(prospects) {
  let html = `
    <table id="prospects-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Position</th>
          <th>Equity Score</th>
          <th>Data Confidence</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  prospects.forEach(prospect => {
    const confidencePercentage = prospect.hunter_confidence 
      ? Math.round(prospect.hunter_confidence * 100)
      : null;
    const cleanName = prospect.full_name || 'Unknown';
    html += `
      <tr>
        <td>
          <div class="prospect-name">
            <strong>${cleanName}</strong>
          </div>
        </td>
        <td>
          <div class="prospect-position">
            <div class="title">${prospect.role_title || 'Unknown'}</div>
            <div class="company">${prospect.company_name || 'Unknown'}</div>
          </div>
        </td>
        <td>
          <div class="equity-score">
            ${prospect.priority_score || 0}/10
          </div>
        </td>
        <td>
          <div class="confidence-display">
            <strong>${confidencePercentage ? confidencePercentage + '%' : 'Unknown'}</strong>
          </div>
        </td>
        <td>
          <span class="status-badge ${getStatusClass(prospect.qualification_status)}">
            ${getStatusIcon(prospect.qualification_status)} ${getStatusText(prospect.qualification_status)}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-view" data-view="${prospect.id}">View Details</button>
            <button class="btn-delete" data-delete="${prospect.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

// Add updated CSS styles
const additionalCSS = `
/* Remove photo column styling */
.prospect-name {
  font-weight: bold;
  color: #e5e7eb;
}

/* Clean position display */
.prospect-position .title {
  font-weight: 500;
  color: #e5e7eb;
}

.prospect-position .company {
  font-size: 0.85em;
  color: #9ca3af;
  text-transform: lowercase;
}

/* Standardized dual scores */
.dual-scores {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.equity-score, .data-score {
  font-size: 0.85em;
}

.equity-score strong {
  color: #10b981;
}

.data-score strong {
  color: #3b82f6;
}

/* Clean confidence display */
.confidence-display {
  text-align: center;
  font-weight: 500;
}

/* Status indicators fix */
.status-indicators {
  display: flex;
  gap: 15px;
  align-items: center;
}

.status {
  font-size: 0.9em;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.status.supabase {
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.status.exa {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
}

.status.perplexity {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

/* Updated table header */
#prospects-table th {
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
  color: #e5e7eb;
  font-weight: 600;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #6b7280;
}

/* Action buttons styling */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
}

.btn-view, .btn-delete {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-view:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
}

.btn-delete {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-delete:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}
`;

// Function to fix confidence data consistency
function normalizeProspectData(prospects) {
  return prospects.map(prospect => {
    // Standardize confidence data
    if (prospect.research_notes) {
      try {
        const notes = typeof prospect.research_notes === 'string' 
          ? JSON.parse(prospect.research_notes) 
          : prospect.research_notes;
        
        // Extract hunter confidence if available
        if (notes.confidence_details && notes.confidence_details.raw_confidence) {
          prospect.hunter_confidence = notes.confidence_details.raw_confidence;
        }
      } catch (e) {
        console.warn('Could not parse research notes for prospect:', prospect.id);
      }
    }
    
    return prospect;
  });
}

// Updated initialization function
async function initializeDashboard() {
  try {
    // Add the additional CSS
    const style = document.createElement('style');
    style.textContent = additionalCSS;
    document.head.appendChild(style);
    
    // Fix status indicators
    updateStatus();
    
    // Load and normalize prospect data
    const prospects = await loadProspects();
    const normalizedProspects = normalizeProspectData(prospects);
    
    // Update table with cleaned data
    const tableContainer = document.querySelector('.table-wrapper');
    tableContainer.innerHTML = generateTableHTML(normalizedProspects);
    
    // Update stats
    updateStats(normalizedProspects);
    
    console.log('✅ Dashboard initialized with cleaned UI');
    
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
  }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

document.addEventListener('DOMContentLoaded', function () {
  if (window.SlimSelect) {
    new SlimSelect({
      select: '#company-select',
      settings: {
        showSearch: true,
        searchPlaceholder: 'Search companies',
        placeholderText: 'Select companies',
        closeOnSelect: false,
        hideSelectedOption: false,
        allowDeselect: true,
        showCheckbox: true
      }
    });
  }
});

/* Insert a new "Sort by Data Confidence" button (and its click handler) in the DOMContentLoaded event (for the table) */
document.addEventListener('DOMContentLoaded', function() {
  const tableBody = document.querySelector('#prospects-table tbody');
  if (tableBody) {
    tableBody.addEventListener('click', async (e) => {
      console.log('Table click detected:', e.target); // debugging
      if (e.target.matches('[data-view]') || e.target.matches('.btn-view')) {
        console.log('View button clicked'); // debugging
        const id = e.target.getAttribute('data-view');
        console.log('Prospect ID:', id); // debugging
        const prospect = allProspects.find(p => String(p.id) === String(id));
        console.log('Found prospect:', prospect); // debugging
        if (!prospect) {
          console.error('Prospect not found for ID:', id);
          return;
        }
        showProspectModal(prospect);
      }
      if (e.target.matches('[data-delete]') || e.target.matches('.btn-delete')) {
        const id = e.target.getAttribute('data-delete');
        await deleteProspect(id);
      }
    });
  } else {
    console.error('Table body not found');
  }

  // Insert "Sort by Data Confidence" button (and its click handler) (inserted below the search bar)
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    const sortButton = document.createElement('button');
    sortButton.textContent = 'Sort by Data Confidence';
    sortButton.className = 'btn btn-secondary';
    sortButton.style.marginLeft = '10px';
    sortButton.addEventListener('click', () => {
      sortTableByConfidence();
      renderProspectsTable(allProspects); // re-render (so that modal event handlers are re-attached)
    });
    searchContainer.appendChild(sortButton);
  } else {
    console.error('Search container not found (for "Sort by Data Confidence" button)');
  }

  // Create confidence filter button
  const confidenceFilterBtn = document.createElement('button');
  confidenceFilterBtn.textContent = 'High Confidence Only';
  confidenceFilterBtn.className = 'btn-filter';
  confidenceFilterBtn.id = 'filter-confidence';

  // Add it to the controls area
  const controlsArea = document.querySelector('.table-controls');
  if (controlsArea) {
    controlsArea.appendChild(confidenceFilterBtn);
  } else {
    console.error('Table controls area not found');
  }

  // Add click handler for confidence filtering
  confidenceFilterBtn.addEventListener('click', () => {
    const isActive = confidenceFilterBtn.classList.contains('active');
    
    if (isActive) {
      // Remove filter - show all prospects
      confidenceFilterBtn.classList.remove('active');
      confidenceFilterBtn.textContent = 'High Confidence Only';
      filterHighConfidence = false;
    } else {
      // Apply filter - show only high confidence
      confidenceFilterBtn.classList.add('active');
      confidenceFilterBtn.textContent = 'Show All Confidence';
      filterHighConfidence = true;
    }
    
    // Re-render table with current filters
    renderProspectsTable(allProspects);
  });
});

/* New helper function (sortTableByConfidence) to sort the table (tbody) by "Data Confidence" (using a "data-confidence" attribute) */
function sortTableByConfidence() {
  const tbody = document.querySelector('#prospects-table tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a, b) => {
    const aConf = parseInt(a.getAttribute('data-confidence') || '0', 10);
    const bConf = parseInt(b.getAttribute('data-confidence') || '0', 10);
    return (bConf - aConf); // descending (highest confidence first)
  });
  rows.forEach(row => tbody.appendChild(row));
}

/* New function (showProspectModal) to generate and display the modal (with enhanced intelligence) */
function showProspectModal(prospect) {
  console.log('Showing modal for:', prospect.full_name);
  const modal = document.getElementById('research-modal');
  const modalContent = document.getElementById('modal-research');
  if (!modal || !modalContent) {
    console.error('Modal elements not found');
    return;
  }
  let researchNotes = {};
  try {
    researchNotes = prospect.research_notes ? JSON.parse(prospect.research_notes) : {};
  } catch (error) {
    console.error('Error parsing research notes:', error);
  }
  console.log('Research notes:', researchNotes);
  let html = `
    <div class="prospect-profile">
      <h3>🎯 Prospect Profile</h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div><strong>Name:</strong> ${prospect.full_name || 'Unknown'}</div>
        <div><strong>Company:</strong> ${prospect.company_name || 'Unknown'}</div>
        <div><strong>Title:</strong> ${prospect.role_title || 'Unknown'}</div>
        <div><strong>Status:</strong> ${prospect.qualification_status || 'Unknown'}</div>
      </div>
    </div>
  `;
  if (researchNotes.enhanced_intelligence) {
    console.log('Adding enhanced intelligence section');
    html += `
      <div class="enhanced-intelligence" style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #1e40af 0%, #3730a3 100%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h3 style="color: #ffffff; margin-bottom: 20px; font-size: 1.2em;">🎯 Enhanced Sales Intelligence</h3>
        
        <!-- Liquidity Score at top -->
        <div style="margin-bottom: 20px; text-align: center; padding: 12px; background: rgba(255,255,255,0.15); border-radius: 8px;">
          <div style="color: #ffffff; font-size: 1.1em; font-weight: bold;">
            Liquidity Score: <span style="color: #10b981; font-size: 1.3em;">${researchNotes.enhanced_intelligence.liquidity_score || 'N/A'}/10</span>
          </div>
        </div>
        
        <!-- 5-item grid (removed liquidity score) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div style="color: #e5e7eb; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
            <strong>Seniority:</strong> ${researchNotes.enhanced_intelligence.job_seniority || 'Unknown'}
          </div>
          <div style="color: #e5e7eb; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
            <strong>Tenure:</strong> ${researchNotes.enhanced_intelligence.estimated_tenure || 'Unknown'}
          </div>
          <div style="color: #e5e7eb; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
            <strong>Equity Value:</strong> ${researchNotes.enhanced_intelligence.estimated_equity_value || 'TBD'}
          </div>
          <div style="color: #e5e7eb; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px;">
            <strong>Best Channel:</strong> ${researchNotes.enhanced_intelligence.preferred_channel || 'Email'}
          </div>
          <div style="color: #e5e7eb; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; grid-column: span 2;">
            <strong>KYC Status:</strong> ${researchNotes.enhanced_intelligence.kyc_status || 'Required'}
          </div>
        </div>
        
        <!-- Full-width Liquidity Signals section -->
        <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h4 style="color: #ffffff; margin-bottom: 12px; font-size: 1em;">⚡ Liquidity Signals:</h4>
          <div style="color: #e5e7eb; line-height: 1.6; font-size: 0.95em;">
            ${researchNotes.enhanced_intelligence.liquidity_signals || 'Standard motivation'}
          </div>
        </div>
        
        <div style="margin-bottom: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid #10b981;">
          <h4 style="color: #ffffff; margin-bottom: 10px; font-size: 1em;">📧 Personalized Outreach Strategy:</h4>
          <p style="color: #e5e7eb; margin: 0; line-height: 1.5;">${researchNotes.enhanced_intelligence.outreach_strategy || 'Standard approach'}</p>
        </div>
        
        <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h4 style="color: #ffffff; margin-bottom: 10px; font-size: 1em;">📊 Sales Summary:</h4>
          <p style="color: #e5e7eb; margin: 0; line-height: 1.5;">${researchNotes.enhanced_intelligence.sales_summary || 'Qualified prospect'}</p>
        </div>
      </div>
    `;
  } else {
    console.log('No enhanced intelligence found');
    html += `
      <div style="margin-top: 20px; padding: 15px; background: #374151; border-radius: 8px; text-align: center;">
        <p style="color: #9ca3af; margin: 0;">Enhanced intelligence not available for this prospect.</p>
      </div>
    `;
  }
  modalContent.innerHTML = html;
  modal.style.display = 'block';
  console.log('Modal should now be visible');
}

/* Ensure modal close functionality (via close button and "click outside") */
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('research-modal');
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
  }
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
});

// Update renderProspectsTable to include confidence filtering
function renderProspectsTable(prospects) {
  if (!tableBody) {
    console.error('Table body not found');
    return;
  }

  // Normalize data
  const normalizedProspects = normalizeProspectData(prospects);

  // Apply all filters
  let filteredProspects = [...normalizedProspects];
  
  // Apply search filter
  if (searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase();
    filteredProspects = filteredProspects.filter(p => 
      (p.full_name || '').toLowerCase().includes(searchTerm) ||
      (p.role_title || '').toLowerCase().includes(searchTerm) ||
      (p.company_name || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply equity filter
  if (filterHighQuality) {
    filteredProspects = filteredProspects.filter(p => p.priority_score >= 6);
  }
  
  // Apply confidence filter (numeric confidence_level only)
  if (filterHighConfidence) {
    filteredProspects = filteredProspects.filter(prospect => {
      const levelConf = Number(prospect.confidence_level) || 0;
      return levelConf >= 4;
    });
  }

  // Clear existing table content
  tableBody.innerHTML = '';
  
  // Render filtered prospects
  filteredProspects.forEach(prospect => {
    const row = document.createElement('tr');
    row.setAttribute('data-confidence', prospect.confidence_level || 0);
    
    // ... rest of the row creation code ...
  });

  // Update stats
  updateStats(filteredProspects);
}
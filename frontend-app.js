const API_BASE = 'https://hiive-prospect-automation-production.up.railway.app';

// DOM elements
const tableBody = document.querySelector('#prospects-table tbody');
const searchInput = document.getElementById('search-input');
const discoveryForm = document.getElementById('discovery-form');
const companyInput = document.getElementById('company-input');
const discoverBtn = document.getElementById('discover-btn');

// Modal elements
const modal = document.getElementById('research-modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const modalResearch = document.getElementById('modal-research');

let allProspects = [];

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
    qualificationBadge = '<span class="badge badge-success">✓ Qualified</span>';
  } else if (actualStatus === 'needs_research' && shouldBeQualified) {
    qualificationBadge = '<span class="badge badge-warning">⚠ Should be Qualified</span>';
  } else {
    qualificationBadge = '<span class="badge badge-warning">⚠ Needs Research</span>';
  }
  
  // Get raw confidence percentage
  const rawConfidence = scoringDetails?.data_quality?.raw_confidence;
  const confidenceDisplay = rawConfidence ? 
    `${Math.round(rawConfidence * 100)}%` : `${prospect.confidence_level || 0}/5`;
  
  return `
    <tr class="border-gray-200">
      <td class="font-medium text-[#424242]">${prospect.full_name || 'Unknown'}</td>
      <td>
        <div>
          <div class="text-[#424242]">${prospect.role_title || 'Unknown'}</div>
          <div class="text-[#ef5d60] text-sm">${prospect.company_name || 'Unknown'}</div>
        </div>
      </td>
      <td class="text-[#424242]">${prospect.priority_score || 0}/10</td>
      <td class="text-[#424242]">${confidenceDisplay}</td>
      <td>${qualificationBadge}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-primary" data-view="${prospect.id}">View Details</button>
          <button class="btn-ghost" data-delete="${prospect.id}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function filterTable() {
  const q = searchInput.value.toLowerCase();
  let filtered = allProspects.filter(p =>
    (p.full_name || '').toLowerCase().includes(q) ||
    (p.company_name || '').toLowerCase().includes(q) ||
    (p.role_title || '').toLowerCase().includes(q)
  );
  renderTable(filtered);
}

function renderTable(prospects) {
  tableBody.innerHTML = '';
  prospects.forEach(p => {
    tableBody.insertAdjacentHTML('beforeend', displayProspectRow(p));
  });
  // Reinitialize Lucide icons for new content
  lucide.createIcons();
}

async function loadProspects() {
  try {
    const res = await fetch(`${API_BASE}/api/test-db`);
    const json = await res.json();
    
    if (json.status === 'db_working') {
      allProspects = json.prospects || [];
      filterTable();
    } else {
      console.error('Database not working:', json);
    }
  } catch (error) {
    console.error('Error loading prospects:', error);
  }
}

// Update event listeners for new button classes
document.addEventListener('click', async (e) => {
  if (e.target.matches('[data-view]')) {
    const prospectId = e.target.dataset.view;
    const prospect = allProspects.find(p => p.id === prospectId);
    if (prospect) {
      showProspectModal(prospect);
    }
  } else if (e.target.closest('[data-delete]')) {
    const deleteBtn = e.target.closest('[data-delete]');
    const prospectId = deleteBtn.dataset.delete;
    if (confirm('Are you sure you want to delete this prospect?')) {
      try {
        const response = await fetch(`${API_BASE}/api/prospects/${prospectId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          allProspects = allProspects.filter(p => p.id !== prospectId);
          filterTable();
        }
      } catch (error) {
        console.error('Error deleting prospect:', error);
      }
    }
  }
});

// Initialize the dashboard
async function initializeDashboard() {
  await loadProspects();
  
  // Set up event listeners
  searchInput.addEventListener('input', filterTable);
  discoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = companyInput.value.trim();
    if (!company) return;
    
    discoverBtn.disabled = true;
    discoverBtn.textContent = 'Discovering...';
    
    try {
      const response = await fetch(`${API_BASE}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company })
      });
      
      if (response.ok) {
        await loadProspects();
        companyInput.value = '';
      } else {
        console.error('Discovery failed:', await response.text());
      }
    } catch (error) {
      console.error('Error during discovery:', error);
    } finally {
      discoverBtn.disabled = false;
      discoverBtn.textContent = 'Discover Prospects';
    }
  });
  
  modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Initialize Lucide icons
  lucide.createIcons();
}

// Start the app
initializeDashboard();

// ... rest of existing code for modal and research functionality ...
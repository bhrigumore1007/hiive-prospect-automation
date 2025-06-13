const API_BASE = 'https://hiive-prospect-automation-production.up.railway.app';

// DOM elements
const tableBody = document.querySelector('#prospects-table tbody');
const searchInput = document.getElementById('search-input');
const discoveryForm = document.getElementById('discovery-form');
const companyInput = document.getElementById('company-input');
const discoverBtn = document.getElementById('discover-btn');
const modal = document.getElementById('research-modal');
const modalClose = document.getElementById('modal-close');
const modalResearch = document.getElementById('modal-research');

let allProspects = [];

function renderTable(prospects) {
  tableBody.innerHTML = '';
  prospects.forEach((p, idx) => {
    tableBody.insertAdjacentHTML('beforeend', displayProspectRow(p, idx));
  });
  lucide.createIcons();
}

function displayProspectRow(prospect, idx) {
  let scoringDetails = null;
  try {
    const researchNotes = typeof prospect.research_notes === 'string' ? JSON.parse(prospect.research_notes) : prospect.research_notes;
    scoringDetails = researchNotes?.scoring_details || null;
  } catch (e) { scoringDetails = null; }

  let badge = '';
  if (prospect.qualification_status === 'qualified') {
    badge = '<span class="badge badge-success">✓ Qualified</span>';
  } else {
    badge = '<span class="badge badge-warning">&#9888; Needs Research</span>';
  }

  const rawConfidence = scoringDetails?.data_quality?.raw_confidence;
  const confidenceDisplay = rawConfidence ? `${Math.round(rawConfidence * 100)}%` : `${prospect.confidence_level || 0}/5`;

  return `
    <tr>
      <td class="font-medium text-[#424242]">${idx + 1}</td>
      <td class="font-medium text-[#424242]">${prospect.full_name || ''}</td>
      <td>
        <div class="text-[#424242]">${prospect.role_title || ''}</div>
        <div class="text-[#ef5d60] text-sm company-name">${prospect.company_name || ''}</div>
      </td>
      <td class="text-[#424242]">${prospect.priority_score || 0}/10</td>
      <td class="text-[#424242]">${confidenceDisplay}</td>
      <td>${badge}</td>
      <td>
        <div class="flex items-center gap-2 action-buttons">
          <button class="btn-table bg-[#ef5d60] hover:bg-[#f15f61] text-white" data-view="${prospect.id}">View Details</button>
          <button class="btn-ghost text-[#424242] hover:text-[#ef5d60] delete-btn" data-id="${prospect.id}"><span><i data-lucide="trash-2" class="w-3 h-3"></i></span></button>
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

async function loadProspects() {
  console.log('🔍 Loading prospects from backend...');
  try {
    const response = await fetch(`${API_BASE}/api/test-db`);
    console.log('📡 API Response status:', response.status);
    const data = await response.json();
    console.log('📊 API Response data:', data);
    if (data && data.prospects && Array.isArray(data.prospects)) {
      console.log(`✅ Found ${data.prospects.length} prospects`);
      allProspects = data.prospects;
      renderProspectsTable(allProspects);
      if (typeof updateStats === 'function') updateStats(allProspects);
    } else {
      console.error('❌ Invalid data format:', data);
      allProspects = [];
    }
  } catch (error) {
    console.error('💥 Load prospects error:', error);
    allProspects = [];
  }
}

discoveryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const company = companyInput.value.trim();
  if (!company) return;
  discoverBtn.disabled = true;
  discoverBtn.textContent = 'Discovering...';
  try {
    const response = await fetch(`${API_BASE}/api/find-prospects/${encodeURIComponent(company)}`);
    if (response.ok) {
      await loadProspects();
      companyInput.value = '';
    }
  } catch {}
  discoverBtn.disabled = false;
  discoverBtn.textContent = 'Discover Prospects';
});

searchInput.addEventListener('input', filterTable);

tableBody.addEventListener('click', async (e) => {
  if (e.target.closest('[data-view]')) {
    const id = e.target.closest('[data-view]').getAttribute('data-view');
    const prospect = allProspects.find(p => String(p.id) === String(id));
    if (prospect) showProspectModal(prospect);
  } else if (e.target.closest('[data-delete]')) {
    const id = e.target.closest('[data-delete]').getAttribute('data-delete');
    if (confirm('Delete this prospect?')) {
      try {
        const response = await fetch(`${API_BASE}/api/prospects/${id}`, { method: 'DELETE' });
        if (response.ok) {
          allProspects = allProspects.filter(p => String(p.id) !== String(id));
          filterTable();
        }
      } catch {}
    }
  }
});

function showProspectModal(prospect) {
  let research = null;
  try {
    research = prospect.research_notes ? JSON.parse(prospect.research_notes) : null;
  } catch {}
  let html = `<div><strong>Name:</strong> ${prospect.full_name || ''}</div>
    <div><strong>Company:</strong> ${prospect.company_name || ''}</div>
    <div><strong>Title:</strong> ${prospect.role_title || ''}</div>
    <div><strong>Status:</strong> ${prospect.qualification_status || ''}</div>`;
  if (research && research.enhanced_intelligence) {
    html += `<div style="margin-top:18px;"><strong>Enhanced Intelligence:</strong><br>${JSON.stringify(research.enhanced_intelligence, null, 2)}</div>`;
  }
  modalResearch.innerHTML = html;
  modal.style.display = 'flex';
}

modalClose.addEventListener('click', () => {
  modal.style.display = 'none';
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.style.display = 'none';
});

// Use this for re-rendering after delete
function renderProspectsTable(prospects) {
  console.log('🏗️ Rendering table with prospects:', prospects.length);
  if (prospects && prospects.length > 0) {
    console.log('📋 Sample prospect:', prospects[0]);
  }
  renderTable(prospects);
  if (typeof setupDeleteButtons === 'function') setupDeleteButtons();
}

// Add event delegation for delete buttons with debugging
document.addEventListener('click', function(e) {
  console.log('Click detected on:', e.target);
  if (e.target.matches('.delete-btn') || e.target.closest('.delete-btn')) {
    console.log('Delete button clicked!');
    const btn = e.target.matches('.delete-btn') ? e.target : e.target.closest('.delete-btn');
    const prospectId = btn.getAttribute('data-id');
    console.log('Prospect ID:', prospectId);
    deleteProspect(prospectId);
  }
});

// Also try direct event listeners after table render
function setupDeleteButtons() {
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      const prospectId = this.getAttribute('data-id');
      console.log('Direct delete clicked for ID:', prospectId);
      deleteProspect(prospectId);
    };
  });
}

async function deleteProspect(prospectId) {
  console.log('deleteProspect called with ID:', prospectId);
  if (!prospectId) {
    console.error('No prospect ID provided');
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/api/prospects/${prospectId}`, {
      method: 'DELETE'
    });
    console.log('Delete response:', response);
    if (response.ok) {
      console.log('Delete successful, updating table');
      allProspects = allProspects.filter(p => p.id != prospectId);
      renderProspectsTable(allProspects);
    } else {
      console.error('Delete failed:', response.status);
    }
  } catch (error) {
    console.error('Delete error:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM loaded, loading prospects...');
  loadProspects();
  // Add temporary debug button
  const debugBtn = document.createElement('button');
  debugBtn.textContent = 'Debug Load Prospects';
  debugBtn.style.position = 'fixed';
  debugBtn.style.bottom = '24px';
  debugBtn.style.right = '24px';
  debugBtn.style.zIndex = 9999;
  debugBtn.onclick = () => {
    console.log('🔧 Manual prospect load triggered');
    loadProspects();
  };
  document.body.appendChild(debugBtn);
});
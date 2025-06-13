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
  prospects.forEach(p => {
    tableBody.insertAdjacentHTML('beforeend', displayProspectRow(p));
  });
  lucide.createIcons();
}

function displayProspectRow(prospect) {
  // Parse research notes for confidence if available
  let scoringDetails = null;
  try {
    const researchNotes = typeof prospect.research_notes === 'string' ? JSON.parse(prospect.research_notes) : prospect.research_notes;
    scoringDetails = researchNotes?.scoring_details || null;
  } catch (e) { scoringDetails = null; }

  // Status badge
  let badge = '';
  if (prospect.qualification_status === 'qualified') {
    badge = '<span class="badge badge-success">✓ Qualified</span>';
  } else {
    badge = '<span class="badge badge-warning">&#9888; Needs Research</span>';
  }

  // Confidence
  const rawConfidence = scoringDetails?.data_quality?.raw_confidence;
  const confidenceDisplay = rawConfidence ? `${Math.round(rawConfidence * 100)}%` : `${prospect.confidence_level || 0}/5`;

  return `
    <tr>
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
          <button class="btn-ghost text-[#424242] hover:text-[#ef5d60]" data-delete="${prospect.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
  try {
    const res = await fetch(`${API_BASE}/api/test-db`);
    const json = await res.json();
    if (json.status === 'db_working') {
      allProspects = json.prospects || [];
      filterTable();
    }
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="6">Failed to load prospects.</td></tr>';
  }
}

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

// Initial load
loadProspects();
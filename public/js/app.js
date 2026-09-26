/**
 * Student Help Web (SHW) - Main Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  let resources = [];
  let bookmarks = [];
  let selectedResourceId = null;
  let activeCategory = 'all';
  let searchQuery = '';
  let currentSort = 'name-asc';
  let isBookmarkOnly = false;
  let selectedRatingVal = 0;

  // Category Labels & Styles Mapping
  const categoryConfig = {
    journals: { label: 'Online Journal', class: 'badge-journals' },
    databases: { label: 'Online Database', class: 'badge-databases' },
    ebooks: { label: 'E-Book', class: 'badge-ebooks' },
    portals: { label: 'Useful Portal', class: 'badge-portals' }
  };

  // DOM Elements
  const searchInput = document.getElementById('searchInput');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const bookmarkFilterBtn = document.getElementById('bookmarkFilterBtn');
  const bookmarkCountEl = document.getElementById('bookmarkCount');
  const addResourceBtn = document.getElementById('addResourceBtn');
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');

  const activeFiltersAlert = document.getElementById('activeFiltersAlert');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  const sortBySelect = document.getElementById('sortBy');
  const tabBtns = document.querySelectorAll('.tab-btn');

  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const resourcesContainer = document.getElementById('resourcesContainer');

  const journalCountBadge = document.getElementById('journalCountBadge');
  const databaseCountBadge = document.getElementById('databaseCountBadge');
  const ebookCountBadge = document.getElementById('ebookCountBadge');
  const portalCountBadge = document.getElementById('portalCountBadge');

  // Sidebar Elements
  const noSelectionState = document.getElementById('noSelectionState');
  const activeSelectionState = document.getElementById('activeSelectionState');
  const detailCategoryBadge = document.getElementById('detailCategoryBadge');
  const detailName = document.getElementById('detailName');
  const detailPurpose = document.getElementById('detailPurpose');
  const detailAvgStars = document.getElementById('detailAvgStars');
  const detailRatingText = document.getElementById('detailRatingText');
  const detailExternalLink = document.getElementById('detailExternalLink');

  // Review Form & List Elements
  const reviewForm = document.getElementById('reviewForm');
  const reviewResourceId = document.getElementById('reviewResourceId');
  const ratingStarBtns = document.querySelectorAll('.star-selector');
  const selectedRatingValEl = document.getElementById('selectedRatingVal');
  const reviewUsername = document.getElementById('reviewUsername');
  const reviewComment = document.getElementById('reviewComment');
  const reviewsList = document.getElementById('reviewsList');

  // Modal Elements
  const addResourceModal = document.getElementById('addResourceModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const addResourceForm = document.getElementById('addResourceForm');
  const modalAlert = document.getElementById('modalAlert');

  // Initialize Application
  initTheme();
  initEventListeners();
  loadInitialData();

  // --- Theme Management ---
  function initTheme() {
    const savedTheme = localStorage.getItem('shw_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      themeIcon.className = 'fa-solid fa-sun text-yellow-400 text-lg';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      themeIcon.className = 'fa-solid fa-moon text-lg';
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      themeIcon.className = 'fa-solid fa-moon text-lg';
      localStorage.setItem('shw_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      themeIcon.className = 'fa-solid fa-sun text-yellow-400 text-lg';
      localStorage.setItem('shw_theme', 'dark');
    }
  }

  // --- API Calls ---
  async function loadInitialData() {
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    resourcesContainer.classList.add('hidden');

    try {
      const [resData, bkmkData] = await Promise.all([
        fetch('/api/resources').then(r => r.json()),
        fetch('/api/bookmarks').then(r => r.json())
      ]);

      resources = resData || [];
      bookmarks = bkmkData || [];

      updateBookmarkCount();
      renderCategoryCounts();
      renderResources();

      // If we had a selected resource, reload details, otherwise select first if available
      if (selectedResourceId) {
        const found = resources.find(r => r.id === selectedResourceId);
        if (found) selectResource(selectedResourceId);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      loadingState.classList.add('hidden');
      resourcesContainer.classList.remove('hidden');
    }
  }

  async function toggleBookmarkApi(id) {
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: id })
      });
      const data = await res.json();
      if (data.bookmarks) {
        bookmarks = data.bookmarks;
        updateBookmarkCount();
        renderResources();
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  }

  async function fetchReviewsApi(resId) {
    try {
      const res = await fetch(`/api/reviews?resourceId=${resId}`);
      return await res.json();
    } catch (err) {
      console.error('Error fetching reviews:', err);
      return [];
    }
  }

  // --- Rendering Functions ---
  function updateBookmarkCount() {
    if (bookmarkCountEl) {
      bookmarkCountEl.textContent = bookmarks.length;
    }
  }

  function renderCategoryCounts() {
    const counts = { journals: 0, databases: 0, ebooks: 0, portals: 0 };
    resources.forEach(r => {
      if (counts[r.category] !== undefined) counts[r.category]++;
    });

    if (journalCountBadge) journalCountBadge.textContent = counts.journals;
    if (databaseCountBadge) databaseCountBadge.textContent = counts.databases;
    if (ebookCountBadge) ebookCountBadge.textContent = counts.ebooks;
    if (portalCountBadge) portalCountBadge.textContent = counts.portals;
  }

  function getFilteredAndSortedResources() {
    let list = [...resources];

    // Filter by category
    if (activeCategory !== 'all') {
      list = list.filter(r => r.category === activeCategory);
    }

    // Filter by bookmarks
    if (isBookmarkOnly) {
      list = list.filter(r => bookmarks.includes(r.id));
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.name.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(q))) ||
        (categoryConfig[r.category]?.label || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      const avgA = a.ratingCount ? (a.ratingSum / a.ratingCount) : 0;
      const avgB = b.ratingCount ? (b.ratingSum / b.ratingCount) : 0;

      switch (currentSort) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'rating-desc':
          return avgB - avgA || (b.ratingCount || 0) - (a.ratingCount || 0);
        case 'reviews-desc':
          return (b.ratingCount || 0) - (a.ratingCount || 0);
        default:
          return 0;
      }
    });

    return list;
  }

  function renderResources() {
    const filtered = getFilteredAndSortedResources();

    if (filtered.length === 0) {
      resourcesContainer.innerHTML = '';
      resourcesContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
      return;
    }

    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    resourcesContainer.classList.remove('hidden');

    resourcesContainer.innerHTML = filtered.map(r => createResourceCardHtml(r)).join('');

    // Attach card event listeners
    resourcesContainer.querySelectorAll('.resource-card').forEach(card => {
      const resId = card.dataset.id;
      
      // Card click opens details
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.bookmark-btn') && !e.target.closest('.external-link-icon')) {
          selectResource(resId);
        }
      });

      // Bookmark button click
      const bkmkBtn = card.querySelector('.bookmark-btn');
      if (bkmkBtn) {
        bkmkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleBookmarkApi(resId);
        });
      }
    });
  }

  function renderStarsHtml(ratingNum) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      if (ratingNum >= i) {
        starsHtml += '<i class="fa-solid fa-star text-xs text-yellow-400"></i>';
      } else if (ratingNum >= i - 0.5) {
        starsHtml += '<i class="fa-solid fa-star-half-stroke text-xs text-yellow-400"></i>';
      } else {
        starsHtml += '<i class="fa-far fa-star text-xs text-gray-300 dark:text-gray-600"></i>';
      }
    }
    return starsHtml;
  }

  function createResourceCardHtml(r) {
    const isBookmarked = bookmarks.includes(r.id);
    const avgRating = r.ratingCount > 0 ? (r.ratingSum / r.ratingCount).toFixed(1) : 'Unrated';
    const catInfo = categoryConfig[r.category] || { label: r.category, class: 'bg-gray-100 text-gray-800' };
    const isActive = r.id === selectedResourceId;

    const tagsHtml = (r.tags || []).slice(0, 4).map(t => 
      `<span class="text-2xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">${t}</span>`
    ).join(' ');

    return `
      <div data-id="${r.id}" 
        class="resource-card bg-white dark:bg-gray-800 rounded-2xl p-5 border ${isActive ? 'active-resource-card' : 'border-gray-200 dark:border-gray-700'} cursor-pointer flex flex-col justify-between relative shadow-sm hover:border-blue-300 dark:hover:border-blue-600">
        
        <div>
          <!-- Header: Category & Bookmark -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-2xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${catInfo.class}">
              ${catInfo.label}
            </span>
            
            <button class="bookmark-btn p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-yellow-500 transition-colors focus:outline-none" title="${isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}">
              <i class="${isBookmarked ? 'fa-solid text-yellow-500' : 'fa-regular'} fa-star text-base"></i>
            </button>
          </div>

          <!-- Resource Title -->
          <h3 class="text-base font-bold text-gray-900 dark:text-white leading-snug mb-1">
            ${r.name}
          </h3>

          <!-- Purpose / Description -->
          <p class="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">
            ${r.purpose}
          </p>

          <!-- Tags -->
          <div class="flex flex-wrap gap-1 mb-4">
            ${tagsHtml}
          </div>
        </div>

        <!-- Footer: Ratings & Access Link -->
        <div class="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <div class="flex space-x-0.5">
              ${renderStarsHtml(r.ratingCount > 0 ? (r.ratingSum / r.ratingCount) : 0)}
            </div>
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">${avgRating}</span>
            <span class="text-2xs text-gray-400 dark:text-gray-500">(${r.ratingCount || 0})</span>
          </div>

          <a href="${r.url}" target="_blank" rel="noopener noreferrer" 
             class="external-link-icon inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline">
            <span>Open</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-2xs"></i>
          </a>
        </div>
      </div>
    `;
  }

  async function selectResource(id) {
    selectedResourceId = id;
    const r = resources.find(item => item.id === id);

    if (!r) return;

    // Highlight card in grid
    document.querySelectorAll('.resource-card').forEach(card => {
      if (card.dataset.id === id) {
        card.classList.add('active-resource-card');
      } else {
        card.classList.remove('active-resource-card');
      }
    });

    // Populate Sidebar Details
    noSelectionState.classList.add('hidden');
    activeSelectionState.classList.remove('hidden');

    const catInfo = categoryConfig[r.category] || { label: r.category, class: 'bg-gray-100 text-gray-800' };
    detailCategoryBadge.className = `inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-3 ${catInfo.class}`;
    detailCategoryBadge.textContent = catInfo.label;
    
    detailName.textContent = r.name;
    detailPurpose.textContent = r.purpose;
    detailExternalLink.href = r.url;

    const avgVal = r.ratingCount > 0 ? (r.ratingSum / r.ratingCount) : 0;
    detailAvgStars.innerHTML = renderStarsHtml(avgVal);
    detailRatingText.textContent = r.ratingCount > 0 
      ? `${avgVal.toFixed(1)} / 5 (${r.ratingCount} review${r.ratingCount > 1 ? 's' : ''})`
      : 'No reviews yet';

    // Prepare Review Form
    reviewResourceId.value = r.id;
    resetRatingSelector();

    // Fetch and render reviews list
    reviewsList.innerHTML = '<div class="text-xs text-gray-400 py-2">Loading reviews...</div>';
    const reviews = await fetchReviewsApi(r.id);

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<div class="text-xs text-gray-400 italic py-2">No student reviews yet. Be the first to leave feedback!</div>';
    } else {
      reviewsList.innerHTML = reviews.map(rev => `
        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${escapeHtml(rev.userName)}</span>
            <div class="flex text-yellow-400">${renderStarsHtml(rev.rating)}</div>
          </div>
          ${rev.comment ? `<p class="text-xs text-gray-600 dark:text-gray-300">${escapeHtml(rev.comment)}</p>` : ''}
          <span class="text-2xs text-gray-400 dark:text-gray-500 mt-1 block">${new Date(rev.timestamp).toLocaleDateString()}</span>
        </div>
      `).join('');
    }
  }

  function resetRatingSelector() {
    selectedRatingVal = 0;
    selectedRatingValEl.textContent = '(0)';
    ratingStarBtns.forEach(btn => {
      const starIcon = btn.querySelector('i');
      starIcon.className = 'fa-solid fa-star text-lg text-gray-300 dark:text-gray-600';
    });
  }

  function setRatingSelector(val) {
    selectedRatingVal = val;
    selectedRatingValEl.textContent = `(${val})`;
    ratingStarBtns.forEach(btn => {
      const bVal = parseInt(btn.dataset.value, 10);
      const starIcon = btn.querySelector('i');
      if (bVal <= val) {
        starIcon.className = 'fa-solid fa-star text-lg text-yellow-400';
      } else {
        starIcon.className = 'fa-solid fa-star text-lg text-gray-300 dark:text-gray-600';
      }
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Event Listeners Setup ---
  function initEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Search inputs
    const handleSearch = (e) => {
      searchQuery = e.target.value;
      // Sync search inputs
      if (e.target === searchInput) mobileSearchInput.value = searchQuery;
      if (e.target === mobileSearchInput) searchInput.value = searchQuery;
      renderResources();
    };

    searchInput.addEventListener('input', handleSearch);
    mobileSearchInput.addEventListener('input', handleSearch);

    // Category Tabs
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;

        // Reset active styling
        tabBtns.forEach(b => {
          b.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium border-2 border-transparent text-gray-600 hover:text-blue-900 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all focus:outline-none';
        });

        // Set active styling
        btn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold border-2 border-blue-900 bg-blue-900 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white transition-all shadow-sm focus:outline-none';

        renderResources();
      });
    });

    // Sorting
    sortBySelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderResources();
    });

    // Bookmarks Filter Toggle
    bookmarkFilterBtn.addEventListener('click', () => {
      isBookmarkOnly = !isBookmarkOnly;
      if (isBookmarkOnly) {
        bookmarkFilterBtn.classList.add('bg-blue-50', 'border-blue-400', 'dark:bg-blue-900/50');
        activeFiltersAlert.classList.remove('hidden');
        activeFiltersAlert.classList.add('flex');
      } else {
        bookmarkFilterBtn.classList.remove('bg-blue-50', 'border-blue-400', 'dark:bg-blue-900/50');
        activeFiltersAlert.classList.add('hidden');
        activeFiltersAlert.classList.remove('flex');
      }
      renderResources();
    });

    clearFiltersBtn.addEventListener('click', () => {
      isBookmarkOnly = false;
      bookmarkFilterBtn.classList.remove('bg-blue-50', 'border-blue-400', 'dark:bg-blue-900/50');
      activeFiltersAlert.classList.add('hidden');
      activeFiltersAlert.classList.remove('flex');
      renderResources();
    });

    // Star Selector Interaction in Review Form
    ratingStarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value, 10);
        setRatingSelector(val);
      });
    });

    // Submit Review Form
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const resId = reviewResourceId.value;
      const userName = reviewUsername.value.trim();
      const comment = reviewComment.value.trim();

      if (!resId) return;
      if (selectedRatingVal < 1) {
        alert('Please select a star rating from 1 to 5.');
        return;
      }

      try {
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceId: resId,
            userName,
            rating: selectedRatingVal,
            comment
          })
        });

        if (response.ok) {
          reviewComment.value = '';
          resetRatingSelector();
          // Reload initial data to update ratings count & sums
          await loadInitialData();
          if (resId) selectResource(resId);
        } else {
          const errData = await response.json();
          alert(errData.error || 'Failed to submit review.');
        }
      } catch (err) {
        console.error('Error submitting review:', err);
      }
    });

    // Modal Control (Add Resource)
    const openModal = () => {
      addResourceModal.classList.remove('pointer-events-none');
      addResourceModal.classList.remove('opacity-0');
      modalAlert.classList.add('hidden');
      addResourceForm.reset();
    };

    const closeModal = () => {
      addResourceModal.classList.add('pointer-events-none');
      addResourceModal.classList.add('opacity-0');
    };

    addResourceBtn.addEventListener('click', openModal);
    emptyStateAddBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    addResourceModal.addEventListener('click', (e) => {
      if (e.target === addResourceModal) closeModal();
    });

    // Submit Add Resource Form
    addResourceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('newResName').value.trim();
      const category = document.getElementById('newResCategory').value;
      const url = document.getElementById('newResUrl').value.trim();
      const purpose = document.getElementById('newResPurpose').value.trim();
      const tagsStr = document.getElementById('newResTags').value.trim();

      const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

      try {
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, category, url, purpose, tags })
        });

        if (res.ok) {
          const newRes = await res.json();
          modalAlert.className = 'text-xs px-3 py-2 rounded-lg font-semibold bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200 block';
          modalAlert.textContent = 'Resource added successfully!';
          setTimeout(() => {
            closeModal();
            loadInitialData().then(() => selectResource(newRes.id));
          }, 800);
        } else {
          const errData = await res.json();
          modalAlert.className = 'text-xs px-3 py-2 rounded-lg font-semibold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 block';
          modalAlert.textContent = errData.error || 'Error adding resource.';
        }
      } catch (err) {
        console.error('Error adding resource:', err);
        modalAlert.className = 'text-xs px-3 py-2 rounded-lg font-semibold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 block';
        modalAlert.textContent = 'Network error while adding resource.';
      }
    });
  }
});

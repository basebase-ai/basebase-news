import { state } from "./state.js";

let readIds = new Set(JSON.parse(localStorage.getItem("readIds") || "[]"));
let searchTimeout = null;

function debounce(func, wait) {
  return function executedFunction(...args) {
    const later = () => {
      searchTimeout = null;
      func(...args);
    };
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(later, wait);
  };
}

function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function generateSourceHTML(source) {
  if (!source) return "";

  const sourceName = source.name || "Unknown Source";
  const sourceId = source._id;
  const headlines = source.headlines || [];
  const biasScore = source.biasScore ?? 0;
  const biasClass =
    biasScore < -0.3
      ? "text-red-600"
      : biasScore > 0.3
      ? "text-blue-600"
      : "text-gray-600";

  return `
    <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col">
      <div class="p-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            ${
              source.imageUrl
                ? `<img src="${source.imageUrl}" alt="${sourceName}" class="w-6 h-6 rounded-sm object-cover" />`
                : ""
            }
            <h2 class="column-header text-lg">${sourceName}</h2>
          </div>
          <span class="text-sm ${biasClass}">${biasScore.toFixed(2)}</span>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div class="space-y-2">
          ${headlines
            .map(
              (headline) => `
            <div class="group">
              <a 
                href="${headline.articleUrl}" 
                target="_blank" 
                rel="noopener"
                class="block"
                data-headline-id="${headline._id}"
                onmouseover="headlineService.showTooltip(this)"
                onmouseout="headlineService.hideTooltip(this)"
                onclick="headlineService.markAsRead('${headline._id}')"
                oncontextmenu="headlineService.markAsRead('${headline._id}')"
              >
                <div class="news-headline truncate ${
                  readIds.has(headline._id) ? "read" : ""
                }">
                  ${headline.fullHeadline}
                </div>
              </a>
              <div class="tooltip">
                ${headline.fullHeadline}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function filterHeadlines(searchTerm) {
  const scrollContainer = document.querySelector(".grid");
  if (!scrollContainer) return;

  const addSourceButton = state.currentUser
    ? `
    <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="openCustomizeModal()">
      <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
        <i class="ri-add-line"></i>
      </button>
      <p class="text-gray-600 font-poppins">Add News Source</p>
    </div>
    `
    : "";

  if (!searchTerm || searchTerm.trim() === "") {
    scrollContainer.innerHTML =
      state.currentSources
        .map((source) => generateSourceHTML(source))
        .join("") + addSourceButton;
    return;
  }

  const filteredSources = state.currentSources
    .map((source) => {
      const filteredHeadlines = source.headlines.filter(
        (headline) =>
          headline.fullHeadline
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (headline.summary &&
            headline.summary.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      if (filteredHeadlines.length === 0) return null;

      return {
        ...source,
        headlines: filteredHeadlines.map((headline) => ({
          ...headline,
          fullHeadline: highlightText(headline.fullHeadline, searchTerm),
          summary: headline.summary
            ? highlightText(headline.summary, searchTerm)
            : "",
        })),
      };
    })
    .filter(Boolean);

  scrollContainer.innerHTML =
    filteredSources.map((source) => generateSourceHTML(source)).join("") +
    addSourceButton;
}

function markAsRead(headlineId) {
  readIds.add(headlineId);
  if (readIds.size > 100) {
    const idsArray = Array.from(readIds);
    readIds = new Set(idsArray.slice(-100));
  }
  localStorage.setItem("readIds", JSON.stringify([...readIds]));

  // Update all matching headlines immediately
  const headlines = document.querySelectorAll(
    `[data-headline-id="${headlineId}"] .news-headline`
  );
  headlines.forEach((headline) => {
    headline.classList.add("read");
  });
}

function showTooltip(element) {
  const tooltip = element.nextElementSibling;
  if (tooltip && tooltip.classList.contains("tooltip")) {
    setTimeout(() => {
      tooltip.style.display = "block";
    }, 100);
  }
}

function hideTooltip(element) {
  const tooltip = element.nextElementSibling;
  if (tooltip && tooltip.classList.contains("tooltip")) {
    tooltip.style.display = "none";
  }
}

async function loadHeadlines(sourceIds) {
  if (!sourceIds || sourceIds.length === 0) {
    state.currentSources = [];
    return [];
  }

  try {
    const sources = await Promise.all(
      sourceIds.map(async (sourceId) => {
        const response = await fetch(`/api/sources/${sourceId}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.source;
      })
    );

    const validSources = sources
      .filter(Boolean)
      .filter((source) => source.headlines && source.headlines.length > 0)
      .sort((a, b) => Math.abs(b.biasScore || 0) - Math.abs(a.biasScore || 0));

    state.currentSources = validSources;

    const scrollContainer = document.querySelector(".grid");
    if (!scrollContainer) return [];

    const addSourceButton = state.currentUser
      ? `
      <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="openCustomizeModal()">
        <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
          <i class="ri-add-line"></i>
        </button>
        <p class="text-gray-600 font-poppins">Add News Source</p>
      </div>
      `
      : "";

    scrollContainer.innerHTML =
      validSources.map((source) => generateSourceHTML(source)).join("") +
      addSourceButton;

    return validSources;
  } catch (error) {
    console.error("Error loading headlines:", error);
    state.currentSources = [];
    return [];
  }
}

export const headlineService = {
  debounce,
  filterHeadlines,
  generateSourceHTML,
  markAsRead,
  showTooltip,
  hideTooltip,
  loadHeadlines,
};

// Make functions available globally
window.headlineService = headlineService;

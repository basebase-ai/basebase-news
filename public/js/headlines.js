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
    <div class="border border-gray-200 rounded-lg h-[255px] flex flex-col" data-source-id="${sourceId}">
      <div class="px-4 py-2 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            ${
              state.currentUser
                ? `
              <div class="cursor-move text-gray-400 hover:text-gray-600 flex items-center justify-center w-6 h-6 shrink-0">
                <i class="ri-drag-move-fill text-xl"></i>
              </div>
            `
                : ""
            }
            ${
              source.imageUrl
                ? `<img src="${source.imageUrl}" alt="${sourceName}" class="w-6 h-6 rounded-sm object-cover shrink-0" />`
                : ""
            }
            <div class="flex items-baseline gap-2 min-w-0">
              <a href="${
                source.homepageUrl
              }" target="_blank" rel="noopener" class="column-header text-lg hover:text-blue-600 transition-colors truncate">${sourceName}</a>
              ${
                source.lastScrapedAt
                  ? `
                <span class="text-[0.675rem] text-gray-500 font-poppins font-normal shrink-0">${sourceService.formatTimeAgo(
                  new Date(source.lastScrapedAt)
                )}</span>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div class="space-y-1.4">
          ${
            headlines.length > 0
              ? headlines
                  .map(
                    (headline) => `
            <div class="group relative">
              <a 
                href="${headline.articleUrl}" 
                target="_blank" 
                rel="noopener"
                class="block relative"
                data-headline-id="${headline._id}"
                onmouseover="headlineService.showTooltip(this)"
                onmouseout="headlineService.hideTooltip(this)"
                onclick="headlineService.markAsRead('${headline._id}')"
                oncontextmenu="headlineService.markAsRead('${headline._id}')"
              >
                <div class="news-headline truncate ${
                  readIds.has(headline._id) ? "read" : ""
                }" data-original-text="${headline.fullHeadline}">
                  ${headline.fullHeadline}
                </div>
                <div class="tooltip">
                  <div class="font-semibold">${headline.fullHeadline}</div>
                  ${
                    headline.summary
                      ? `<div class="mt-2 text-gray-600">${headline.summary}</div>`
                      : ""
                  }
                </div>
              </a>
            </div>
          `
                  )
                  .join("")
              : `
            <div class="text-gray-500 text-sm text-center py-8 font-poppins">
              No headlines available yet.
            </div>
          `
          }
        </div>
      </div>
    </div>
  `;
}

function clearSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchIcon = document.getElementById("searchIcon");
  const searchClearButton = document.getElementById("searchClearButton");

  searchInput.value = "";
  searchIcon.classList.remove("hidden");
  searchClearButton.classList.add("hidden");
  filterHeadlines("");
}

function filterHeadlines(searchTerm) {
  const scrollContainer = document.querySelector(".grid");
  if (!scrollContainer) return;

  const searchIcon = document.getElementById("searchIcon");
  const searchClearButton = document.getElementById("searchClearButton");

  if (searchTerm && searchTerm.trim() !== "") {
    searchIcon.classList.add("hidden");
    searchClearButton.classList.remove("hidden");
  } else {
    searchIcon.classList.remove("hidden");
    searchClearButton.classList.add("hidden");
  }

  const sourceElements = scrollContainer.querySelectorAll("[data-source-id]");

  sourceElements.forEach((sourceElement) => {
    const headlines = sourceElement.querySelectorAll(".news-headline");
    let hasVisibleHeadlines = false;

    headlines.forEach((headline) => {
      const headlineText = headline.textContent.toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      if (!searchTerm || headlineText.includes(searchLower)) {
        headline.style.display = "block";
        if (searchTerm) {
          headline.innerHTML = highlightText(headline.textContent, searchTerm);
        } else {
          // Reset the headline text to original state
          const originalText =
            headline.getAttribute("data-original-text") || headline.textContent;
          headline.innerHTML = originalText;
        }
        hasVisibleHeadlines = true;
      } else {
        headline.style.display = "none";
      }
    });

    // Show/hide the "No headlines available" message
    const noHeadlinesMsg = sourceElement.querySelector(
      ".text-gray-500.text-sm.text-center"
    );
    if (noHeadlinesMsg) {
      noHeadlinesMsg.style.display = hasVisibleHeadlines ? "none" : "block";
    }
  });
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
  const tooltip = element.querySelector(".tooltip");
  if (tooltip) {
    tooltip.style.display = "block";
  }
}

function hideTooltip(element) {
  const tooltip = element.querySelector(".tooltip");
  if (tooltip) {
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

    // Filter out invalid sources and those without headlines, but preserve order
    const validSources = sources.filter(Boolean).map((source) => ({
      ...source,
      headlines: source.headlines || [],
    }));

    state.currentSources = validSources;

    const scrollContainer = document.querySelector(".grid");
    if (!scrollContainer) return [];

    const addSourceButton = state.currentUser
      ? `
      <div class="border border-gray-200 rounded-lg h-[255px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="openCustomizeModal()">
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

    // Initialize Sortable on the main grid
    if (state.currentUser) {
      new Sortable(scrollContainer, {
        animation: 150,
        handle: ".cursor-move",
        onEnd: async function (evt) {
          const newOrder = Array.from(scrollContainer.children)
            .filter((el) => el.dataset.sourceId) // Filter out the "Add Source" button
            .map((el) => el.dataset.sourceId);
          try {
            const response = await fetch("/api/users/me/sources", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sourceIds: newOrder,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to update source order");
            }

            const updatedUser = await response.json();
            state.currentUser = updatedUser.user;
          } catch (error) {
            console.error("Failed to update source order:", error);
            alert("Failed to update source order. Please try again.");
          }
        },
      });
    }

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
  clearSearch,
};

// Make functions available globally
window.headlineService = headlineService;

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

function filterHeadlines(searchTerm) {
  const scrollContainer = document.querySelector(".grid");
  if (!scrollContainer) return;

  if (!searchTerm || searchTerm.trim() === "") {
    scrollContainer.innerHTML =
      currentSources.map((source) => generateSourceHTML(source)).join("") +
      (currentUser
        ? `
      <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center">
        <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
          <i class="ri-add-line"></i>
        </button>
        <p class="text-gray-600 font-poppins">Add News Source</p>
      </div>
      `
        : "");
    return;
  }

  const filteredSources = currentSources
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
    (currentUser
      ? `
    <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center">
      <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
        <i class="ri-add-line"></i>
      </button>
      <p class="text-gray-600 font-poppins">Add News Source</p>
    </div>
    `
      : "");
}

function markAsRead(headlineId) {
  readIds.add(headlineId);
  if (readIds.size > 100) {
    const idsArray = Array.from(readIds);
    readIds = new Set(idsArray.slice(-100));
  }
  localStorage.setItem("readIds", JSON.stringify([...readIds]));
  const headlineElement = document.querySelector(
    `[data-headline-id="${headlineId}"]`
  );
  if (headlineElement) {
    headlineElement.classList.add("read");
  }
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

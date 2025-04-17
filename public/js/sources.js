let currentSources = [];

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
}

function generateSourceHTML(source, showSettings = false) {
  return `
    <div class="border border-gray-200 rounded-lg h-[255px] flex flex-col">
      <div class="column-header text-lg mb-3 pb-2 border-b border-gray-300 pt-2 flex items-center justify-between px-4">
        <div class="flex-grow">
          <a href="${
            source.homepageUrl
          }" target="_blank" rel="noopener" class="flex items-center gap-2 hover:text-blue-600 transition-colors">
            ${
              source.imageUrl
                ? `<img src="${source.imageUrl}" alt="${source.name}" class="w-6 h-6 rounded-sm object-cover" />`
                : ""
            }
            <span class="text-lg font-bold">${source.name}</span>
            ${
              source.lastScrapedAt
                ? `<span class="text-[0.675rem] text-gray-500 font-poppins font-normal">${formatTimeAgo(
                    new Date(source.lastScrapedAt)
                  )}</span>`
                : ""
            }
          </a>
        </div>
        ${
          showSettings && isAdmin
            ? `
          <div class="relative inline-block">
            <button onclick="sourceService.toggleDropdown('${source._id}')" class="text-gray-500 hover:text-blue-600 transition-colors">
              <i class="ri-settings-4-line text-lg"></i>
            </button>
            <div id="dropdown-${source._id}" class="hidden absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-50 border border-gray-200">
              <div class="py-1">
                <button onclick="sourceService.scrapeSource('${source._id}'); sourceService.toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ui-font font-normal">
                  <i class="ri-refresh-line mr-2"></i>Refresh
                </button>
                <button onclick="sourceService.openSourceSettingsModal('${source._id}'); sourceService.toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ui-font font-normal">
                  <i class="ri-edit-line mr-2"></i>Edit
                </button>
                <button onclick="sourceService.deleteSource('${source._id}'); sourceService.toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 ui-font font-normal">
                  <i class="ri-delete-bin-line mr-2"></i>Delete
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
      <div class="space-y-1 flex-1 overflow-y-auto custom-scrollbar px-4">
        ${
          source.headlines
            ? source.headlines
                .sort((a, b) => (a.inPageRank ?? 0) - (b.inPageRank ?? 0))
                .map(
                  (headline) => `
            <div class="truncate relative">
              <a href="${headline.articleUrl}"
                 onmousedown="markAsRead('${headline._id}')"
                 data-headline-id="${headline._id}"
                 title="${headline.fullHeadline}"
                 onmouseenter="showTooltip(this)"
                 onmouseleave="hideTooltip(this)"
                 class="news-headline block font-semibold text-base leading-tight truncate ${
                   readIds.has(headline._id) ? "read" : ""
                 }"
                 target="_blank"
                 rel="noopener">
                ${headline.fullHeadline}
              </a>
              <div class="tooltip">
                ${headline.fullHeadline}
                ${headline.summary ? "<br><br>" + headline.summary : ""}
              </div>
            </div>
          `
                )
                .join("")
            : `<div class="text-gray-500 text-sm">No headlines available</div>`
        }
      </div>
    </div>
  `;
}

function openSourceSettingsModal(sourceId) {
  const form = document.getElementById("sourceSettingsForm");
  const modalTitle = document.getElementById("modalTitle");
  const submitButton = document.getElementById("submitButton");
  const objectIdField = document.getElementById("objectIdField");

  form.reset();

  if (sourceId) {
    const source = currentSources.find((s) => s._id === sourceId);
    if (!source) return;

    modalTitle.textContent = "Edit Source";
    submitButton.textContent = "Update";

    document.getElementById("sourceId").value = source._id;
    document.getElementById("displayObjectId").value = source._id;
    objectIdField.classList.remove("hidden");

    document.getElementById("name").value = source.name;
    document.getElementById("homepageUrl").value = source.homepageUrl;
    document.getElementById("rssUrl").value = source.rssUrl || "";
    document.getElementById("includeSelector").value = source.includeSelector;
    document.getElementById("excludeSelector").value =
      source.excludeSelector || "";
    document.getElementById("biasScore").value = source.biasScore || 0;
    document.getElementById("tags").value = source.tags
      ? source.tags.join(", ")
      : "";
    document.getElementById("imageUrl").value = source.imageUrl || "";
  } else {
    modalTitle.textContent = "Add New Source";
    submitButton.textContent = "Add";
    document.getElementById("sourceId").value = "";
    objectIdField.classList.add("hidden");
  }

  document.getElementById("sourceSettingsModal").classList.remove("hidden");
}

function closeSourceSettingsModal() {
  document.getElementById("sourceSettingsModal").classList.add("hidden");
}

async function handleSourceSubmit(event) {
  event.preventDefault();

  const sourceId = document.getElementById("sourceId").value;
  const tagsInput = document.getElementById("tags").value;
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  const formData = {
    name: document.getElementById("name").value,
    homepageUrl: document.getElementById("homepageUrl").value,
    rssUrl: document.getElementById("rssUrl").value || undefined,
    includeSelector:
      document.getElementById("includeSelector").value || undefined,
    excludeSelector:
      document.getElementById("excludeSelector").value || undefined,
    biasScore: document.getElementById("biasScore").value
      ? parseFloat(document.getElementById("biasScore").value)
      : undefined,
    tags: tags.length > 0 ? tags : undefined,
    imageUrl: document.getElementById("imageUrl").value || undefined,
  };

  try {
    const isEdit = sourceId !== "";
    const response = await fetch(
      isEdit ? `/api/sources/${sourceId}` : "/api/sources",
      {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    if (!response.ok)
      throw new Error(
        isEdit ? "Failed to update source" : "Failed to add source"
      );

    window.location.reload();
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  }
}

function toggleDropdown(sourceId) {
  const dropdown = document.getElementById(`dropdown-${sourceId}`);
  if (dropdown) {
    dropdown.classList.toggle("hidden");
  }
}

async function deleteSource(sourceId) {
  if (!confirm("Are you sure you want to delete this source?")) return;

  try {
    const response = await fetch(`/api/sources/${sourceId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete source");

    window.location.reload();
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  }
}

async function scrapeSource(sourceId) {
  try {
    const response = await fetch(`/api/sources/${sourceId}/scrape`, {
      method: "POST",
    });

    if (!response.ok) throw new Error("Failed to queue source for scraping");

    const source = currentSources.find((s) => s._id === sourceId);
    alert(`${source?.name || "Source"} has been queued for crawling.`);
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  }
}

export const sourceService = {
  formatTimeAgo,
  generateSourceHTML,
  openSourceSettingsModal,
  closeSourceSettingsModal,
  handleSourceSubmit,
  toggleDropdown,
  deleteSource,
  scrapeSource,
  setCurrentSources(sources) {
    currentSources = sources;
  },
};

// Make service available globally
if (typeof window !== "undefined") {
  window.sourceService = sourceService;
  console.log("sourceService initialized:", window.sourceService);
}

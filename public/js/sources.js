import { state } from "./state.js";
import { loadAllSources, renderSourcesGrid } from "./main.js";

let currentSources = [];
let readIds = new Set(JSON.parse(localStorage.getItem("readIds") || "[]"));

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

function generateSourceHTML(source, options = {}) {
  const {
    showSettings = false,
    isCustomizeView = false,
    isChecked = false,
    showDragHandle = false,
  } = options;

  const sourceId = source._id.toString();
  const sourceName = source.name || "Unknown Source";
  const headlines = source.headlines || [];
  const biasScore = source.biasScore ?? 0;
  const biasClass =
    biasScore < -0.3
      ? "text-red-600"
      : biasScore > 0.3
      ? "text-blue-600"
      : "text-gray-600";

  if (isCustomizeView) {
    return `
      <div class="border border-gray-200 rounded-md p-4" data-source-id="${sourceId}">
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            ${
              showDragHandle
                ? `
              <div class="cursor-move text-gray-400 hover:text-gray-600">
                <i class="ri-drag-move-line"></i>
              </div>
            `
                : ""
            }
            <input
              type="checkbox"
              id="source-${source._id}"
              ${isChecked ? "checked" : ""}
              onchange="handleSourceToggle('${source._id}')"
              class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <div class="flex items-start gap-2">
                <label for="source-${
                  source._id
                }" class="font-medium cursor-pointer">
                  ${
                    source.imageUrl
                      ? `<img src="${source.imageUrl}" alt="${source.name}" class="w-6 h-6 rounded-sm object-cover" />`
                      : ""
                  }
                </label>
                <a href="${
                  source.homepageUrl
                }" target="_blank" rel="noopener" class="font-medium hover:text-blue-600 transition-colors">${
      source.name
    }</a>
              </div>
              ${
                source.tags?.length
                  ? `
                <div class="text-sm text-gray-500 mt-1">
                  ${source.tags.join(", ")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
          ${
            showSettings && state.isAdmin
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
      </div>
    `;
  }

  return `
    <div class="border border-gray-200 rounded-md h-[230px] flex flex-col" data-source-id="${sourceId}">
      <div class="px-4 py-2 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            ${
              showDragHandle
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
                <span class="text-[0.675rem] text-gray-500 font-poppins font-normal shrink-0">${formatTimeAgo(
                  new Date(source.lastScrapedAt)
                )}</span>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4">
        <div class="space-y-1.4">
          <div class="h-2"></div>
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

    const result = await response.json();

    // Close only the source settings modal
    closeSourceSettingsModal();

    // If this is a new source and the user is logged in, add it to their sourceIds
    if (!isEdit && state.currentUser && result.source && result.source._id) {
      try {
        const userResponse = await fetch("/api/users/me/sources", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceIds: [
              ...(state.currentUser.sourceIds || []),
              result.source._id,
            ],
          }),
        });

        if (!userResponse.ok) {
          throw new Error("Failed to update user sources");
        }

        const updatedUser = await userResponse.json();
        state.currentUser = updatedUser.user;
      } catch (error) {
        console.error("Failed to update user sources:", error);
        alert(
          "Source created but failed to add it to your list. Please try again."
        );
      }
    }

    // Refresh the sources list in the customize modal
    const sources = await loadAllSources();
    renderSourcesGrid(sources);

    // Check the checkbox for the new source after grid is rendered
    if (!isEdit && result.source && result.source._id) {
      const checkbox = document.getElementById(`source-${result.source._id}`);
      if (checkbox) {
        checkbox.checked = true;
      }
    }
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
  readIds,
};

// Make service available globally
if (typeof window !== "undefined") {
  window.sourceService = sourceService;
  console.log("sourceService initialized:", window.sourceService);
}

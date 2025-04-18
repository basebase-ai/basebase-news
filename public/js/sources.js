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

function generateSourceHTML(source) {
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

  return `
    <div class="border border-gray-200 dark:border-gray-700 rounded-md ${
      state.denseMode ? "h-[230px]" : "h-[300px]"
    } flex flex-col" data-source-id="${sourceId}">
      <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 min-w-0">
            <div class="cursor-move text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex items-center justify-center w-6 h-6 shrink-0">
              <i class="ri-drag-move-fill text-xl"></i>
            </div>
            ${
              source.imageUrl
                ? `<img src="${source.imageUrl}" alt="${sourceName}" class="w-6 h-6 rounded-sm object-cover shrink-0" />`
                : ""
            }
            <div class="flex items-baseline gap-2 min-w-0">
              <a href="${
                source.homepageUrl
              }" target="_blank" rel="noopener" class="column-header text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate text-gray-900 dark:text-white">${sourceName}</a>
              ${
                source.lastScrapedAt
                  ? `
                <span class="text-[0.675rem] text-gray-500 dark:text-gray-400 font-poppins font-normal shrink-0">${formatTimeAgo(
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
        <div class="${state.denseMode ? "space-y-2.5" : "space-y-2.5"}">
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
                onclick="headlineService.markAsRead('${headline._id}')"
                oncontextmenu="headlineService.markAsRead('${headline._id}')"
              >
                <div class="news-headline ${
                  state.denseMode
                    ? "truncate"
                    : "whitespace-normal line-clamp-2"
                } ${
                      readIds.has(headline._id) ? "read" : ""
                    } text-gray-900 dark:text-white" data-original-text="${
                      headline.fullHeadline
                    }">
                  <span class="font-bold">${headline.fullHeadline}</span>${
                      headline.summary
                        ? ` <span class="font-normal text-gray-600 dark:text-gray-400">- ${headline.summary}</span>`
                        : ""
                    }
                </div>
              </a>
            </div>
          `
                  )
                  .join("")
              : `
            <div class="text-gray-500 dark:text-gray-400 text-sm text-center py-8 font-poppins">
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
    includeSelector: document.getElementById("includeSelector").value || "",
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

        // Add the new source ID to the URL
        const url = new URL(window.location.href);
        url.searchParams.set("newSource", result.source._id);
        window.history.replaceState({}, "", url);
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
      setTimeout(() => {
        const checkbox = document.getElementById(`source-${result.source._id}`);
        if (checkbox) {
          checkbox.checked = true;
        }
      }, 100);
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

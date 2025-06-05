import { state } from "./state.js";
import { loadAllSources, renderSourcesGrid } from "./main.js";

let currentSources = [];
let currentPreviewStory = null;

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

export { formatTimeAgo };

function generateSourceHTML(source) {
  const sourceId = source._id.toString();
  const sourceName = source.name || "Unknown Source";
  const stories = source.stories || [];
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
    } flex flex-col bg-white dark:bg-black" data-source-id="${sourceId}">
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
                <span class="text-[0.81rem] text-gray-500 dark:text-gray-400 font-poppins font-normal shrink-0">${formatTimeAgo(
                  new Date(source.lastScrapedAt)
                )}</span>
              `
                  : ""
              }
              ${
                source.hasPaywall
                  ? `<span class="ml-2 text-gray-500 dark:text-gray-400" title="This news source has a paywall"><i class="ri-lock-line text-base"></i></span>`
                  : ""
              }
            </div>
          </div>
          <button 
            onclick="sourceService.refreshSource('${sourceId}')" 
            class="text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 w-8 h-8 flex items-center justify-center font-poppins"
            title="Refresh headlines"
          >
            <i class="ri-refresh-line text-2xl"></i>
          </button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4" id="stories-${sourceId}">
        <div class="${state.denseMode ? "space-y-px" : "space-y-0.5"} pt-1">
          ${
            stories.length > 0
              ? stories
                  .map(
                    (story) => `
            <div class="group relative">
              <a 
                href="javascript:void(0);" 
                class="block relative cursor-pointer"
                data-story-id="${story._id}"
                data-story-url="${story.articleUrl}"
                data-story-headline="${(story.fullHeadline || "").replace(
                  /"/g,
                  "&quot;"
                )}"
                data-story-summary="${(story.summary || "").replace(
                  /"/g,
                  "&quot;"
                )}"
                data-story-image="${story.imageUrl || ""}"
                data-has-paywall="${source.hasPaywall ? "true" : "false"}"
                onclick="sourceService.handleStoryClick(this)"
              >
                <div class="news-headline ${
                  state.denseMode
                    ? "truncate"
                    : "whitespace-normal line-clamp-2"
                } ${
                      story.status === "READ" ? "read" : ""
                    } text-gray-900 dark:text-white font-poppins relative" data-original-text="${
                      story.fullHeadline || ""
                    }">
                  <span class="font-normal">${story.fullHeadline || ""}</span>${
                      story.summary
                        ? ` <span class="font-normal text-gray-600 dark:text-gray-400">- ${story.summary}</span>`
                        : ""
                    }
                  <span class="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white dark:bg-gray-800 px-1.5 py-0.5 pb-2 text-xs text-gray-500 dark:text-gray-400 rounded font-poppins z-20 mr-1 mt-0.5 shadow-sm">
                    ${formatTimeAgo(
                      new Date(story.updatedAt || story.createdAt)
                    )}
                  </span>
                </div>
              </a>
            </div>
          `
                  )
                  .join("")
              : `
            <div class="text-gray-500 dark:text-gray-400 text-sm text-center py-8 font-poppins">
              No stories available yet.
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
  document.getElementById("hasPaywall").checked = source.hasPaywall || false;

  document.getElementById("sourceSettingsModal").classList.remove("hidden");
}

function openNewSourceModal() {
  const form = document.getElementById("newSourceForm");
  form.reset();
  document.getElementById("newSourceModal").classList.remove("hidden");
}

function closeSourceSettingsModal() {
  document.getElementById("sourceSettingsModal").classList.add("hidden");
}

function closeNewSourceModal() {
  document.getElementById("newSourceModal").classList.add("hidden");
}

let sourceToDelete = null;

function confirmDeleteSource(sourceId) {
  sourceToDelete = sourceId;
  document.getElementById("deleteSourceModal").classList.remove("hidden");
  document.getElementById("confirmDeleteButton").onclick = () =>
    deleteSource(sourceId);
}

function closeDeleteSourceModal() {
  document.getElementById("deleteSourceModal").classList.add("hidden");
  sourceToDelete = null;
}

async function handleNewSourceSubmit(event) {
  event.preventDefault();

  // Get and normalize the homepage URL (remove trailing slashes)
  const homepageUrl = document
    .getElementById("newSourceHomepageUrl")
    .value.trim()
    .replace(/\/+$/, "");

  // Simple formData with just the fields available in the form
  const formData = {
    name: document.getElementById("newSourceName").value,
    homepageUrl,
    rssUrl:
      document.getElementById("newSourceRssUrl")?.value?.trim() || undefined,
    // Use default values for required fields
    includeSelector: "main", // Default selector that works for many sites
  };

  try {
    const response = await fetch("/api/sources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // If it's a duplicate source (409 Conflict)
      if (response.status === 409 && errorData.source) {
        closeNewSourceModal();
        alert(
          `This source (${errorData.source.name}) already exists in the system.`
        );

        // If the user is logged in, we can add the existing source to their list
        if (state.currentUser && errorData.source._id) {
          // Check if user already has this source
          const alreadyHasSource = state.currentUser.sourceIds?.includes(
            errorData.source._id
          );

          if (!alreadyHasSource) {
            try {
              const userResponse = await fetch("/api/users/me/sources", {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  sourceIds: [
                    ...(state.currentUser.sourceIds || []),
                    errorData.source._id,
                  ],
                }),
              });

              if (userResponse.ok) {
                const updatedUser = await userResponse.json();
                state.currentUser = updatedUser.user;

                // Update URL to highlight the existing source
                const url = new URL(window.location.href);
                url.searchParams.set("newSource", errorData.source._id);
                window.history.replaceState({}, "", url);

                // Refresh the sources grid
                const sources = await loadAllSources();
                renderSourcesGrid(sources);

                // Check the checkbox for the existing source
                setTimeout(() => {
                  const checkbox = document.getElementById(
                    `source-${errorData.source._id}`
                  );
                  if (checkbox) {
                    checkbox.checked = true;
                  }
                }, 100);
              }
            } catch (error) {
              console.error("Failed to update user sources:", error);
            }
          }
        }
        return;
      }

      throw new Error(errorData.message || "Failed to add source");
    }

    const result = await response.json();

    closeNewSourceModal();

    if (state.currentUser && result.source && result.source._id) {
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

    const sources = await loadAllSources();
    renderSourcesGrid(sources);

    if (result.source && result.source._id) {
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

  // Get and normalize the homepage URL (remove trailing slashes)
  const homepageUrl = document
    .getElementById("homepageUrl")
    .value.trim()
    .replace(/\/+$/, "");

  const formData = {
    name: document.getElementById("name").value,
    homepageUrl,
    rssUrl: document.getElementById("rssUrl").value,
    includeSelector: document.getElementById("includeSelector").value || "",
    excludeSelector:
      document.getElementById("excludeSelector").value || undefined,
    biasScore: document.getElementById("biasScore").value
      ? parseFloat(document.getElementById("biasScore").value)
      : undefined,
    tags: tags.length > 0 ? tags : undefined,
    imageUrl: document.getElementById("imageUrl").value || undefined,
    hasPaywall: document.getElementById("hasPaywall").checked,
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
  try {
    const response = await fetch(`/api/sources/${sourceId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete source");

    closeDeleteSourceModal();
    const sources = await loadAllSources();
    renderSourcesGrid(sources);
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

async function refreshSource(sourceId) {
  const storiesContainer = document.getElementById(`stories-${sourceId}`);
  if (!storiesContainer) {
    return;
  }

  // Show loading animation
  storiesContainer.innerHTML = `
    <div class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  `;

  try {
    // Trigger scrape on server
    const response = await fetch(`/api/sources/${sourceId}/scrape`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to trigger scrape");
    }

    // Wait a bit for the scrape to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Fetch updated stories
    const sourceResponse = await fetch(`/api/sources/${sourceId}`);
    if (!sourceResponse.ok) {
      throw new Error("Failed to fetch updated stories");
    }

    const data = await sourceResponse.json();
    const source = data.source;

    // Update the stories container with new content
    const storiesHTML =
      source.stories?.length > 0
        ? source.stories
            .map(
              (story) => `
          <div class="group relative">
            <a 
              href="javascript:void(0);" 
              class="block relative cursor-pointer"
              data-story-id="${story._id}"
              data-story-url="${story.articleUrl}"
              data-story-headline="${(story.fullHeadline || "").replace(
                /"/g,
                "&quot;"
              )}"
              data-story-summary="${(story.summary || "").replace(
                /"/g,
                "&quot;"
              )}"
              data-story-image="${story.imageUrl || ""}"
              data-has-paywall="${source.hasPaywall ? "true" : "false"}"
              onclick="sourceService.handleStoryClick(this)"
            >
              <div class="news-headline ${
                state.denseMode ? "truncate" : "whitespace-normal line-clamp-2"
              } ${
                story.status === "READ" ? "read" : ""
              } text-gray-900 dark:text-white font-poppins relative" data-original-text="${
                story.fullHeadline || ""
              }">
                <span class="font-normal">${story.fullHeadline || ""}</span>${
                story.summary
                  ? ` <span class="font-normal text-gray-600 dark:text-gray-400">- ${story.summary}</span>`
                  : ""
              }
                <span class="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white dark:bg-gray-800 px-1.5 py-0.5 pb-2 text-xs text-gray-500 dark:text-gray-400 rounded font-poppins z-20 mr-1 mt-0.5 shadow-sm">
                  ${formatTimeAgo(new Date(story.updatedAt || story.createdAt))}
                </span>
              </div>
            </a>
          </div>
        `
            )
            .join("")
        : `
        <div class="text-gray-500 dark:text-gray-400 text-sm text-center py-8 font-poppins">
          No stories available yet.
        </div>
      `;

    storiesContainer.innerHTML = `
      <div class="${state.denseMode ? "space-y-px" : "space-y-0.5"}">
        ${storiesHTML}
      </div>
    `;
  } catch (error) {
    console.error("Error refreshing source:", error);
    storiesContainer.innerHTML = `
      <div class="text-red-500 dark:text-red-400 text-sm text-center py-8 font-poppins">
        Failed to refresh stories. Please try again.
      </div>
    `;
  }
}

function handleStoryClick(element) {
  const storyId = element.getAttribute("data-story-id");
  const articleUrl = element.getAttribute("data-story-url");
  const hasPaywall = element.getAttribute("data-has-paywall") === "true";

  // Mark as read regardless of the action
  headlineService.markAsRead(storyId);

  if (hasPaywall) {
    // Show the preview modal for paywalled content
    showPreviewModal(element);
  } else {
    // Go directly to the article for non-paywalled content
    window.open(articleUrl, "_blank", "noopener");
  }
}

function showPreviewModal(element) {
  // Extract story data from data attributes
  const storyId = element.getAttribute("data-story-id");
  const articleUrl = element.getAttribute("data-story-url");
  const headline = element.getAttribute("data-story-headline");
  const summary = element.getAttribute("data-story-summary");
  const imageUrl = element.getAttribute("data-story-image");
  const hasPaywall = element.getAttribute("data-has-paywall") === "true";

  // Find the full story object to get the timestamp
  const storyElement = element.closest("[data-story-id]");
  const parentSource = storyElement?.closest("[data-source-id]");
  const sourceId = parentSource?.getAttribute("data-source-id");

  // Find the actual story object from currentSources to get the timestamp
  let timestamp = new Date();
  if (sourceId) {
    const source = currentSources.find((s) => s._id === sourceId);
    if (source) {
      const story = source.stories?.find((s) => s._id === storyId);
      if (story) {
        timestamp = new Date(story.updatedAt || story.createdAt);
      }
    }
  }

  // Get or create the preview modal
  let previewModal = document.getElementById("storyPreviewModal");
  if (!previewModal) {
    previewModal = document.createElement("div");
    previewModal.id = "storyPreviewModal";
    previewModal.className =
      "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4";
    document.body.appendChild(previewModal);
  }

  // Use description if available, otherwise fall back to summary
  const contentText = summary || "";

  previewModal.innerHTML = `
    <div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col mx-auto font-poppins">
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white truncate">Story Preview</h2>
        <button onclick="sourceService.closePreviewModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-poppins">
          <i class="ri-close-line text-2xl"></i>
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        ${
          imageUrl
            ? `<div class="w-full h-96 bg-gray-100 dark:bg-gray-800">
                <img src="${imageUrl}" alt="${headline}" class="w-full h-full object-cover">
              </div>`
            : ""
        }
        
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 font-poppins">${headline}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 font-poppins">
            ${timestamp.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </p>
          ${
            contentText
              ? `<p class="text-gray-700 dark:text-gray-300 mb-6 font-poppins">${contentText}</p>`
              : ""
          }
        </div>
      </div>
      
      <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        ${
          hasPaywall
            ? `<span class="text-gray-500 dark:text-gray-400 text-sm font-poppins flex items-center">
          <i class="ri-lock-line mr-1 text-base"></i>You may encounter a paywall.
        </span>`
            : `<span></span>`
        }
        <a 
          href="${articleUrl}" 
          target="_blank" 
          rel="noopener" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-poppins min-w-[110px] text-center whitespace-nowrap"
        >
          Go to Story
        </a>
      </div>
    </div>
  `;

  previewModal.classList.remove("hidden");

  // Close on background click
  previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) {
      closePreviewModal();
    }
  });

  // Close on escape key
  document.addEventListener("keydown", handleEscapeKey);
}

function closePreviewModal() {
  const previewModal = document.getElementById("storyPreviewModal");
  if (previewModal) {
    previewModal.classList.add("hidden");
    document.removeEventListener("keydown", handleEscapeKey);
  }
}

function handleEscapeKey(e) {
  if (e.key === "Escape") {
    closePreviewModal();
  }
}

export const sourceService = {
  formatTimeAgo,
  generateSourceHTML,
  openSourceSettingsModal,
  closeSourceSettingsModal,
  openNewSourceModal,
  closeNewSourceModal,
  handleNewSourceSubmit,
  handleSourceSubmit,
  toggleDropdown,
  confirmDeleteSource,
  closeDeleteSourceModal,
  deleteSource,
  scrapeSource,
  refreshSource,
  showPreviewModal,
  closePreviewModal,
  handleStoryClick,
  setCurrentSources(sources) {
    currentSources = sources;
  },
};

// Make service available globally
if (typeof window !== "undefined") {
  window.sourceService = sourceService;
}

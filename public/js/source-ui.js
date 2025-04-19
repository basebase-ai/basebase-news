import { formatTimeAgo } from "./sources.js";

export function createSourceCard(source) {
  const card = document.createElement("div");
  card.className =
    "bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow";

  const sourceName = document.createElement("div");
  sourceName.className = "flex items-center gap-2 mb-2";

  if (source.imageUrl) {
    const img = document.createElement("img");
    img.src = source.imageUrl;
    img.alt = source.name;
    img.className = "w-8 h-8 rounded-full object-cover";
    sourceName.appendChild(img);
  }

  const name = document.createElement("h3");
  name.className = "font-medium text-gray-900";
  name.textContent = source.name;
  sourceName.appendChild(name);

  card.appendChild(sourceName);
  return card;
}

export function renderSourcesGrid(sources, searchTerm = "", state) {
  const grid = document.getElementById("sourcesGrid");
  const filteredSources = searchTerm
    ? sources.filter(
        (source) =>
          source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (source.tags &&
            source.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      )
    : sources;

  grid.innerHTML = filteredSources
    .map((source) => {
      const sourceId = source._id.toString();
      const isChecked = state.currentUser?.sourceIds?.includes(sourceId);

      return `
        <div class="border border-gray-200 rounded-md p-4" data-source-id="${sourceId}">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                id="source-${source._id}"
                ${isChecked ? "checked" : ""}
                onchange="handleSourceToggle('${source._id}', event)"
                class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <div class="flex items-start gap-2">
                  <label for="source-${
                    source._id
                  }" class="font-medium cursor-pointer">
                    ${
                      source.imageUrl
                        ? `<img src="${source.imageUrl}" alt="${source.name}" class="w-6 h-6 rounded-sm object-cover">`
                        : ""
                    }
                  </label>
                  <a href="${
                    source.homepageUrl
                  }" target="_blank" rel="noopener" class="font-medium hover:text-blue-600 transition-colors text-gray-900 dark:text-white">${
        source.name
      }</a>
                  <div class="flex items-center gap-2">
                    ${
                      source.hasPaywall
                        ? `<span class="text-gray-500 dark:text-gray-400" title="This news source has a paywall"><i class="ri-lock-line text-base"></i></span>`
                        : ""
                    }
                  </div>
                </div>
                ${
                  source.tags
                    ? `<div class="text-sm text-gray-500 mt-1">${source.tags.join(
                        ", "
                      )}</div>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderCustomizeModalGrid(sources, searchTerm = "", state) {
  const grid = document.getElementById("sourcesGrid");
  const filteredSources = searchTerm
    ? sources.filter(
        (source) =>
          source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (source.tags &&
            source.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      )
    : sources;

  if (searchTerm) {
    grid.innerHTML = filteredSources
      .map((source) => generateSourceTile(source, state, "search"))
      .join("");
    return;
  }

  const tagOrder = ["popular", "recommended", "news", "tech"];
  const sourcesByTag = new Map();
  const untaggedSources = [];

  filteredSources.forEach((source) => {
    if (!source.tags?.length) {
      untaggedSources.push(source);
      return;
    }

    source.tags.forEach((tag) => {
      if (!sourcesByTag.has(tag)) {
        sourcesByTag.set(tag, []);
      }
      sourcesByTag.get(tag).push(source);
    });
  });

  let html = "";

  for (const tag of tagOrder) {
    const tagSources = sourcesByTag.get(tag);
    if (tagSources?.length) {
      html += `
        <div class="col-span-full">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">${tag}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${tagSources
              .map((source) => generateSourceTile(source, state, tag))
              .join("")}
          </div>
        </div>
      `;
      sourcesByTag.delete(tag);
    }
  }

  for (const [tag, tagSources] of sourcesByTag) {
    html += `
      <div class="col-span-full">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">${tag}</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${tagSources
            .map((source) => generateSourceTile(source, state, tag))
            .join("")}
        </div>
      </div>
    `;
  }

  if (untaggedSources.length) {
    html += `
      <div class="col-span-full">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Other</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          ${untaggedSources
            .map((source) => generateSourceTile(source, state, "other"))
            .join("")}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function generateSourceTile(source, state, tagSection = "") {
  const sourceId = source._id.toString();
  const isChecked = state.currentUser?.sourceIds?.includes(sourceId);
  const uniqueId = `${sourceId}-${tagSection}`;

  return `
    <div class="border border-gray-200 dark:border-gray-700 rounded-md p-4 relative" data-source-id="${sourceId}">
      <div class="flex items-start justify-between">
        <div class="flex items-start gap-3">
          <input
            type="checkbox"
            id="source-${uniqueId}"
            ${isChecked ? "checked" : ""}
            onchange="handleSourceToggle('${source._id}', event)"
            class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
          />
          <div>
            <div class="flex items-start gap-2">
              <label for="source-${uniqueId}" class="font-medium cursor-pointer text-gray-900 dark:text-white">
                ${
                  source.imageUrl
                    ? `<img src="${source.imageUrl}" alt="${source.name}" class="w-6 h-6 rounded-sm object-cover">`
                    : ""
                }
              </label>
              <a href="${
                source.homepageUrl
              }" target="_blank" rel="noopener" class="font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-gray-900 dark:text-white">${
    source.name
  }</a>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${
            source.hasPaywall
              ? `<span class="text-gray-500 dark:text-gray-400" title="This news source has a paywall"><i class="ri-lock-line text-base"></i></span>`
              : ""
          }
          ${
            state.isAdmin
              ? `
            <div class="relative">
              <button class="source-settings-btn text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors w-8 h-8 flex items-center justify-center font-poppins" data-source-id="${uniqueId}">
                <i class="ri-settings-4-line text-2xl"></i>
              </button>
              <div id="dropdown-${uniqueId}" class="hidden absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-[100] border border-gray-200 dark:border-gray-700">
                <div class="py-1">
                  <button class="source-action-btn w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal font-poppins" data-action="scrape" data-source-id="${source._id}" data-dropdown-id="${uniqueId}">
                    <i class="ri-refresh-line mr-2"></i>Refresh
                  </button>
                  <button class="source-action-btn w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal font-poppins" data-action="edit" data-source-id="${source._id}" data-dropdown-id="${uniqueId}">
                    <i class="ri-edit-line mr-2"></i>Edit
                  </button>
                  <button class="source-action-btn w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal font-poppins" data-action="delete" data-source-id="${source._id}" data-dropdown-id="${uniqueId}">
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
    </div>
  `;
}

// Add click outside handler to close dropdowns
document.addEventListener(
  "click",
  (event) => {
    const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
    dropdowns.forEach((dropdown) => {
      const button = dropdown.previousElementSibling;
      if (!dropdown.contains(event.target) && !button.contains(event.target)) {
        dropdown.classList.add("hidden");
      }
    });
  },
  true
);

// Handle source settings and actions with event delegation
document.addEventListener(
  "click",
  (event) => {
    // Handle settings button clicks
    const settingsButton = event.target.closest(".source-settings-btn");
    if (settingsButton) {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = settingsButton.getAttribute("data-source-id");
      sourceService.toggleDropdown(sourceId);
      return;
    }

    // Handle dropdown menu item clicks
    const actionButton = event.target.closest(".source-action-btn");
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();

      const action = actionButton.getAttribute("data-action");
      const sourceId = actionButton.getAttribute("data-source-id");
      const dropdownId = actionButton.getAttribute("data-dropdown-id");

      // Close the dropdown
      sourceService.toggleDropdown(dropdownId);

      // Perform the action
      switch (action) {
        case "scrape":
          sourceService.scrapeSource(sourceId);
          break;
        case "edit":
          sourceService.openSourceSettingsModal(sourceId);
          break;
        case "delete":
          sourceService.confirmDeleteSource(sourceId);
          break;
      }
    }
  },
  true
);

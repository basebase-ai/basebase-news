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
                        ? `<img src="${source.imageUrl}" alt="${source.name}" class="w-6 h-6 rounded-sm object-cover">`
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

  grid.innerHTML = filteredSources
    .map((source) => {
      const sourceId = source._id.toString();
      const isChecked = state.currentUser?.sourceIds?.includes(sourceId);

      return `
        <div class="border border-gray-200 dark:border-gray-700 rounded-md p-4" data-source-id="${sourceId}">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                id="source-${source._id}"
                ${isChecked ? "checked" : ""}
                onchange="handleSourceToggle('${source._id}')"
                class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
              />
              <div>
                <div class="flex items-start gap-2">
                  <label for="source-${
                    source._id
                  }" class="font-medium cursor-pointer text-gray-900 dark:text-white">
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
                ${
                  source.tags?.length
                    ? `
                  <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ${source.tags.join(", ")}
                  </div>
                `
                    : ""
                }
              </div>
            </div>
            ${
              state.isAdmin
                ? `
              <div class="relative inline-block">
                <button onclick="sourceService.toggleDropdown('${source._id}')" class="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
                  <i class="ri-settings-4-line text-lg"></i>
                </button>
                <div id="dropdown-${source._id}" class="hidden absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                  <div class="py-1">
                    <button onclick="sourceService.scrapeSource('${source._id}'); sourceService.toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal">
                      <i class="ri-refresh-line mr-2"></i>Refresh
                    </button>
                    <button onclick="sourceService.openSourceSettingsModal('${source._id}'); sourceService.toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal">
                      <i class="ri-edit-line mr-2"></i>Edit
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
    })
    .join("");
}

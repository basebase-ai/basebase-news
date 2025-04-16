document.addEventListener("DOMContentLoaded", async function () {
  const scrollContainer = document.querySelector(".grid");
  const searchInput = document.getElementById("searchInput");

  await fetchCurrentUser();

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        const target = e.target;
        const value = target.value.trim();
        filterHeadlines(value);
      }, 300)
    );
  }

  if (!scrollContainer) return;

  try {
    // Get list of source IDs to fetch
    const sourceIds = currentUser?.sourceIds || [];

    // Fetch each source with its headlines
    const sourcesWithHeadlines = await Promise.all(
      sourceIds.map(async (sourceId) => {
        const response = await fetch(`/api/sources/${sourceId}`);
        const data = await response.json();
        if (data.status === "ok") {
          return data.source;
        }
        return null;
      })
    );

    // Filter out any failed requests and sort by bias score
    currentSources = sourcesWithHeadlines
      .filter(Boolean)
      .sort((a, b) => (a.biasScore ?? 0) - (b.biasScore ?? 0));

    scrollContainer.innerHTML =
      currentSources.map((source) => generateSourceHTML(source)).join("") +
      (currentUser
        ? `
      <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="openCustomizeModal()">
        <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
          <i class="ri-add-line"></i>
        </button>
        <p class="text-gray-600 font-poppins">Add News Source</p>
      </div>
      `
        : "");
  } catch (error) {
    console.error("Failed to fetch headlines:", error);
    scrollContainer.innerHTML = `
      <div class="w-full text-center py-8">
        <p class="text-red-600 text-sm">Failed to load headlines. Please try again later.</p>
      </div>
    `;
  }

  // Add smooth scrolling with arrow keys
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      scrollContainer.scrollBy({ left: 100, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      scrollContainer.scrollBy({ left: -100, behavior: "smooth" });
    }
  });

  // Add scroll indicators if needed
  const checkScroll = () => {
    const isScrollable =
      scrollContainer.scrollWidth > scrollContainer.clientWidth;
    if (isScrollable) {
      document.body.classList.add("has-horizontal-scroll");
    } else {
      document.body.classList.remove("has-horizontal-scroll");
    }
  };

  // Check on load and resize
  checkScroll();
  window.addEventListener("resize", checkScroll);
});

let allSources = [];

function openCustomizeModal() {
  document.getElementById("customizeModal").classList.remove("hidden");
  loadAllSources();
}

function closeCustomizeModal() {
  document.getElementById("customizeModal").classList.add("hidden");
}

async function loadAllSources() {
  try {
    const response = await fetch("/api/sources");
    if (!response.ok) throw new Error("Failed to fetch sources");
    allSources = await response.json();
    renderSourcesGrid();
  } catch (error) {
    console.error("Error loading sources:", error);
    alert("Failed to load sources");
  }
}

function renderSourcesGrid(searchTerm = "") {
  const grid = document.getElementById("sourcesGrid");
  const filteredSources = searchTerm
    ? allSources.filter(
        (source) =>
          source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (source.tags &&
            source.tags.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      )
    : allSources;

  grid.innerHTML = filteredSources
    .map((source) => {
      const sourceId = source._id.toString();
      const isChecked = currentUser?.sourceIds?.includes(sourceId);

      return `
        <div class="border border-gray-200 rounded-lg p-4">
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
                <label for="source-${
                  source._id
                }" class="font-medium cursor-pointer">
                  <a href="${
                    source.homepageUrl
                  }" target="_blank" rel="noopener" class="hover:text-blue-600 transition-colors">${
        source.name
      }</a>
                </label>
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
              isAdmin
                ? `
              <div class="relative inline-block">
                <button onclick="toggleDropdown('${source._id}')" class="text-gray-500 hover:text-blue-600 transition-colors">
                  <i class="ri-settings-4-line text-lg"></i>
                </button>
                <div id="dropdown-${source._id}" class="hidden absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <div class="py-1">
                    <button onclick="scrapeSource('${source._id}'); toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ui-font font-normal">
                      <i class="ri-refresh-line mr-2"></i>Refresh
                    </button>
                    <button onclick="openSourceSettingsModal('${source._id}'); toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ui-font font-normal">
                      <i class="ri-edit-line mr-2"></i>Edit
                    </button>
                    <button onclick="deleteSource('${source._id}'); toggleDropdown('${source._id}')" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 ui-font font-normal">
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
    })
    .join("");
}

async function handleSourceToggle(sourceId) {
  if (!currentUser) return;

  const checkbox = document.getElementById(`source-${sourceId}`);
  const isChecked = checkbox.checked;

  try {
    const response = await fetch("/api/users/me/sources", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceIds: isChecked
          ? [...(currentUser.sourceIds || []), sourceId.toString()]
          : (currentUser.sourceIds || []).filter(
              (id) => id !== sourceId.toString()
            ),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update sources");
    }

    const updatedUser = await response.json();
    currentUser = updatedUser.user;

    // Update the main content area without closing the modal
    const scrollContainer = document.querySelector(".grid");
    if (scrollContainer) {
      const sourceIds = currentUser?.sourceIds || [];
      const sourcesWithHeadlines = await Promise.all(
        sourceIds.map(async (sourceId) => {
          const response = await fetch(`/api/sources/${sourceId}`);
          const data = await response.json();
          if (data.status === "ok") {
            return data.source;
          }
          return null;
        })
      );

      currentSources = sourcesWithHeadlines
        .filter(Boolean)
        .sort((a, b) => (a.biasScore ?? 0) - (b.biasScore ?? 0));

      scrollContainer.innerHTML =
        currentSources.map((source) => generateSourceHTML(source)).join("") +
        (currentUser
          ? `
        <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" onclick="openCustomizeModal()">
          <button class="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors mb-4">
            <i class="ri-add-line"></i>
          </button>
          <p class="text-gray-600 font-poppins">Add News Source</p>
        </div>
        `
          : "");
    }
  } catch (error) {
    console.error("Error updating sources:", error);
    alert(error.message || "Failed to update sources");
    checkbox.checked = !isChecked; // Revert the checkbox
  }
}

// Add event listener for search
document.getElementById("sourceSearchInput").addEventListener("input", (e) => {
  renderSourcesGrid(e.target.value);
});

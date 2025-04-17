import { authService } from "./auth.js";
import { headlineService } from "./headlines.js";
import { state } from "./state.js";

document.addEventListener("DOMContentLoaded", async function () {
  const scrollContainer = document.querySelector(".grid");
  const searchInput = document.getElementById("searchInput");

  await initialize();

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      headlineService.debounce((e) => {
        const target = e.target;
        const value = target.value.trim();
        headlineService.filterHeadlines(value);
      }, 300)
    );
  }

  if (!scrollContainer) return;

  try {
    const sourceIds = state.currentUser?.sourceIds || [];
    await headlineService.loadHeadlines(sourceIds);
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
    const sources = await response.json();
    renderSourcesGrid(sources);
  } catch (error) {
    console.error("Error loading sources:", error);
    alert("Failed to load sources");
  }
}

function renderSourcesGrid(sources, searchTerm = "") {
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
              state.isAdmin
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
  if (!state.currentUser) return;

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
          ? [...(state.currentUser.sourceIds || []), sourceId]
          : (state.currentUser.sourceIds || []).filter((id) => id !== sourceId),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update sources");
    }

    const updatedUser = await response.json();
    state.currentUser = updatedUser.user;

    // Update the main content area without closing the modal
    await headlineService.loadHeadlines(state.currentUser?.sourceIds || []);
  } catch (error) {
    console.error("Failed to update sources:", error);
    alert("Failed to update sources. Please try again.");
  }
}

// Add event listener for search
document.getElementById("sourceSearchInput").addEventListener("input", (e) => {
  loadAllSources().then((sources) =>
    renderSourcesGrid(sources, e.target.value)
  );
});

async function initialize() {
  console.log("Initializing...");
  try {
    const user = await authService.getCurrentUser();
    console.log("Current user:", user);
    if (user) {
      state.currentUser = user;
      state.isAdmin = user.isAdmin;
      document.getElementById("userSection")?.classList.remove("hidden");
      document.getElementById("signInButton")?.classList.add("hidden");
      document.getElementById("userAvatar").textContent = user.first[0];
      if (user.isAdmin) {
        document
          .getElementById("adminControlsModal")
          ?.classList.remove("hidden");
      }
      console.log("Loading headlines for user's sources:", user.sourceIds);
      await headlineService.loadHeadlines(user.sourceIds);
    } else {
      console.log("No user found, fetching top_news_us sources");
      // Fetch top_news_us sources for non-signed in users
      const response = await fetch("/api/sources/tag/top_news_us");
      const data = await response.json();
      console.log("Top news sources response:", data);
      if (data.status === "ok" && data.sourceIds.length > 0) {
        console.log("Loading headlines for top news sources:", data.sourceIds);
        await headlineService.loadHeadlines(data.sourceIds);
      } else {
        console.error("No top news sources found");
      }
    }
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

// Expose functions to window object for HTML onclick handlers
window.openCustomizeModal = openCustomizeModal;
window.closeCustomizeModal = closeCustomizeModal;
window.handleSourceToggle = handleSourceToggle;

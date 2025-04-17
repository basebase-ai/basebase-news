import { authService } from "./auth.js";
import { headlineService } from "./headlines.js";
import { state } from "./state.js";
import { sourceService } from "./sources.js";
import { getInitials } from "./auth.js";
import { renderCustomizeModalGrid } from "./source-ui.js";

document.addEventListener("DOMContentLoaded", async function () {
  const scrollContainer = document.querySelector(".grid");
  const searchInput = document.getElementById("searchInput");
  const sourceSearchInput = document.getElementById("sourceSearchInput");

  // Initialize dark mode
  if (state.darkMode) {
    document.documentElement.classList.add("dark");
  }

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

  if (sourceSearchInput) {
    sourceSearchInput.addEventListener(
      "input",
      headlineService.debounce(async (e) => {
        const value = e.target.value.trim();
        const sources = await loadAllSources();
        renderSourcesGrid(sources, value);
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

export async function loadAllSources() {
  try {
    const response = await fetch("/api/sources");
    if (!response.ok) throw new Error("Failed to fetch sources");
    const sources = await response.json();
    sourceService.setCurrentSources(sources);
    if (state.currentUser?.isAdmin) {
      document.getElementById("adminControlsModal")?.classList.remove("hidden");
    }
    renderSourcesGrid(sources);
    return sources;
  } catch (error) {
    console.error("Error loading sources:", error);
    alert("Failed to load sources");
    return [];
  }
}

export function renderSourcesGrid(sources, searchTerm = "") {
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

  // Get the most recently added source ID from the URL if it exists
  const urlParams = new URLSearchParams(window.location.search);
  const newSourceId = urlParams.get("newSource");

  // Check if we're in the customize modal
  const isCustomizeModal =
    document.getElementById("customizeModal")?.classList.contains("hidden") ===
    false;

  if (isCustomizeModal) {
    renderCustomizeModalGrid(sources, searchTerm, state);
  } else {
    grid.innerHTML = filteredSources
      .map((source) => {
        const sourceId = source._id.toString();
        const isChecked =
          state.currentUser?.sourceIds?.includes(sourceId) ||
          sourceId === newSourceId;
        return sourceService.generateSourceHTML(source);
      })
      .join("");

    // Initialize Sortable
    if (state.currentUser) {
      new Sortable(grid, {
        animation: 150,
        handle: ".cursor-move",
        onEnd: async function (evt) {
          const newOrder = Array.from(grid.children).map(
            (el) => el.dataset.sourceId
          );
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
  }
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
      document.getElementById("userAvatar").textContent = getInitials(
        user.first,
        user.last
      );
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

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

    // If no user sources, get default sources
    if (sourceIds.length === 0) {
      const sourcesResponse = await fetch("/api/sources");
      const sources = await sourcesResponse.json();
      sourceIds.push(...sources.slice(0, 5).map((s) => s._id));
    }

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
      <div class="border border-gray-200 rounded-lg h-[300px] flex flex-col items-center justify-center">
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

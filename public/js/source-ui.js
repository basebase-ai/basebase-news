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
        <div class="border border-gray-200 rounded-lg h-[230px] flex flex-col" data-source-id="${sourceId}">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <div class="cursor-move text-gray-400 hover:text-gray-600">
                <i class="ri-drag-move-line"></i>
              </div>
              <input
                type="checkbox"
                id="source-${source._id}"
                ${isChecked ? "checked" : ""}
                onchange="handleSourceToggle('${source._id}')"
                class="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      `;
    })
    .join("");

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

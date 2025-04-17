import { state } from "./state.js";

function getInitials(first, last) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getRandomColor() {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function updateUserAvatar(user) {
  const avatar = document.getElementById("userAvatar");
  if (!avatar) {
    console.log("Avatar element not found");
    return;
  }

  if (user) {
    const initials = getInitials(user.first, user.last);
    avatar.className = `bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm font-poppins cursor-pointer relative`;

    // Set avatar content
    avatar.innerHTML = initials;

    // Create dropdown element
    let dropdown = document.getElementById("userDropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "userDropdown";
      document.body.appendChild(dropdown);
    }

    dropdown.className =
      "hidden fixed w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-[100] border border-gray-200 dark:border-gray-700";
    dropdown.innerHTML = `
      <div class="py-1">
        <div class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 ui-font font-normal">
          Signed in as<br>${user.first} ${user.last}
        </div>
        <div class="px-4 py-2 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          <span class="ui-font font-normal">Dense Mode</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="denseModeToggle" class="sr-only peer" ${
              state.denseMode ? "checked" : ""
            }>
            <div class="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div class="px-4 py-2 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          <span class="ui-font font-normal">Dark Mode</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="darkModeToggle" class="sr-only peer" ${
              state.darkMode ? "checked" : ""
            }>
            <div class="w-9 h-5 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <button class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ui-font font-normal">
          <i class="ri-logout-box-line mr-2"></i>Sign out
        </button>
      </div>
    `;

    // Add click handlers
    avatar.addEventListener("click", (event) => {
      console.log("Avatar clicked");
      event.stopPropagation();
      const isHidden = dropdown.classList.contains("hidden");
      console.log("Dropdown hidden:", isHidden);

      if (isHidden) {
        const avatarRect = avatar.getBoundingClientRect();
        dropdown.style.top = `${avatarRect.bottom + 8}px`;
        dropdown.style.right = `${window.innerWidth - avatarRect.right}px`;
      }

      dropdown.classList.toggle("hidden");
      console.log(
        "Dropdown hidden after toggle:",
        dropdown.classList.contains("hidden")
      );
      console.log("Dropdown position:", dropdown.getBoundingClientRect());
    });

    const signOutButton = dropdown.querySelector("button");
    if (signOutButton) {
      signOutButton.addEventListener("click", (event) => {
        console.log("Sign out button clicked");
        event.stopPropagation();
        signOut();
      });
    }

    const denseModeToggle = dropdown.querySelector("#denseModeToggle");
    if (denseModeToggle) {
      denseModeToggle.addEventListener("change", (event) => {
        state.denseMode = event.target.checked;
        localStorage.setItem("denseMode", state.denseMode);
        headlineService.loadHeadlines(state.currentUser?.sourceIds || []);
      });
    }

    const darkModeToggle = dropdown.querySelector("#darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", (event) => {
        state.darkMode = event.target.checked;
        localStorage.setItem("darkMode", state.darkMode);
        document.documentElement.classList.toggle("dark", state.darkMode);
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
      if (!avatar.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.classList.add("hidden");
      }
    });
  } else {
    avatar.className = "hidden";
    avatar.innerHTML = "";
  }
}

async function signOut() {
  console.log("Signing out...");
  try {
    const response = await fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      window.location.reload();
    } else {
      console.error("Failed to sign out");
    }
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", (event) => {
  const dropdown = document.getElementById("userDropdown");
  if (dropdown && !dropdown.classList.contains("hidden")) {
    dropdown.classList.add("hidden");
  }
});

function openSignInModal() {
  document.getElementById("signInModal")?.classList.remove("hidden");
  document.getElementById("signInFormContainer")?.classList.remove("hidden");
  document.getElementById("signInConfirmation")?.classList.add("hidden");
}

function closeSignInModal() {
  document.getElementById("signInModal")?.classList.add("hidden");
}

async function handleSignInSubmit(event) {
  event.preventDefault();

  const formData = {
    email: document.getElementById("email").value,
    first: document.getElementById("firstName").value,
    last: document.getElementById("lastName").value,
  };

  try {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) throw new Error("Failed to sign in");

    document.getElementById("signInFormContainer")?.classList.add("hidden");
    document.getElementById("signInConfirmation")?.classList.remove("hidden");
  } catch (error) {
    console.error("Error:", error);
    alert(error.message);
  }
}

async function getCurrentUser() {
  try {
    const response = await fetch("/api/auth/me");
    const data = await response.json();

    if (data.status === "ok" && data.user) {
      state.currentUser = {
        ...data.user,
        sourceIds: data.user.sourceIds || [],
      };
      state.isAdmin = data.user.isAdmin;
      updateUserAvatar(state.currentUser);
      document
        .getElementById("adminControls")
        ?.classList.toggle("hidden", !state.isAdmin);
      document
        .getElementById("adminControlsModal")
        ?.classList.toggle("hidden", !state.isAdmin);
      return state.currentUser;
    } else {
      state.currentUser = null;
      state.isAdmin = false;
      updateUserAvatar(null);
      document.getElementById("adminControls")?.classList.add("hidden");
      document.getElementById("adminControlsModal")?.classList.add("hidden");
      return null;
    }
  } catch (error) {
    console.error("Error fetching current user:", error);
    state.currentUser = null;
    state.isAdmin = false;
    updateUserAvatar(null);
    document.getElementById("adminControls")?.classList.add("hidden");
    document.getElementById("adminControlsModal")?.classList.add("hidden");
    return null;
  }
}

export const authService = {
  getCurrentUser,
  openSignInModal,
  closeSignInModal,
  handleSignInSubmit,
  updateUserAvatar,
  signOut,
};

export { getInitials };

// Expose auth functions to window object for HTML onclick handlers
window.openSignInModal = openSignInModal;
window.closeSignInModal = closeSignInModal;
window.handleSignInSubmit = handleSignInSubmit;
window.signOut = signOut;

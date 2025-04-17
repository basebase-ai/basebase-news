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
  console.log("updateUserAvatar called with user:", user);
  const userSection = document.getElementById("userSection");
  const userAvatar = document.getElementById("userAvatar");
  const signInButton = document.getElementById("signInButton");
  console.log("signInButton element:", signInButton);

  if (user) {
    userSection?.classList.remove("hidden");
    if (signInButton) {
      signInButton.style.display = "none";
    }

    if (user.imageUrl) {
      userAvatar.innerHTML = `<img src="${user.imageUrl}" alt="${user.first} ${user.last}" class="w-full h-full object-cover rounded-full">`;
    } else {
      const color = getRandomColor();
      userAvatar.className = `w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${color} text-white font-medium text-sm font-poppins`;
      userAvatar.textContent = getInitials(user.first, user.last);
    }
  } else {
    userSection?.classList.add("hidden");
    if (signInButton) {
      signInButton.style.display = "block";
      console.log("Showing sign in button");
    }
  }
}

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
};

// Expose auth functions to window object for HTML onclick handlers
window.openSignInModal = openSignInModal;
window.closeSignInModal = closeSignInModal;
window.handleSignInSubmit = handleSignInSubmit;

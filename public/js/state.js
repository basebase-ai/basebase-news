export const state = {
  currentUser: null,
  currentSources: [],
  isAdmin: false,
  denseMode: localStorage.getItem("denseMode") === "true",
};

(function () {
  "use strict";

  const tokenKey = "fitpulse-session-token";
  const userKey = "fitpulse-session-user";
  const adminOnlyPage = document.body.hasAttribute("data-admin-only-page");
  const adminLinks = document.querySelectorAll("[data-admin-only]");

  async function getCurrentUser() {
    const token = sessionStorage.getItem(tokenKey);
    if (!token) {
      return null;
    }

    const response = await window.FitPulseApi.getCurrentUser(token);
    sessionStorage.setItem(userKey, JSON.stringify(response.user));
    return response.user;
  }

  async function initializeAccess() {
    if (!adminOnlyPage && adminLinks.length === 0) {
      return;
    }

    try {
      const user = await getCurrentUser();
      const isAdmin = Boolean(user && user.role === "admin");

      if (adminOnlyPage && !isAdmin) {
        window.FitPulseNavigation.go(
          user ? "../MyAccount-User/indexUser.html" : "../Log-In/indexLog.html",
          true
        );
        return;
      }

      if (isAdmin) {
        adminLinks.forEach((link) => {
          link.hidden = false;
        });
        const accountName = document.getElementById("account-user-name");
        if (accountName) {
          accountName.textContent = user.name;
        }
        document.body.hidden = false;
      }
    } catch (error) {
      console.error("No se pudo verificar el acceso de administrador:", error);
      if (adminOnlyPage) {
        window.FitPulseNavigation.go("../Log-In/indexLog.html", true);
      }
    }
  }

  document.querySelectorAll("[data-sign-out]").forEach((link) => {
    link.addEventListener("click", () => {
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(userKey);
      sessionStorage.removeItem("fitpulse-pending-enrollment");
    });
  });

  initializeAccess();
})();

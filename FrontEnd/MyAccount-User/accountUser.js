(function () {
  "use strict";

  const api = window.FitPulseApi;
  const token = sessionStorage.getItem("fitpulse-session-token");
  const selectedUserId = new URLSearchParams(window.location.search).get("userId");
  const userName = document.getElementById("account-user-name");
  const userEmail = document.getElementById("account-user-email");
  const heading = document.getElementById("titulo-inscripciones");
  const adminReturn = document.getElementById("admin-return");
  let currentUser = null;

  try {
    currentUser = JSON.parse(sessionStorage.getItem("fitpulse-session-user"));
  } catch (error) {
    currentUser = null;
  }

  function showUser(user) {
    userName.textContent = user.name;
    userEmail.textContent = user.email;
    userEmail.title = user.email;
  }

  async function loadAccount() {
    if (
      !token
      || !currentUser
      || typeof currentUser.name !== "string"
      || typeof currentUser.email !== "string"
    ) {
      sessionStorage.removeItem("fitpulse-session-token");
      sessionStorage.removeItem("fitpulse-session-user");
      window.location.replace("../Log-In/indexLog.html");
      return null;
    }

    if (selectedUserId !== null) {
      if (currentUser.role !== "admin") {
        window.location.replace("../MyAccount-User/indexUser.html");
        return null;
      }
      if (!/^[1-9]\d*$/.test(selectedUserId)) {
        return { error: "El usuario solicitado no es válido.", enrollments: [] };
      }

      try {
        const account = await api.getAdminUser(selectedUserId, token);
        showUser(account.user);
        adminReturn.hidden = false;
        heading.textContent = "CLASES INSCRITAS DEL USUARIO";
        return { ...account, isSupervising: true };
      } catch (error) {
        userName.textContent = "No se pudo cargar el usuario";
        return { error: error.message, enrollments: [] };
      }
    }

    if (currentUser.role === "admin") {
      window.location.replace("../MyAccount-Admin/indexAdmin.html");
      return null;
    }

    showUser(currentUser);
    try {
      const { enrollments } = await api.getMyEnrollments(token);
      return { user: currentUser, enrollments, isSupervising: false };
    } catch (error) {
      return { user: currentUser, error: error.message, enrollments: [], isSupervising: false };
    }
  }

  window.FitPulseAccountData = loadAccount();
})();

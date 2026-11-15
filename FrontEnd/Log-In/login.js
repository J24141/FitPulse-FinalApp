(function () {
  "use strict";

  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");
  const submitButton = form.querySelector(".login__button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Iniciando sesión...";
    submitButton.disabled = true;

    try {
      const session = await window.FitPulseApi.createSession({
        email: form.elements.namedItem("email").value.trim(),
        password: form.elements.namedItem("password").value
      });
      sessionStorage.setItem("fitpulse-session-token", session.token);
      sessionStorage.setItem("fitpulse-session-user", JSON.stringify(session.user));
      form.reset();
      const pendingEnrollment = sessionStorage.getItem("fitpulse-pending-enrollment");
      if (session.user.role === "user" && /^[1-9]\d*$/.test(pendingEnrollment || "")) {
        sessionStorage.removeItem("fitpulse-pending-enrollment");
        window.location.assign(
          `../ShopPurshare/indexCarrito.html?classId=${encodeURIComponent(pendingEnrollment)}&enroll=1`
        );
        return;
      }
      sessionStorage.removeItem("fitpulse-pending-enrollment");
      const accountPage = session.user.role === "admin"
        ? "../MyAccount-Admin/indexAdmin.html"
        : "../MyAccount-User/indexUser.html";
      window.location.assign(accountPage);
    } catch (error) {
      status.textContent = error.message;
      console.error("No se pudo iniciar sesión:", error);
    } finally {
      submitButton.disabled = false;
    }
  });
})();

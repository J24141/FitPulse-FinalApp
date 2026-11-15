(function () {
  "use strict";

  const form = document.getElementById("register-form");
  const status = document.getElementById("register-status");
  const submitButton = form.querySelector(".register-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Creando cuenta...";
    submitButton.disabled = true;

    try {
      const user = await window.FitPulseApi.registerUser({
        name: form.elements.namedItem("name").value.trim(),
        email: form.elements.namedItem("email").value.trim(),
        password: form.elements.namedItem("password").value
      });
      form.reset();
      status.textContent = `Cuenta creada para ${user.user.name}. Ya puedes iniciar sesión.`;
    } catch (error) {
      status.textContent = error.message;
      console.error("No se pudo crear la cuenta:", error);
    } finally {
      submitButton.disabled = false;
    }
  });
})();

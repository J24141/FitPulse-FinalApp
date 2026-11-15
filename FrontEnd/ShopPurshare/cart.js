(function () {
  "use strict";

  const api = window.FitPulseApi;
  const status = document.getElementById("cart-status");
  const checkout = document.getElementById("checkout-button");
  const form = document.getElementById("cart-form");
  const params = new URLSearchParams(window.location.search);
  const classId = params.get("classId");
  const enrollAfterLogin = params.get("enroll") === "1";
  let selectedClass = null;

  function showEmptyCart(message) {
    document.getElementById("clase").textContent = "No hay una clase seleccionada";
    document.getElementById("horario").textContent = "Horario no disponible";
    document.getElementById("instructor").textContent = "Instructor(a) no disponible";
    document.getElementById("precio").textContent = "Precio no disponible";
    status.textContent = message;
    checkout.disabled = true;
  }

  async function enrollSelectedClass() {
    if (!selectedClass) {
      return;
    }

    const token = sessionStorage.getItem("fitpulse-session-token");
    if (!token) {
      sessionStorage.setItem("fitpulse-pending-enrollment", String(selectedClass.id));
      window.location.assign("../Log-In/indexLog.html");
      return;
    }

    checkout.disabled = true;
    status.textContent = "Registrando tu inscripción gratuita...";
    try {
      await api.enrollInClass(selectedClass.id, token);
      status.textContent = "Tu inscripción quedó añadida a Mis clases. No se realizó ningún pago.";
      checkout.textContent = "INSCRIPCIÓN REGISTRADA";
    } catch (error) {
      status.textContent = error.message;
      checkout.disabled = false;
      console.error("No se pudo registrar la inscripción:", error);
    }
  }

  async function loadSelectedClass() {
    if (!classId || !/^[1-9]\d*$/.test(classId)) {
      showEmptyCart("Vuelve a clases y selecciona una clase para inscribirte.");
      return;
    }

    status.textContent = "Consultando los datos de la clase...";
    checkout.disabled = true;
    try {
      selectedClass = await api.getClass(classId);
      document.getElementById("clase").textContent = selectedClass.name || "Clase";
      document.getElementById("horario").textContent = api.formatSchedule(selectedClass.schedule);
      document.getElementById("instructor").textContent = selectedClass.instructorName
        ? `INSTRUCTOR(A): ${selectedClass.instructorName}`
        : "INSTRUCTOR(A): No disponible";
      document.getElementById("precio").textContent =
        `Valor de referencia: ${api.formatPrice(selectedClass.price)}`;
      status.textContent =
        "Inscripción gratuita. El valor mostrado solo se usa para la métrica simulada del administrador.";
      checkout.disabled = false;
      if (enrollAfterLogin) {
        await enrollSelectedClass();
      }
    } catch (error) {
      showEmptyCart(error.message);
      console.error("No se pudo cargar la clase seleccionada:", error);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    enrollSelectedClass();
  });

  loadSelectedClass();
})();

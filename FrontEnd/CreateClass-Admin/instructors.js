(function () {
  "use strict";

  const api = window.FitPulseApi;
  const form = document.getElementById("create-class-form");
  const select = document.getElementById("instructor-list");
  const status = document.getElementById("instructors-status");
  const createButton = form.querySelector(".admin-create-button");

  function updateCreateButton() {
    createButton.disabled = select.disabled || !form.checkValidity();
  }

  async function loadInstructors() {
    status.textContent = "Consultando instructores...";
    try {
      const instructors = await api.getInstructors();
      select.replaceChildren();

      if (!instructors.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay instructores registrados";
        select.append(option);
        status.textContent = "No hay instructores registrados para asignar a la clase.";
        return;
      }

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecciona un instructor";
      placeholder.selected = true;
      select.append(placeholder);

      instructors.forEach((instructor) => {
        const option = document.createElement("option");
        option.value = instructor.id;
        option.textContent = instructor.name;
        select.append(option);
      });
      select.disabled = false;
      status.textContent = "Completa el nombre, instructor y horario. El cupo predeterminado es 20.";
      updateCreateButton();
    } catch (error) {
      select.replaceChildren();
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No se pudieron cargar los instructores";
      select.append(option);
      status.textContent = error.message;
      console.error("No se pudieron cargar los instructores:", error);
    }
  }

  form.addEventListener("input", updateCreateButton);
  form.addEventListener("change", updateCreateButton);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("fitpulse-session-token");
    if (!token) {
      status.textContent = "Inicia sesión como administrador para crear clases.";
      return;
    }

    createButton.disabled = true;
    status.textContent = "Creando clase...";
    try {
      const result = await api.createClass({
        name: form.elements.namedItem("name").value.trim(),
        instructorId: form.elements.namedItem("instructorId").value,
        schedule: form.elements.namedItem("schedule").value
      }, token);
      form.reset();
      status.textContent = `Clase "${result.class.name}" creada correctamente.`;
    } catch (error) {
      status.textContent = error.message;
      console.error("No se pudo crear la clase:", error);
    } finally {
      updateCreateButton();
    }
  });

  loadInstructors();
})();

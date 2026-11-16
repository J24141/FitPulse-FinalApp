(function () {
  "use strict";

  const api = window.FitPulseApi;
  const section = document.getElementById("personal-records-section");
  const status = document.getElementById("personal-records-status");
  const list = document.getElementById("personal-records-list");
  const form = document.getElementById("personal-record-form");
  const formStatus = document.getElementById("personal-record-form-status");
  const dateInput = form.elements.namedItem("achievedOn");

  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderRecord(record) {
    const card = document.createElement("article");
    card.className = "personal-record";

    const name = document.createElement("h3");
    name.className = "personal-record__name";
    name.textContent = record.name;
    card.append(name);

    const result = document.createElement("p");
    result.className = "personal-record__result";
    const value = Number(record.value);
    result.textContent = Number.isFinite(value)
      ? `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value)} ${record.unit}`
      : "Resultado no disponible";
    card.append(result);

    const date = document.createElement("p");
    date.className = "personal-record__date";
    const parsedDate = new Date(`${record.achievedOn}T12:00:00`);
    date.textContent = Number.isNaN(parsedDate.getTime())
      ? "Fecha no disponible"
      : parsedDate.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    card.append(date);
    return card;
  }

  function renderRecords(records) {
    list.replaceChildren(...records.map(renderRecord));
  }

  async function initialize() {
    const account = await window.FitPulseAccountData;
    if (!account) {
      return;
    }

    section.hidden = false;
    if (account.error) {
      status.textContent = account.error;
      return;
    }

    const records = account.personalRecords || [];
    renderRecords(records);
    status.textContent = account.personalRecordsError
      ? account.personalRecordsError
      : records.length
        ? `${records.length} marca${records.length === 1 ? "" : "s"} personal${records.length === 1 ? "" : "es"}.`
        : "Todavía no hay marcas personales registradas.";

    if (!account.isSupervising) {
      return;
    }

    form.hidden = false;
    dateInput.max = getToday();
    dateInput.value = getToday();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const token = sessionStorage.getItem("fitpulse-session-token");
      const submitButton = form.querySelector('button[type="submit"]');
      if (!token || !account.user) {
        formStatus.textContent = "No se pudo verificar la sesión administrativa.";
        return;
      }

      submitButton.disabled = true;
      formStatus.textContent = "Guardando marca personal...";
      try {
        const result = await api.createAdminPersonalRecord(account.user.id, {
          name: form.elements.namedItem("name").value.trim(),
          value: Number(form.elements.namedItem("value").value),
          unit: "kg",
          achievedOn: dateInput.value
        }, token);
        records.push(result.record);
        records.sort((first, second) => second.achievedOn.localeCompare(first.achievedOn));
        renderRecords(records);
        status.textContent = `${records.length} marca${records.length === 1 ? "" : "s"} personal${records.length === 1 ? "" : "es"}.`;
        form.reset();
        dateInput.value = getToday();
        formStatus.textContent = "La marca personal quedó registrada.";
      } catch (error) {
        formStatus.textContent = error.message;
        console.error("No se pudo guardar la marca personal:", error);
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  initialize();
})();

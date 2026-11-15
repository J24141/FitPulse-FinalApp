(function () {
  "use strict";

  const api = window.FitPulseApi;
  const status = document.getElementById("enrollments-status");
  const list = document.getElementById("user-enrollments");

  function renderEnrollment(enrollment) {
    const card = document.createElement("article");
    card.className = "clase";

    const top = document.createElement("header");
    top.className = "clase__top";
    const name = document.createElement("h3");
    name.className = "clase__nombre";
    name.textContent = enrollment.name;
    top.append(name);

    const enrolled = document.createElement("p");
    enrolled.className = "clase__cupos";
    enrolled.textContent = "INSCRITO/A";
    top.append(enrolled);
    card.append(top);

    const instructor = document.createElement("p");
    instructor.className = "clase__instructor";
    instructor.textContent = enrollment.instructorName
      ? `Instructor(a): ${enrollment.instructorName}`
      : "Instructor(a) no disponible";
    card.append(instructor);

    const schedule = document.createElement("p");
    schedule.className = "clase__horario";
    schedule.textContent = api.formatSchedule(enrollment.schedule);
    card.append(schedule);
    return card;
  }

  async function loadEnrollments() {
    const account = await window.FitPulseAccountData;
    if (!account) {
      return;
    }

    if (account.error) {
      list.replaceChildren();
      status.textContent = account.error;
      return;
    }

    list.replaceChildren(...account.enrollments.map(renderEnrollment));
    if (!account.enrollments.length) {
      status.textContent = account.isSupervising
        ? "Este usuario todavía no tiene clases inscritas."
        : "Todavía no tienes clases inscritas.";
      return;
    }

    status.textContent = account.isSupervising
      ? `${account.enrollments.length} clase${account.enrollments.length === 1 ? "" : "s"} inscrita${account.enrollments.length === 1 ? "" : "s"}.`
      : `${account.enrollments.length} clase${account.enrollments.length === 1 ? "" : "s"} inscrita${account.enrollments.length === 1 ? "" : "s"} sin pago.`;
  }

  loadEnrollments();
})();

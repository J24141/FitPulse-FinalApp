(function () {
  "use strict";

  const api = window.FitPulseApi;
  const list = document.getElementById("classes-list");
  const status = document.getElementById("classes-status");
  const destinations = [
    { match: "yoga", path: "../Yoga/indexYoga.html" },
    { match: "spinning", path: "../Spinning/indexSpinning.html" },
    { match: "crossfit", path: "../CrossFit/indexCross.html" }
  ];

  function detailPath(classItem) {
    const value = api.normalize(`${classItem.category || ""} ${classItem.name || ""}`);
    const destination = destinations.find((item) => value.includes(item.match));
    const path = destination ? destination.path : "../Class/detailClass.html";
    return `${path}?id=${encodeURIComponent(classItem.id)}`;
  }

  function renderClass(classItem) {
    const href = detailPath(classItem);
    const card = document.createElement(href ? "a" : "article");
    card.className = "clase";
    if (href) {
      card.href = href;
      card.setAttribute("aria-label", `Ver detalle de ${classItem.name || "clase"}`);
    }

    const top = document.createElement("span");
    top.className = "clase__top";
    const name = document.createElement("span");
    name.className = "clase__nombre";
    name.textContent = classItem.name || "Clase";
    top.append(name);

    const capacity = document.createElement("span");
    capacity.className = "clase__cupos";
    capacity.textContent = Number(classItem.maximumLimit) > 0
      ? `Máx. ${classItem.maximumLimit}`
      : "Cupo sin definir";
    top.append(capacity);
    card.append(top);

    const instructor = document.createElement("span");
    instructor.className = "clase__instructor";
    instructor.textContent = classItem.instructorName
      ? `Instructor(a): ${classItem.instructorName}`
      : "Instructor(a) no disponible";
    card.append(instructor);

    const schedule = document.createElement("span");
    schedule.className = "clase__horario";
    schedule.textContent = api.formatSchedule(classItem.schedule);
    card.append(schedule);
    return card;
  }

  async function loadClasses() {
    status.textContent = "Consultando clases...";
    list.replaceChildren();
    try {
      const classes = await api.getClasses();
      if (!classes.length) {
        status.textContent = "No hay clases registradas en la base de datos.";
        return;
      }

      list.replaceChildren(...classes.map(renderClass));
      status.textContent = `${classes.length} clase${classes.length === 1 ? "" : "s"} disponible${classes.length === 1 ? "" : "s"}.`;
    } catch (error) {
      status.textContent = error.message;
      console.error("No se pudieron cargar las clases:", error);
    }
  }

  loadClasses();
})();

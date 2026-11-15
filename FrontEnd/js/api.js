(function (global) {
  "use strict";

  const configuredBase = global.FITPULSE_API_BASE
    || document.querySelector('meta[name="fitpulse-api-base"]')?.content
    || "http://localhost:5000/api/v1";
  const baseUrl = configuredBase.replace(/\/+$/, "");

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: options.method || "GET",
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch (error) {
      throw new Error("No se pudo conectar con la API. Comprueba que el backend esté iniciado.");
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("La API devolvió una respuesta que no es JSON válido.");
    }

    if (!response.ok) {
      throw new Error(data.error || `La API respondió con el estado ${response.status}.`);
    }

    return data;
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
      return "Precio no disponible";
    }
    const price = Number(value);
    if (!Number.isFinite(price)) {
      return "Precio no disponible";
    }

    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(price);
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function formatSchedule(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "Horario no disponible";
    }

    const dateTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/i);
    if (dateTime) {
      const [, year, month, day, hour, minute] = dateTime;
      const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
      const time = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      const dateLabel = new Intl.DateTimeFormat("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(date);
      const timeLabel = new Intl.DateTimeFormat("es-CO", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(time);
      return `${dateLabel} · ${timeLabel}`;
    }

    const timeOnly = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (timeOnly) {
      const time = new Date(2000, 0, 1, Number(timeOnly[1]), Number(timeOnly[2]));
      return new Intl.DateTimeFormat("es-CO", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }).format(time);
    }

    return text;
  }

  global.FitPulseApi = Object.freeze({
    getClasses: () => request("/classes"),
    getClass: (id) => request(`/classes/${encodeURIComponent(id)}`),
    getReviews: (id) => request(`/classes/${encodeURIComponent(id)}/reviews`),
    getInstructors: () => request("/instructors"),
    registerUser: (user) => request("/Users", { method: "POST", body: user }),
    createSession: (credentials) => request("/Sessions", { method: "POST", body: credentials }),
    createClass: (classData, token) => request("/classes", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: classData
    }),
    enrollInClass: (classId, token) => request(`/classes/${encodeURIComponent(classId)}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    }),
    getMyEnrollments: (token) => request("/Sessions/me/enrollments", {
      headers: { Authorization: `Bearer ${token}` }
    }),
    getCurrentUser: (token) => request("/Sessions/me", {
      headers: { Authorization: `Bearer ${token}` }
    }),
    getAdminDashboard: (token) => request("/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    }),
    getAdminUser: (id, token) => request(`/admin/users/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    formatPrice,
    formatSchedule,
    normalize
  });
})(window);

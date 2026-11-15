(function () {
  "use strict";

  const api = window.FitPulseApi;
  const token = sessionStorage.getItem("fitpulse-session-token");
  const salesStatus = document.getElementById("sales-status");
  const salesTotal = document.getElementById("sales-total");
  const salesList = document.getElementById("sales-list");
  const usersStatus = document.getElementById("users-status");
  const usersList = document.getElementById("users-list");

  function renderUser(user) {
    const item = document.createElement("li");
    const card = document.createElement("a");
    card.className = "usuario";
    card.href = `../MyAccount-User/indexUser.html?userId=${encodeURIComponent(user.id)}`;
    card.setAttribute("aria-label", `Supervisar la cuenta de ${user.name}`);

    const name = document.createElement("span");
    name.className = "usuario__nombre";
    name.textContent = user.name;
    card.append(name);

    const email = document.createElement("span");
    email.className = "usuario__actividad";
    email.textContent = user.email;
    email.title = user.email;
    card.append(email);

    const avatar = document.createElement("img");
    avatar.className = "usuario__avatar";
    avatar.src = "../img/UserImg.png";
    avatar.alt = "";
    avatar.width = 47;
    avatar.height = 47;
    card.append(avatar);

    item.append(card);
    return item;
  }

  function renderSale(sale) {
    const item = document.createElement("li");
    item.className = "venta";

    const description = document.createElement("span");
    description.className = "venta__nombre";
    description.textContent = `${sale.className} · ${sale.userName}`;
    item.append(description);

    const amount = document.createElement("span");
    amount.className = "venta__precio";
    amount.textContent = api.formatPrice(sale.amount);
    item.append(amount);
    return item;
  }

  async function loadDashboard() {
    if (!token) {
      salesStatus.textContent = "Inicia sesión como administrador para consultar el panel.";
      usersStatus.textContent = "";
      return;
    }

    try {
      const dashboard = await api.getAdminDashboard(token);
      usersList.replaceChildren(...dashboard.users.map(renderUser));
      usersStatus.textContent = dashboard.users.length
        ? `${dashboard.users.length} cuenta${dashboard.users.length === 1 ? "" : "s"} con role=user.`
        : "No hay cuentas con role=user.";

      salesList.replaceChildren(...dashboard.sales.records.map(renderSale));
      salesTotal.textContent = `Total simulado del día: ${api.formatPrice(dashboard.sales.total)}`;
      salesStatus.textContent = dashboard.sales.count
        ? `${dashboard.sales.count} inscripción${dashboard.sales.count === 1 ? "" : "es"} gratuita${dashboard.sales.count === 1 ? "" : "s"} hoy; no se procesaron pagos.`
        : "No hay inscripciones hoy; no se registraron pagos.";
    } catch (error) {
      salesStatus.textContent = error.message;
      usersStatus.textContent = error.message;
      console.error("No se pudo cargar el panel administrativo:", error);
    }
  }

  loadDashboard();
})();

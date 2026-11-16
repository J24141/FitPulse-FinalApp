(function (global) {
  "use strict";

  const api = global.FitPulseApi;
  const starImage = "../img/Star.png";
  const emptyStarImage = "../img/StarEmpty.png";

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function addStatus(container, message) {
    container.replaceChildren();
    const status = document.createElement("p");
    status.className = "resena__texto";
    status.setAttribute("role", "status");
    status.textContent = message;
    container.append(status);
  }

  function renderTags(container, rawTags) {
    let tags = [];
    if (Array.isArray(rawTags)) {
      tags = rawTags;
    } else if (typeof rawTags === "string" && rawTags.trim()) {
      try {
        const parsed = JSON.parse(rawTags);
        tags = Array.isArray(parsed) ? parsed : [rawTags];
      } catch (error) {
        tags = rawTags.split(",");
      }
    }

    const list = document.createElement("ul");
    list.className = "tags";
    tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .forEach((tag) => {
        const item = document.createElement("li");
        item.textContent = tag.startsWith("#") ? tag : `#${tag}`;
        list.append(item);
      });

    if (list.childElementCount) {
      container.append(list);
    }
  }

  function renderReview(review) {
    const article = document.createElement("article");
    article.className = "resena";

    const header = document.createElement("header");
    header.className = "resena__top";

    const avatar = document.createElement("img");
    avatar.className = "resena__avatar";
    avatar.src = "../img/UserImg.png";
    avatar.alt = "";
    avatar.width = 57;
    avatar.height = 57;
    header.append(avatar);

    const user = document.createElement("div");
    user.className = "resena__usuario";
    const name = document.createElement("p");
    name.className = "resena__nombre";
    name.textContent = review.userName || "Usuario";
    user.append(name);
    header.append(user);

    const date = document.createElement("p");
    date.className = "resena__fecha";
    const parsedDate = review.createdAt ? new Date(review.createdAt) : null;
    date.textContent = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("es-CO")
      : "";
    header.append(date);
    article.append(header);

    const body = document.createElement("div");
    body.className = "resena__cuerpo";

    const rating = Math.min(5, Math.max(0, Math.round(Number(review.rating) || 0)));
    const stars = document.createElement("div");
    stars.className = "estrellas";
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", `${rating} de 5 estrellas`);
    for (let index = 0; index < 5; index += 1) {
      const star = document.createElement("img");
      star.src = index < rating ? starImage : emptyStarImage;
      star.alt = "";
      star.width = 24;
      star.height = 24;
      stars.append(star);
    }
    body.append(stars);
    renderTags(body, review.tags);

    if (review.comment) {
      const comment = document.createElement("p");
      comment.className = "resena__texto";
      comment.textContent = review.comment;
      body.append(comment);
    }

    article.append(body);
    return article;
  }

  function renderReviewSummary(reviews) {
    const bars = document.querySelector(".barras");
    if (!bars) {
      return;
    }

    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((review) => {
      const rating = Math.round(Number(review.rating));
      if (rating >= 1 && rating <= 5) {
        counts[rating - 1] += 1;
      }
    });

    const total = reviews.length;
    Array.from(bars.querySelectorAll(".barra")).forEach((bar) => {
      const rating = Number(bar.querySelector(".barra__nivel")?.textContent);
      const count = counts[rating - 1] || 0;
      const fill = bar.querySelector(".barra__relleno");
      if (fill) {
        fill.style.width = total ? `${(count / total) * 100}%` : "0%";
      }
      bar.setAttribute("aria-label", `${rating} estrellas: ${count} reseñas`);
    });

    let summary = document.getElementById("reviews-summary");
    if (!summary) {
      summary = document.createElement("p");
      summary.id = "reviews-summary";
      summary.className = "resena__fecha";
      bars.insertAdjacentElement("afterend", summary);
    }
    const average = total
      ? reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / total
      : 0;
    summary.textContent = total
      ? `${average.toFixed(1)} de 5 · ${total} reseña${total === 1 ? "" : "s"}`
      : "Aún no hay reseñas registradas.";
  }

  async function init(category) {
    const reviewList = document.querySelector(".lista-resenas");
    const reviewForm = document.getElementById("review-form");
    const reviewStatus = document.getElementById("review-status");
    const reviewLoginLink = document.getElementById("review-login-link");
    const status = document.getElementById("class-status");
    const cartLink = document.querySelector(".boton-carrito");
    const classId = new URLSearchParams(global.location.search).get("id");
    let loadedClassId = null;

    if (reviewLoginLink) {
      const returnTo = `${global.location.pathname}${global.location.search}${global.location.hash}`;
      const loginUrl = new URL("../Log-In/indexLog.html", global.location.href);
      loginUrl.searchParams.set("returnTo", returnTo);
      reviewLoginLink.href = `${loginUrl.pathname}${loginUrl.search}`;
      reviewLoginLink.hidden = Boolean(global.sessionStorage.getItem("fitpulse-session-token"));
    }

    if (reviewForm) {
      reviewForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const token = global.sessionStorage.getItem("fitpulse-session-token");
        if (!token) {
          if (reviewStatus) {
            reviewStatus.textContent = "Inicia sesión con una cuenta de usuario para publicar una reseña.";
          }
          if (reviewLoginLink) {
            reviewLoginLink.hidden = false;
          }
          return;
        }
        if (!loadedClassId) {
          if (reviewStatus) {
            reviewStatus.textContent = "Espera a que termine de cargar la información de la clase.";
          }
          return;
        }

        const comment = reviewForm.elements.namedItem("comment").value.trim();
        if (!comment) {
          if (reviewStatus) {
            reviewStatus.textContent = "Escribe un comentario antes de publicar la reseña.";
          }
          return;
        }

        const submitButton = reviewForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = true;
        }
        if (reviewStatus) {
          reviewStatus.textContent = "Publicando reseña...";
        }

        try {
          await api.createReview(loadedClassId, {
            rating: Number(reviewForm.elements.namedItem("rating").value),
            comment
          }, token);
          reviewForm.reset();
          if (reviewStatus) {
            reviewStatus.textContent = "Tu reseña se publicó correctamente.";
          }
          try {
            const reviews = await api.getReviews(loadedClassId);
            renderReviewSummary(reviews);
            if (reviewList) {
              reviewList.replaceChildren(...reviews.map(renderReview));
            }
          } catch (error) {
            if (reviewStatus) {
              reviewStatus.textContent = "La reseña se publicó, pero no se pudo actualizar la lista.";
            }
            console.error("No se pudo actualizar la lista de reseñas:", error);
          }
        } catch (error) {
          if (reviewStatus) {
            reviewStatus.textContent = error.message;
          }
          if (error.status === 401 || error.status === 403) {
            if (reviewLoginLink) {
              reviewLoginLink.hidden = false;
            }
          }
          console.error("No se pudo publicar la reseña:", error);
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      });
    }

    setText(".detalle__titulo", category.toUpperCase());
    setText(".detalle__precio", "Cargando...");
    setText(".detalle__descripcion", "Cargando información de la clase...");
    setText("#class-capacity", "Cargando capacidad...");
    setText("#class-instructor", "Cargando instructor...");
    setText("#class-schedule", "Cargando horario...");
    if (reviewList) {
      addStatus(reviewList, "Cargando reseñas...");
      reviewList.hidden = false;
    }
    renderReviewSummary([]);
    if (status) {
      status.textContent = "Consultando la base de datos...";
    }
    if (cartLink) {
      cartLink.setAttribute("aria-disabled", "true");
      cartLink.removeAttribute("href");
    }

    try {
      let classItem;
      if (classId) {
        if (!/^[1-9]\d*$/.test(classId)) {
          throw new Error("El identificador de clase no es válido.");
        }
        classItem = await api.getClass(classId);
      } else {
        const classes = await api.getClasses();
        const expectedCategory = api.normalize(category);
        classItem = classes.find((item) =>
          api.normalize(item.category) === expectedCategory
          || api.normalize(item.name).includes(expectedCategory)
        );
      }

      if (!classItem) {
        throw new Error(`No hay una clase de ${category} registrada en la base de datos.`);
      }

      loadedClassId = classItem.id;
      setText(".detalle__titulo", classItem.name || category.toUpperCase());
      setText(".detalle__precio", api.formatPrice(classItem.price));
      setText(
        ".detalle__descripcion",
        classItem.description || "Esta clase no tiene una descripción registrada."
      );
      setText("#class-instructor", classItem.instructorName
        ? `Instructor(a): ${classItem.instructorName}`
        : "Instructor(a) no disponible");
      setText("#class-schedule", api.formatSchedule(classItem.schedule));

      const capacity = Number(classItem.maximumLimit);
      const capacityText = Number.isFinite(capacity) && capacity > 0
        ? `Cupo máximo: ${capacity}`
        : "Cupo máximo no disponible";
      setText("#class-capacity", capacityText);

      if (cartLink) {
        cartLink.href = `../ShopPurshare/indexCarrito.html?classId=${encodeURIComponent(classItem.id)}`;
        cartLink.removeAttribute("aria-disabled");
      }
      if (status) {
        status.textContent = "";
      }

      if (reviewList) {
        const reviews = await api.getReviews(classItem.id);
        renderReviewSummary(reviews);
        if (reviews.length) {
          reviewList.replaceChildren(...reviews.map(renderReview));
        } else {
          addStatus(reviewList, "Esta clase todavía no tiene reseñas.");
        }
      }
    } catch (error) {
      if (status) {
        status.textContent = error.message;
      }
      if (reviewList) {
        addStatus(reviewList, "No fue posible cargar las reseñas.");
      }
      console.error("No se pudo cargar el detalle de la clase:", error);
    }
  }

  global.FitPulseClassDetail = Object.freeze({ init });
})(window);

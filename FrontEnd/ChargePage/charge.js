(function (global) {
  "use strict";

  const appRoot = new URL("../", global.location.href);
  const params = new URLSearchParams(global.location.search);
  const destination = params.get("next")
    ? new URL(params.get("next"), global.location.href)
    : new URL("Home/indexHome.html", appRoot);

  function redirectToError() {
    global.location.replace(new URL("ErrPage/indexErr.html", appRoot).href);
  }

  if (
    destination.protocol !== global.location.protocol
    || destination.host !== global.location.host
    || !destination.pathname.startsWith(appRoot.pathname)
  ) {
    redirectToError();
  } else {
    global.setTimeout(async () => {
      try {
        const response = await global.fetch(destination.href, {
          method: "HEAD",
          cache: "no-store"
        });
        if (!response.ok) {
          redirectToError();
          return;
        }
      } catch (error) {
        console.error("No se pudo comprobar el destino antes de navegar:", error);
        redirectToError();
        return;
      }

      global.location.replace(destination.href);
    }, 3000);
  }
})(window);

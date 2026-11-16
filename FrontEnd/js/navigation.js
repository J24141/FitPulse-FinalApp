(function (global) {
  "use strict";

  const scriptUrl = new URL(document.currentScript.src);
  const appRoot = new URL("../", scriptUrl);
  const chargePage = new URL("ChargePage/indexCharge.html", appRoot);
  const errorPage = new URL("ErrPage/indexErr.html", appRoot);

  function isAppPage(url) {
    return url.protocol === global.location.protocol
      && url.host === global.location.host
      && url.pathname.startsWith(appRoot.pathname);
  }

  function go(destination, replace) {
    const url = new URL(destination, global.location.href);
    if (!isAppPage(url)) {
      global.location.assign(url.href);
      return;
    }

    const transition = new URL(chargePage);
    transition.searchParams.set("next", url.href);
    if (replace) {
      transition.searchParams.set("replace", "1");
      global.location.replace(transition.href);
    } else {
      global.location.assign(transition.href);
    }
  }

  function showError() {
    if (global.location.pathname !== errorPage.pathname) {
      global.location.replace(errorPage.href);
    }
  }

  global.addEventListener("error", (event) => {
    if (typeof global.ErrorEvent === "function" && event instanceof global.ErrorEvent) {
      showError();
    }
  });
  global.addEventListener("unhandledrejection", showError);

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || link.target || link.hasAttribute("download") || link.getAttribute("aria-disabled") === "true") {
      return;
    }
    if (link.getAttribute("href").trim() === "#") {
      return;
    }

    const url = new URL(link.href, global.location.href);
    if (!isAppPage(url)) {
      return;
    }
    if (
      url.pathname === global.location.pathname
      && url.search === global.location.search
    ) {
      return;
    }

    event.preventDefault();
    go(url.href, false);
  });

  global.FitPulseNavigation = Object.freeze({ go, showError });
})(window);

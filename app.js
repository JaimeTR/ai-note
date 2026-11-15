(function () {
  var WHATSAPP = "51975646074";
  var MENSAJE = "Hola, quiero comprar AI Note (S/ 299). ¿Me ayudan a coordinar mi pedido?";
  var UNA_HORA = 3600;
  var KEY = "ainote_fin";

  function track(evento, datos) {
    try { if (window.ttq) window.ttq.track(evento, datos); } catch (e) {}
  }

  // WhatsApp: todos los botones con data-wa abren el chat con el pedido escrito.
  var wa = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(MENSAJE);
  document.querySelectorAll("[data-wa]").forEach(function (a) { a.href = wa; });
  document.querySelectorAll("[data-contact]").forEach(function (a) {
    a.addEventListener("click", function () { track("Contact"); });
  });

  // COMPRAR AHORA lleva al checkout de la tienda y conserva utm_* y ttclid de la campana.
  var pasar = new URLSearchParams();
  new URLSearchParams(location.search).forEach(function (v, k) {
    if (/^(utm_|ttclid$)/.test(k)) pasar.set(k, v);
  });
  document.querySelectorAll("[data-comprar]").forEach(function (a) {
    var url = new URL(a.href);
    pasar.forEach(function (v, k) { url.searchParams.set(k, v); });
    a.href = url.href;
    a.addEventListener("click", function (e) {
      track("InitiateCheckout", { content_id: "memoai", content_name: "AI Note", value: 299, currency: "PEN" });
      // Un respiro para que el pixel envie el evento antes de salir de la pagina.
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault();
      setTimeout(function () { location.href = a.href; }, 150);
    });
  });

  // Cuenta regresiva de 1 hora por visita (sessionStorage: recargar no la reinicia); al llegar a cero vuelve a empezar.
  // Es decision de negocio: no refleja una fecha real de fin de oferta.
  var fin = 0;
  try { fin = Number(sessionStorage.getItem(KEY)) || 0; } catch (e) {}
  function nuevo() {
    fin = Date.now() + UNA_HORA * 1000;
    try { sessionStorage.setItem(KEY, String(fin)); } catch (e) {}
  }
  if (fin <= Date.now()) nuevo();
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var nodos = document.querySelectorAll("[data-cuenta]");
  function tick() {
    if (fin <= Date.now()) nuevo();
    var s = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    var t = pad(Math.floor(s / 3600)) + ":" + pad(Math.floor((s % 3600) / 60)) + ":" + pad(s % 60);
    nodos.forEach(function (n) { n.textContent = t; });
  }
  tick();
  setInterval(tick, 1000);
  document.getElementById("topbar").hidden = false;
  document.getElementById("anio").textContent = new Date().getFullYear();
})();

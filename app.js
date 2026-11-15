(function () {
  "use strict";
  var WHATSAPP = "51975646074";
  // Pedidos y datos de pago: los registra la tienda (store.devmarkpe.com), que valida precio y manda el pedido al ERP.
  // En localhost se puede probar contra otra tienda con ?api=http://localhost:3500
  var API = "https://store.devmarkpe.com";
  if (location.hostname === "localhost") API = new URLSearchParams(location.search).get("api") || API;
  var PRECIO = 299, ENVIO_LIMA = 10, MAX = 5;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var soles = function (n) { return "S/ " + n.toFixed(2); };

  function track(evento, datos) {
    try { if (window.ttq) window.ttq.track(evento, datos); } catch (e) {}
  }
  function waLink(texto) { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto); }

  // --- WhatsApp: compra directa con el pedido escrito
  var directo = waLink("Hola, quiero comprar NoteAI (S/ " + PRECIO + "). ¿Me ayudan a coordinar mi pedido?");
  $$("[data-wa]").forEach(function (a) { a.href = directo; });
  $$("[data-contact]").forEach(function (a) { a.addEventListener("click", function () { track("Contact"); }); });

  // --- Pre-encabezado giratorio
  var frases = $$(".ticker p"), fi = 0;
  setInterval(function () {
    var prev = frases[fi];
    prev.classList.remove("on"); prev.classList.add("out");
    setTimeout(function () { prev.classList.remove("out"); }, 600);
    fi = (fi + 1) % frases.length;
    frases[fi].classList.add("on");
  }, 3200);

  // --- Cuenta regresiva de 1 hora por visita (sessionStorage: recargar no la reinicia); al llegar a cero vuelve a empezar.
  // Es decision de negocio: no refleja una fecha real de fin de oferta.
  var fin = 0;
  try { fin = Number(sessionStorage.getItem("noteai_fin")) || 0; } catch (e) {}
  function nuevo() {
    fin = Date.now() + 3600 * 1000;
    try { sessionStorage.setItem("noteai_fin", String(fin)); } catch (e) {}
  }
  if (fin <= Date.now()) nuevo();
  var nodos = $$("[data-cuenta]");
  function tick() {
    if (fin <= Date.now()) nuevo();
    var s = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    var h = pad(Math.floor(s / 3600)), m = pad(Math.floor((s % 3600) / 60)), x = pad(s % 60);
    nodos.forEach(function (n) { n.textContent = h + ":" + m + ":" + x; });
    var H = $("[data-h]");
    if (H) { H.textContent = h; $("[data-m]").textContent = m; $("[data-s]").textContent = x; }
  }
  tick();
  setInterval(tick, 1000);
  $("#anio").textContent = new Date().getFullYear();

  // --- Producto: toca para probar el efecto de grabacion
  var device = $("#device");
  device.addEventListener("click", function () {
    var on = device.classList.toggle("rec");
    device.setAttribute("aria-pressed", String(on));
    $("#hint").textContent = on ? "Apagar efecto" : "Toca el producto";
  });

  // --- Video: portada bonita; al tocar reproduce con controles
  var video = $("#demo");
  $("#play").addEventListener("click", function () {
    $(".phone").classList.add("playing");
    video.controls = true;
    video.play();
  });

  // --- Checkout propio
  var ck = $("#ck"), form = $("#ckForm"), err = $("#ckErr"), go = $("#ckGo");
  var cantidad = 1, ubigeo = null, ajustes = null, abierto = false;

  function zona() { return form.elements.zona.value; }
  function totales() {
    var sub = PRECIO * cantidad, env = zona() === "lima_fast" ? ENVIO_LIMA : 0;
    $("#qVal").textContent = cantidad;
    $("#tSub").textContent = soles(sub);
    $("#tEnv").textContent = env ? soles(env) : "Gratis";
    $("#tTot").textContent = soles(sub + env);
  }
  function opciones(sel, lista, vacio) {
    sel.innerHTML = "";
    var o = document.createElement("option"); o.value = ""; o.textContent = vacio; sel.appendChild(o);
    lista.forEach(function (t) { var e = document.createElement("option"); e.value = t; e.textContent = t; sel.appendChild(e); });
  }
  function cargarUbigeo() {
    if (ubigeo) return;
    fetch("/assets/peru-ubigeo.json").then(function (r) { return r.json(); }).then(function (d) {
      ubigeo = d;
      opciones(form.elements.dep, Object.keys(d).sort(function (a, b) { return a.localeCompare(b, "es"); }), "Elige…");
      opciones(form.elements.dist, (d.Lima && d.Lima.Lima) || [], "Elige…");
    }).catch(function () {});
  }
  function cargarAjustes() {
    if (ajustes) return;
    fetch(API + "/api/settings").then(function (r) { return r.json(); }).then(function (d) { ajustes = d.settings; }).catch(function () {});
  }
  function mostrarError(t) { err.textContent = t; err.hidden = !t; if (t) err.scrollIntoView({ block: "nearest" }); }

  function abrir() {
    if (abierto) return;
    abierto = true;
    $("#ckStep1").hidden = false; $("#ckStep2").hidden = true; mostrarError("");
    ck.hidden = false;
    document.body.style.overflow = "hidden";
    cargarUbigeo(); cargarAjustes(); totales();
    track("InitiateCheckout", { content_id: "memoai", content_name: "NoteAI", value: PRECIO * cantidad, currency: "PEN" });
    setTimeout(function () { form.elements.nombre.focus(); }, 50);
  }
  function cerrar() {
    abierto = false; ck.hidden = true; document.body.style.overflow = "";
  }
  $$("[data-comprar]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); abrir(); });
  });
  $$("[data-ck-close]").forEach(function (b) { b.addEventListener("click", cerrar); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && abierto) cerrar(); });

  $("#qMenos").addEventListener("click", function () { cantidad = Math.max(1, cantidad - 1); totales(); });
  $("#qMas").addEventListener("click", function () { cantidad = Math.min(MAX, cantidad + 1); totales(); });
  $$("input[name=zona]", form).forEach(function (r) {
    r.addEventListener("change", function () {
      var lima = zona() === "lima_fast";
      $("#zLima").hidden = !lima; $("#zNac").hidden = lima; totales();
    });
  });
  form.elements.dep.addEventListener("change", function () {
    var d = form.elements.dep.value, p = form.elements.prov;
    opciones(p, d && ubigeo ? Object.keys(ubigeo[d]).sort(function (a, b) { return a.localeCompare(b, "es"); }) : [], "Elige…");
    p.disabled = !d;
  });

  function marcar(campo, mal) { campo.classList.toggle("invalid", mal); return mal; }
  function validar() {
    var f = form.elements, mal = [];
    if (marcar(f.nombre, f.nombre.value.trim().length < 3)) mal.push("tu nombre");
    if (marcar(f.celular, f.celular.value.replace(/\D/g, "").length < 9)) mal.push("un celular de 9 dígitos");
    if (marcar(f.correo, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.value.trim()))) mal.push("un correo válido");
    if (zona() === "lima_fast") {
      if (marcar(f.dist, !f.dist.value)) mal.push("el distrito");
      if (marcar(f.dir, f.dir.value.trim().length < 5)) mal.push("tu dirección");
    } else {
      if (marcar(f.dep, !f.dep.value)) mal.push("el departamento");
      if (marcar(f.prov, !f.prov.value)) mal.push("la provincia");
      if (marcar(f.dni, f.dni.value.replace(/\D/g, "").length < 8)) mal.push("tu DNI");
    }
    return mal;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var mal = validar();
    if (mal.length) { mostrarError("Revisa " + mal.join(", ") + "."); return; }
    mostrarError("");
    var f = form.elements, lima = zona() === "lima_fast", pago = f.pago.value;
    var body = {
      customerName: f.nombre.value.trim(),
      customerEmail: f.correo.value.trim(),
      customerPhone: f.celular.value.trim(),
      deliveryZone: zona(),
      paymentProvider: pago,
      items: [{ quantity: cantidad }],
      department: lima ? "Lima" : f.dep.value,
      province: lima ? "Lima" : f.prov.value,
      city: lima ? f.dist.value : f.prov.value,
      address: lima ? f.dir.value.trim() : "Recojo en agencia Shalom de " + f.prov.value + " (se coordina por WhatsApp)",
      dni: lima ? undefined : f.dni.value.replace(/\D/g, "")
    };
    go.disabled = true; go.textContent = "REGISTRANDO…";
    fetch(API + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.success) { mostrarError((res.d && res.d.error) || "No pudimos registrar tu pedido. Intenta de nuevo."); return; }
        exito(res.d.order, pago, body.customerName);
      })
      .catch(function () { mostrarError("No hay conexión con la tienda. Intenta de nuevo o usa COMPRA DIRECTA por WhatsApp."); })
      .then(function () { go.disabled = false; go.textContent = "CONFIRMAR PEDIDO"; });
  });

  function el(tag, texto, cls) { var n = document.createElement(tag); if (texto) n.textContent = texto; if (cls) n.className = cls; return n; }

  function exito(order, pago, nombre) {
    var total = soles(order.amount);
    track("PlaceAnOrder", { content_id: "memoai", content_name: "NoteAI", value: order.amount, currency: "PEN", quantity: cantidad });
    $("#ckStep1").hidden = true; $("#ckStep2").hidden = false;
    ck.querySelector(".ck-box").scrollTop = 0;
    $("#okId").textContent = order.id; $("#okTotal").textContent = total;
    var caja = $("#okPago"); caja.innerHTML = "";
    var metodo = pago === "yape" ? "Yape" : pago === "plin" ? "Plin" : "contraentrega";
    var texto;
    if (pago === "whatsapp") {
      $("#okTitulo").textContent = "¡Pedido recibido!";
      caja.appendChild(el("p", "Escríbenos por WhatsApp para coordinar la entrega. Pagas al recibir tu NoteAI."));
      texto = "Hola, soy " + nombre + ". Hice el pedido " + order.id + " de NoteAI por " + total + " y quiero coordinar la contraentrega.";
    } else {
      $("#okTitulo").textContent = "Último paso: realiza tu pago";
      var numero = ajustes && (pago === "yape" ? ajustes.yapeNumber : ajustes.plinNumber);
      if (numero) {
        caja.appendChild(el("p", "Paga " + total + " por " + metodo + " a:"));
        caja.appendChild(el("p", numero, "num"));
        caja.appendChild(el("p", ajustes.yapeName || ""));
        var qr = el("img"); qr.src = "/assets/qr-" + pago + ".jpeg"; qr.alt = "Código QR de " + metodo; caja.appendChild(qr);
      } else {
        caja.appendChild(el("p", "Te enviamos el número de " + metodo + " por WhatsApp."));
      }
      caja.appendChild(el("p", "Después envíanos la captura del pago por WhatsApp para confirmar tu pedido."));
      texto = "Hola, soy " + nombre + ". Hice el pedido " + order.id + " de NoteAI por " + total + " y pagué por " + metodo + ". Te envío mi comprobante.";
    }
    $("#okWa").href = waLink(texto);
    $("#okWa").onclick = function () { track("Contact"); };
  }
})();

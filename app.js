(function () {
  "use strict";
  var WHATSAPP = "51975646074";
  // Pedidos y datos de pago: los registra la tienda (store.devmarkpe.com), que valida precio y manda el pedido al ERP.
  // En localhost se puede probar contra otra tienda con ?api=http://localhost:3500
  var API = "https://store.devmarkpe.com";
  if (location.hostname === "localhost") API = new URLSearchParams(location.search).get("api") || API;
  var PRECIO = 299, MAX = 5;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var soles = function (n) { return "S/ " + n.toFixed(2); };
  var alfa = function (a, b) { return a.localeCompare(b, "es"); };

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

  // --- Checkout propio en dos pasos
  var ck = $("#ck"), form = $("#ckForm"), f = form.elements, go = $("#ckGo");
  var cantidad = 1, ubigeo = null, shalom = null, ajustes = null, abierto = false, agencia = null;

  function el(tag, texto, cls) { var n = document.createElement(tag); if (texto) n.textContent = texto; if (cls) n.className = cls; return n; }
  function opciones(sel, lista, vacio) {
    sel.innerHTML = "";
    sel.appendChild(el("option", vacio)).value = "";
    lista.forEach(function (t) { sel.appendChild(el("option", t)).value = t; });
  }
  function error(n, t) { var e = $("#ckErr" + n); e.textContent = t; e.hidden = !t; }
  function marcar(campo, mal) { campo.classList.toggle("invalid", mal); return mal; }

  function totales() {
    $("#qVal").textContent = cantidad;
    $("#tCant").textContent = cantidad + " × NoteAI";
    $("#tSub").textContent = soles(PRECIO * cantidad);
    $("#tTot").textContent = soles(PRECIO * cantidad); // envio gratis a todo el Peru
  }
  // Datos que se cargan una vez al abrir: ubigeo (departamentos y provincias), agencias Shalom y datos de pago de la tienda.
  function cargar() {
    if (!ubigeo) fetch("/assets/peru-ubigeo.json").then(function (r) { return r.json(); }).then(function (d) {
      ubigeo = d; opciones(f.dep, Object.keys(d).sort(alfa), "Elige…");
    }).catch(function () {});
    if (!shalom) fetch("/assets/shalom-agencias.json").then(function (r) { return r.json(); }).then(function (d) { shalom = d; }).catch(function () {});
    if (!ajustes) fetch(API + "/api/settings").then(function (r) { return r.json(); }).then(function (d) { ajustes = d.settings; }).catch(function () {});
  }

  function paso(n) {
    ["ckStep1", "ckStep2", "ckStep3"].forEach(function (id, i) { $("#" + id).hidden = i !== n - 1; });
    $$("#steps li").forEach(function (li, i) {
      li.classList.toggle("on", i === n - 1);
      li.classList.toggle("done", i < n - 1 || n === 3);
    });
    $("#steps").hidden = n === 3;
    ck.querySelector(".ck-box").scrollTop = 0;
  }

  function abrir() {
    if (abierto) return;
    abierto = true;
    error(1, ""); error(2, ""); paso(1);
    ck.hidden = false;
    document.body.style.overflow = "hidden";
    cargar(); totales();
    track("InitiateCheckout", { content_id: "memoai", content_name: "NoteAI", value: PRECIO * cantidad, currency: "PEN" });
    setTimeout(function () { f.nombre.focus(); }, 60);
  }
  function cerrar() { abierto = false; ck.hidden = true; document.body.style.overflow = ""; }
  $$("[data-comprar]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); abrir(); }); });
  $$("[data-ck-close]").forEach(function (b) { b.addEventListener("click", cerrar); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && abierto) cerrar(); });

  $("#qMenos").addEventListener("click", function () { cantidad = Math.max(1, cantidad - 1); totales(); });
  $("#qMas").addEventListener("click", function () { cantidad = Math.min(MAX, cantidad + 1); totales(); });

  // Paso 1 -> 2
  function validarPaso1() {
    var mal = [];
    if (marcar(f.nombre, f.nombre.value.trim().length < 3)) mal.push("tu nombre");
    if (marcar(f.celular, f.celular.value.replace(/\D/g, "").length < 9)) mal.push("un celular de 9 dígitos");
    if (marcar(f.dni, f.dni.value.replace(/\D/g, "").length < 8)) mal.push("tu DNI");
    if (marcar(f.correo, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.value.trim()))) mal.push("un correo válido");
    return mal;
  }
  $("#ckNext").addEventListener("click", function () {
    var mal = validarPaso1();
    if (mal.length) { error(1, "Revisa " + mal.join(", ") + "."); return; }
    error(1, ""); paso(2);
  });
  $("#ckBack").addEventListener("click", function () { paso(1); });

  // Envio: departamento -> provincia -> distrito -> agencias Shalom de ese distrito (con direccion y horario)
  function deProvincia() {
    var d = f.dep.value, p = f.prov.value;
    return (d && p && shalom && shalom[d] && shalom[d][p]) || [];
  }
  function listaAgencias() {
    var z = f.dist.value;
    return deProvincia().filter(function (a) { return a.zona === z; });
  }
  function dibujarDistritos() {
    var ags = deProvincia(), vistos = {}, zonas = [];
    ags.forEach(function (a) { if (!vistos[a.zona]) { vistos[a.zona] = 1; zonas.push(a.zona); } });
    zonas.sort(alfa);
    opciones(f.dist, zonas, "Elige tu distrito…");
    f.dist.disabled = !zonas.length;
    $("#distLbl").hidden = !(f.dep.value && f.prov.value && zonas.length);
    if (zonas.length === 1) f.dist.value = zonas[0]; // una sola agencia en la provincia: ya viene elegida
    dibujarAgencias();
  }
  function dibujarAgencias() {
    var caja = $("#agencias"), lista = $("#agList"), ags = listaAgencias(), hayProv = f.dep.value && f.prov.value;
    lista.innerHTML = ""; agencia = null;
    var sinAgencias = hayProv && shalom && !deProvincia().length;
    caja.hidden = !(sinAgencias || f.dist.value);
    if (caja.hidden) return;
    if (sinAgencias) {
      lista.appendChild(el("p", "No hay agencia Shalom registrada en esta provincia todavía: coordinamos el punto de entrega más cercano contigo por WhatsApp.", "ag-none"));
      return;
    }
    ags.forEach(function (a, i) {
      var rotulo = el("label", "", "ag");
      var r = el("input"); r.type = "radio"; r.name = "agencia"; r.value = String(i);
      var t = el("span");
      t.appendChild(el("b", ags.length > 1 ? a.zona + " (" + (i + 1) + ")" : a.zona));
      t.appendChild(el("small", a.direccion));
      t.appendChild(el("small", a.horario + (a.telefono ? " · " + a.telefono : "")));
      rotulo.appendChild(r); rotulo.appendChild(t); lista.appendChild(rotulo);
      r.addEventListener("change", function () { agencia = a; $("#ckErr2").hidden = true; });
    });
    if (ags.length === 1) { lista.querySelector("input").checked = true; agencia = ags[0]; }
  }
  f.dep.addEventListener("change", function () {
    var d = f.dep.value;
    opciones(f.prov, d && ubigeo ? Object.keys(ubigeo[d]).sort(alfa) : [], "Elige…");
    f.prov.disabled = !d; dibujarDistritos();
  });
  f.prov.addEventListener("change", dibujarDistritos);
  f.dist.addEventListener("change", dibujarAgencias);

  // Confirmar
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if ($("#ckStep2").hidden) { $("#ckNext").click(); return; } // Enter en el paso 1 = Continuar
    var mal = [];
    if (marcar(f.dep, !f.dep.value)) mal.push("el departamento");
    if (marcar(f.prov, !f.prov.value)) mal.push("la provincia");
    if (mal.length) { error(2, "Elige " + mal.join(" y ") + "."); return; }
    if (deProvincia().length && !f.dist.value) { marcar(f.dist, true); error(2, "Elige tu distrito para ver las agencias Shalom."); return; }
    marcar(f.dist, false);
    if (deProvincia().length && !agencia) { error(2, "Elige la agencia Shalom donde recogerás tu pedido."); return; }
    error(2, "");
    var pago = f.pago.value;
    var body = {
      customerName: f.nombre.value.trim(),
      customerEmail: f.correo.value.trim(),
      customerPhone: f.celular.value.trim(),
      dni: f.dni.value.replace(/\D/g, ""),
      deliveryZone: "nacional",
      paymentProvider: pago,
      items: [{ quantity: cantidad }],
      department: f.dep.value,
      province: f.prov.value,
      city: agencia ? agencia.zona : f.prov.value,
      address: agencia ? agencia.zona + " — " + agencia.direccion : "Recojo en agencia Shalom de " + f.prov.value + " (se coordina por WhatsApp)"
    };
    go.disabled = true; go.textContent = "REGISTRANDO…";
    fetch(API + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.success) { error(2, (res.d && res.d.error) || "No pudimos registrar tu pedido. Intenta de nuevo."); return; }
        exito(res.d.order, pago, body.customerName);
      })
      .catch(function () { error(2, "No hay conexión con la tienda. Intenta de nuevo o usa COMPRA DIRECTA por WhatsApp."); })
      .then(function () { go.disabled = false; go.textContent = "CONFIRMAR PEDIDO"; });
  });

  function exito(order, pago, nombre) {
    var total = soles(order.amount);
    track("PlaceAnOrder", { content_id: "memoai", content_name: "NoteAI", value: order.amount, currency: "PEN", quantity: cantidad });
    paso(3);
    $("#okId").textContent = order.id; $("#okTotal").textContent = total;
    $("#okAg").textContent = agencia ? "Recoges en Shalom " + agencia.zona + ": " + agencia.direccion + " (" + agencia.horario + ")" : "";
    var caja = $("#okPago"); caja.innerHTML = "";
    var texto, lugar = agencia ? " Recojo en Shalom " + agencia.zona + "." : "";
    if (pago === "whatsapp") {
      $("#okTitulo").textContent = "¡Pedido recibido!";
      caja.appendChild(el("p", "Escríbenos por WhatsApp para coordinar la entrega. Pagas al recibir tu NoteAI."));
      texto = "Hola, soy " + nombre + ". Hice el pedido " + order.id + " de NoteAI por " + total + " y quiero coordinar la contraentrega." + lugar;
    } else {
      $("#okTitulo").textContent = "Último paso: realiza tu pago";
      caja.appendChild(el("p", "Paga " + total + " por Yape o Plin:"));
      if (ajustes) {
        var qrs = el("div", "", "qrs");
        [["yape", "Yape", ajustes.yapeNumber], ["plin", "Plin", ajustes.plinNumber]].forEach(function (m) {
          var c = el("div"); c.appendChild(el("b", m[1])); c.appendChild(el("div", m[2], "num"));
          var qr = el("img"); qr.src = "/assets/qr-" + m[0] + ".jpeg"; qr.alt = "Código QR de " + m[1]; qr.loading = "lazy"; c.appendChild(qr);
          qrs.appendChild(c);
        });
        caja.appendChild(qrs);
        if (ajustes.yapeName) caja.appendChild(el("p", "A nombre de " + ajustes.yapeName));
      } else {
        caja.appendChild(el("p", "Te enviamos el número por WhatsApp."));
      }
      caja.appendChild(el("p", "Después envíanos la captura del pago por WhatsApp para confirmar tu pedido."));
      texto = "Hola, soy " + nombre + ". Hice el pedido " + order.id + " de NoteAI por " + total + " y pagué por Yape/Plin. Te envío mi comprobante." + lugar;
    }
    $("#okWa").href = waLink(texto);
    $("#okWa").onclick = function () { track("Contact"); };
  }
})();

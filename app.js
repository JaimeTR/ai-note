(function () {
  "use strict";
  var WHATSAPP = "51975646074";
  // Pedidos y datos de pago: los registra la tienda (store.devmarkpe.com), que valida precio, manda el pedido al ERP
  // y avisa por correo. En localhost se puede probar contra otra tienda con ?api=http://localhost:3500
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

  // --- Checkout propio en tres pasos: 1 datos, 2 recojo en Shalom, 3 pago
  var ck = $("#ck"), form = $("#ckForm"), f = form.elements, go = $("#ckGo");
  var cantidad = 1, ubigeo = null, shalom = null, ajustes = null, abierto = false, agencia = null, actual = 1;

  function el(tag, texto, cls) { var n = document.createElement(tag); if (texto) n.textContent = texto; if (cls) n.className = cls; return n; }
  function opciones(sel, lista, vacio) {
    sel.innerHTML = "";
    sel.appendChild(el("option", vacio)).value = "";
    lista.forEach(function (t) { sel.appendChild(el("option", t)).value = t; });
  }
  function error(n, t) { var e = $("#ckErr" + n); e.textContent = t; e.hidden = !t; }
  function marcar(campo, mal) { campo.classList.toggle("invalid", mal); return mal; }
  function total() { return PRECIO * cantidad; } // envio gratis a todo el Peru

  function totales() {
    $("#qVal").textContent = cantidad;
    $("#tCant").textContent = cantidad + " × NoteAI";
    $("#tSub").textContent = soles(total());
    $("#tTot").textContent = soles(total());
  }
  // Datos que se cargan una vez al abrir: ubigeo (departamentos y provincias), agencias Shalom y datos de pago de la tienda.
  function cargarAjustes() {
    return fetch(API + "/api/settings").then(function (r) { return r.json(); }).then(function (d) { ajustes = d.settings; }).catch(function () {});
  }
  function cargar() {
    if (!ubigeo) fetch("/assets/peru-ubigeo.json").then(function (r) { return r.json(); }).then(function (d) {
      ubigeo = d; opciones(f.dep, Object.keys(d).sort(alfa), "Elige…");
    }).catch(function () {});
    if (!shalom) fetch("/assets/shalom-agencias.json").then(function (r) { return r.json(); }).then(function (d) { shalom = d; }).catch(function () {});
    if (!ajustes) cargarAjustes();
  }

  function paso(n) {
    actual = n;
    ["ckStep1", "ckStep2", "ckStep3", "ckStep4"].forEach(function (id, i) { $("#" + id).hidden = i !== n - 1; });
    $$("#steps li").forEach(function (li, i) {
      li.classList.toggle("on", i === n - 1);
      li.classList.toggle("done", i < n - 1 || n === 4);
    });
    $("#steps").hidden = n === 4;
    ck.querySelector(".ck-box").scrollTop = 0;
    if (n === 3) { totales(); dibujarPago(); }
  }

  function abrir() {
    if (abierto) return;
    abierto = true;
    error(1, ""); error(2, ""); error(3, ""); delete $("#ckWa").dataset.pedido; paso(1);
    ck.hidden = false;
    document.body.style.overflow = "hidden";
    cargar(); totales();
    track("InitiateCheckout", { content_id: "memoai", content_name: "NoteAI", value: total(), currency: "PEN" });
    setTimeout(function () { f.nombre.focus(); }, 60);
  }
  function cerrar() { abierto = false; ck.hidden = true; document.body.style.overflow = ""; }
  $$("[data-comprar]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); abrir(); }); });
  $$("[data-ck-close]").forEach(function (b) { b.addEventListener("click", cerrar); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && abierto) cerrar(); });

  $("#qMenos").addEventListener("click", function () { cantidad = Math.max(1, cantidad - 1); totales(); });
  $("#qMas").addEventListener("click", function () { cantidad = Math.min(MAX, cantidad + 1); totales(); });

  // Paso 1 -> 2
  $("#ckNext").addEventListener("click", function () {
    var mal = [];
    if (marcar(f.nombre, f.nombre.value.trim().length < 3)) mal.push("tu nombre");
    if (marcar(f.celular, f.celular.value.replace(/\D/g, "").length < 9)) mal.push("un celular de 9 dígitos");
    if (marcar(f.dni, f.dni.value.replace(/\D/g, "").length < 8)) mal.push("tu DNI");
    if (marcar(f.correo, !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.value.trim()))) mal.push("un correo válido");
    if (mal.length) { error(1, "Revisa " + mal.join(", ") + "."); return; }
    error(1, ""); paso(2);
  });
  $("#ckBack2").addEventListener("click", function () { paso(1); });

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
      r.addEventListener("change", function () { agencia = a; error(2, ""); });
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

  // Paso 2 -> 3
  $("#ckNext2").addEventListener("click", function () {
    var mal = [];
    if (marcar(f.dep, !f.dep.value)) mal.push("el departamento");
    if (marcar(f.prov, !f.prov.value)) mal.push("la provincia");
    if (mal.length) { error(2, "Elige " + mal.join(" y ") + "."); return; }
    if (deProvincia().length && !f.dist.value) { marcar(f.dist, true); error(2, "Elige tu distrito para ver las agencias Shalom."); return; }
    marcar(f.dist, false);
    if (deProvincia().length && !agencia) { error(2, "Elige la agencia Shalom donde recogerás tu pedido."); return; }
    error(2, ""); paso(3);
  });
  $("#ckBack3").addEventListener("click", function () { paso(2); });

  // Paso 3: metodo de pago y, ahi mismo, los datos para pagar
  function copiar(texto, boton) {
    var listo = function () { boton.textContent = "¡Copiado!"; boton.classList.add("ok2"); setTimeout(function () { boton.textContent = "Copiar número"; boton.classList.remove("ok2"); }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(listo, function () {}); else listo();
  }
  function tarjetaPago(marca, qr, numero, nombre) {
    var c = el("div", "", "pcard");
    c.appendChild(el("span", marca, "pb"));
    c.appendChild(el("span", numero, "pn"));
    if (nombre) c.appendChild(el("span", "A nombre de " + nombre, "pname"));
    var b = el("button", "Copiar número", "copy"); b.type = "button";
    b.addEventListener("click", function () { copiar(numero, b); });
    c.appendChild(b);
    var img = el("img"); img.src = "/assets/qr-" + qr + ".jpeg"; img.alt = "Código QR de " + marca; img.loading = "lazy"; c.appendChild(img);
    return c;
  }
  function dibujarPago() {
    var panel = $("#payPanel"), pago = f.pago.value;
    panel.innerHTML = "";
    go.textContent = pago === "whatsapp" ? "CONFIRMAR PEDIDO" : "YA PAGUÉ";
    if (!$("#ckWa").dataset.pedido) $("#ckWa").href = waLink("Hola, tengo una consulta sobre NoteAI.");
    if (pago === "whatsapp") {
      panel.appendChild(el("p", "Pagas al recibir tu NoteAI. Al confirmar, nos ponemos en contacto contigo para coordinar la entrega.", "pnote"));
      return;
    }
    panel.appendChild(el("p", "Paga " + soles(total()) + " por Yape o Plin y luego toca «Ya pagué»:", "pnote"));
    if (ajustes) {
      panel.appendChild(tarjetaPago("Yape", "yape", ajustes.yapeNumber, ajustes.yapeName));
      panel.appendChild(tarjetaPago("Plin", "plin", ajustes.plinNumber, ajustes.yapeName));
    } else {
      var n = el("p", "Cargando los datos de pago…", "pnote"); panel.appendChild(n);
      cargarAjustes().then(function () { if (actual === 3 && f.pago.value === pago) dibujarPago(); });
      if (ajustes === null) setTimeout(function () { if (!ajustes && n.parentNode) n.textContent = "No pudimos cargar el número de pago. Escríbenos por WhatsApp y te lo enviamos."; }, 4000);
    }
  }
  $$("input[name=pago]", form).forEach(function (r) { r.addEventListener("change", dibujarPago); });

  function textoPedido(saludo) {
    return saludo + " Soy " + f.nombre.value.trim() + " (cel. " + f.celular.value.trim() + ", DNI " + f.dni.value.trim() + "). " +
      "Pedido de " + cantidad + " NoteAI por " + soles(total()) + ", pago por " + (f.pago.value === "whatsapp" ? "contraentrega" : "Yape/Plin") +
      (agencia ? ". Recojo en Shalom " + agencia.zona + ": " + agencia.direccion : ". Recojo en agencia Shalom de " + f.prov.value + ", " + f.dep.value) + ".";
  }

  // Confirmar: aqui recien se registra el pedido (en la tienda y el ERP) y llega el aviso por correo
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (actual === 1) { $("#ckNext").click(); return; } // Enter en el paso 1 = Continuar
    if (actual === 2) { $("#ckNext2").click(); return; }
    var pago = f.pago.value;
    var body = {
      customerName: f.nombre.value.trim(),
      customerEmail: f.correo.value.trim(),
      customerPhone: f.celular.value.trim(),
      dni: f.dni.value.replace(/\D/g, ""),
      deliveryZone: "nacional",
      paymentProvider: pago,
      yaPago: pago === "yape_plin",
      origen: location.host + location.search,
      items: [{ quantity: cantidad }],
      department: f.dep.value,
      province: f.prov.value,
      city: agencia ? agencia.zona : f.prov.value,
      address: agencia ? agencia.zona + " — " + agencia.direccion : "Recojo en agencia Shalom de " + f.prov.value + " (se coordina por WhatsApp)"
    };
    error(3, "");
    go.disabled = true; go.textContent = "REGISTRANDO…";
    fetch(API + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.text().then(function (t) {
          var d = null; try { d = JSON.parse(t); } catch (x) {}
          return { ok: r.ok, status: r.status, d: d };
        });
      })
      .then(function (res) {
        if (res.ok && res.d && res.d.success) { exito(res.d.order, pago); return; }
        falla((res.d && res.d.error) || "La tienda respondió con un error (" + res.status + ").");
      })
      .catch(function () { falla("No pudimos conectar con la tienda."); })
      .then(function () { go.disabled = false; dibujarPago(); });
  });

  // Si algo falla, el pedido no se pierde: se puede enviar completo por WhatsApp.
  function falla(motivo) {
    error(3, motivo + " No te preocupes: toca «Consultar por WhatsApp» y te enviamos tu pedido ya escrito, o intenta de nuevo.");
    $("#ckWa").href = waLink(textoPedido("Hola, no pude terminar mi pedido en la página."));
    $("#ckWa").dataset.pedido = "1";
  }

  function exito(order, pago) {
    var totalTxt = soles(order.amount);
    track("PlaceAnOrder", { content_id: "memoai", content_name: "NoteAI", value: order.amount, currency: "PEN", quantity: cantidad });
    paso(4);
    $("#okId").textContent = order.id; $("#okTotal").textContent = totalTxt;
    $("#okMsg").textContent = pago === "whatsapp"
      ? "Nos pondremos en contacto contigo para coordinar la entrega. Pagas al recibir tu NoteAI."
      : "Verificaremos tu pago y nos pondremos en contacto contigo para confirmarlo y coordinar el envío.";
    $("#okAg").textContent = (agencia ? "Recoges en Shalom " + agencia.zona + ": " + agencia.direccion + " (" + agencia.horario + "). " : "") +
      "Te enviamos la confirmación a " + f.correo.value.trim() + ".";
    $("#okWa").href = waLink("Hola, soy " + f.nombre.value.trim() + ". Tengo una consulta sobre mi pedido " + order.id + " de NoteAI.");
    $("#okWa").onclick = function () { track("Contact"); };
  }
})();

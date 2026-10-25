"use strict";

(function () {
  var state = { data: null, evento: null, soloAplican: false };
  var pasos = [];      // { step, li, btn, panel, inner, numero }
  var capitulos = [];  // { li, lis: [li de pasos] }
  var tickets = [];    // { plazo, el }

  var $ = function (sel) { return document.querySelector(sel); };

  /* Crea un elemento. Los textos se asignan con textContent. */
  function h(tag, opts) {
    var node = document.createElement(tag);
    opts = opts || {};
    Object.keys(opts).forEach(function (k) {
      var v = opts[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      for (var j = 0; j < kids.length; j++) if (kids[j] !== null && kids[j] !== undefined) node.append(kids[j]);
    }
    return node;
  }

  /* true / false según el evento elegido; null si no hay evento o la regla no aplica */
  function coincide(aplica, ev) {
    if (!ev || !aplica) return null;
    if (aplica === "todos") return true;
    return aplica.indexOf(ev) !== -1;
  }

  /* ---------- Carga de datos ---------- */
  function cargar() {
    fetch("data.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(iniciar)
      .catch(mostrarError);
  }

  function mostrarError() {
    var box = $("#error");
    box.hidden = false;
    box.replaceChildren(
      h("h2", { text: "No se pudo cargar data.json" }),
      h("p", { text: "Los navegadores bloquean la lectura de archivos JSON cuando la página se abre con doble clic (file://). Abre la carpeta con un servidor local:" }),
      h("p", {}, "Con Python: ", h("code", { text: "python -m http.server 8000" }), " y entra a ", h("code", { text: "http://localhost:8000" })),
      h("p", {}, "O con la extensión Live Server de VS Code: clic derecho sobre ", h("code", { text: "index.html" }), " y Open with Live Server.")
    );
    $("#resumen").textContent = "";
  }

  /* ---------- Construcción ---------- */
  function iniciar(data) {
    state.data = data;
    document.title = data.meta.titulo + " | Resolución 1401 de 2007";
    $("#titulo").textContent = data.meta.titulo;
    $("#subtitulo").textContent = data.meta.subtitulo;
    $("#fuente").href = data.meta.fuente;
    $("#pie").textContent = data.meta.pie;

    construirEventos(data.eventos);
    construirPlazos(data.plazos);
    construirRuta(data);

    $("#limpiar").addEventListener("click", function () { elegirEvento(null); });
    $("#solo").addEventListener("change", function (e) { state.soloAplican = e.target.checked; actualizar(); });
    $("#expandir").addEventListener("click", alternarTodos);

    actualizar();
  }

  function construirEventos(eventos) {
    var cont = $("#eventos");
    eventos.forEach(function (ev) {
      var input = h("input", { type: "radio", name: "evento", value: ev.id, onchange: function () { elegirEvento(ev.id); } });
      var label = h("label", { class: "evento" },
        input,
        h("span", { class: "evento-in" },
          h("span", { class: "sig " + ev.id, "aria-hidden": "true", text: ev.id === "incidente" ? "i" : ev.id === "grave" ? "!" : "" }),
          h("span", {},
            h("span", { class: "evento-nombre", text: ev.nombre }),
            h("span", { class: "evento-desc", text: ev.descripcion })
          )
        )
      );
      cont.append(label);
    });
  }

  function construirPlazos(plazos) {
    var cont = $("#plazos");
    plazos.forEach(function (p) {
      var el = h("div", { class: "ticket", role: "listitem", "data-estado": "neutral" },
        h("span", { class: "num", text: p.valor }),
        h("span", { class: "unidad", text: p.unidad }),
        h("span", { class: "desc", text: p.texto })
      );
      cont.append(el);
      tickets.push({ plazo: p, el: el });
    });
  }

  function textoPlazo(p) { return p.valor + " " + p.unidad; }

  function bloque(b) {
    if (b.p) return h("p", { text: b.p });
    if (b.nota) return h("p", { class: "nota", text: b.nota });
    if (b.lista) return h("ul", {}, b.lista.map(function (t) { return h("li", { text: t }); }));
    if (b.cols) {
      return h("div", { class: "cols" }, b.cols.map(function (c) {
        return h("div", { class: "col", dataset: c.aplica ? { aplica: c.aplica.join(",") } : {} },
          h("span", { class: "tucaso", text: "Tu caso" }),
          h("strong", { text: c.titulo }),
          h("p", { text: c.texto })
        );
      }));
    }
    return null;
  }

  function construirPaso(step, indice, numero, plazosPorId) {
    var idPanel = "panel-" + step.id;
    var chips = [h("span", { class: "chip", text: step.ref })];
    if (step.fuente === "comp") chips.push(h("span", { class: "chip comp", text: "Norma complementaria" }));
    if (step.estado === "validar") chips.push(h("span", { class: "chip validar", text: "Por validar" }));
    (step.plazos || []).forEach(function (id) {
      if (plazosPorId[id]) chips.push(h("span", { class: "chip plazo", text: textoPlazo(plazosPorId[id]) }));
    });
    chips.push(h("span", { class: "chip noaplica", hidden: true, text: "No aplica a este evento" }));

    var btn = h("button", { type: "button", class: "cabeza", id: "btn-" + step.id, "aria-expanded": "false", "aria-controls": idPanel },
      h("span", { class: "cabeza-txt" },
        h("span", { class: "titulo", text: step.titulo }),
        h("span", { class: "resumen-paso", text: step.resumen }),
        h("span", { class: "ruta-txt" }),
        h("span", { class: "chips" }, chips)
      ),
      h("span", { class: "chev", "aria-hidden": "true" })
    );

    var cuerpo = h("div", { class: "cuerpo" });
    if (step.ramas) {
      cuerpo.append(h("div", { class: "ramas" }, step.ramas.map(function (r) {
        return h("div", { class: "rama", dataset: r.aplica ? { aplica: r.aplica.join(",") } : {} },
          h("span", { class: "tucaso", text: "Tu caso" }),
          h("strong", { text: r.etiqueta }),
          h("p", { text: r.texto })
        );
      })));
    }
    (step.contenido || []).forEach(function (b) { var n = bloque(b); if (n) cuerpo.append(n); });

    var inner = h("div", { class: "panel-in" }, cuerpo);
    inner.inert = true;
    var panel = h("div", { class: "panel", id: idPanel, role: "region", "aria-labelledby": "btn-" + step.id }, inner);
    var tarjeta = h("div", { class: "tarjeta" }, h("h3", {}, btn), panel);

    var marcaTxt = step.tipo === "decision" ? h("span", { text: "?" }) : String(numero);
    var li = h("li", {
      class: "paso",
      style: "--i:" + indice,
      dataset: { id: step.id, tipo: step.tipo, fuente: step.fuente, estado: "neutral" }
    }, h("span", { class: "marca", "aria-hidden": "true" }, marcaTxt), tarjeta);

    btn.addEventListener("click", function () { alternar(li, btn, panel, inner, tarjeta); });
    return { step: step, li: li, btn: btn, panel: panel, inner: inner, tarjeta: tarjeta };
  }

  function construirRuta(data) {
    var plazosPorId = {};
    data.plazos.forEach(function (p) { plazosPorId[p.id] = p; });

    var ol = $("#ruta");
    var indice = 0;
    var numero = 0;

    data.capitulos.forEach(function (cap) {
      var capLi = h("li", { class: "capitulo", style: "--i:" + indice, dataset: { estado: "neutral" } }, h("h2", { text: cap.titulo }));
      ol.append(capLi);
      var grupo = { li: capLi, lis: [] };
      indice++;

      cap.pasos.forEach(function (step) {
        if (step.tipo !== "decision") numero++;
        var p = construirPaso(step, indice, numero, plazosPorId);
        // las decisiones no llevan número: el contador solo avanza en pasos
        pasos.push(p);
        grupo.lis.push(p.li);
        ol.append(p.li);
        indice++;
      });
      capitulos.push(grupo);
    });

    ol.append(h("li", { class: "fin", style: "--i:" + indice, dataset: { estado: "neutral" } },
      h("span", { class: "marca", "aria-hidden": "true" }),
      h("p", { text: data.fin.titulo })
    ));
  }

  /* ---------- Interacción ---------- */
  function alternar(li, btn, panel, inner, tarjeta, forzar) {
    var abrir = typeof forzar === "boolean" ? forzar : btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", String(abrir));
    panel.classList.toggle("abierto", abrir);
    tarjeta.classList.toggle("abierta", abrir);
    inner.inert = !abrir;
    if (abrir) li.classList.add("visto");
  }

  function alternarTodos() {
    var visibles = pasos.filter(function (p) { return !p.li.hidden; });
    var hayCerrado = visibles.some(function (p) { return p.btn.getAttribute("aria-expanded") !== "true"; });
    visibles.forEach(function (p) { alternar(p.li, p.btn, p.panel, p.inner, p.tarjeta, hayCerrado); });
    $("#expandir").textContent = hayCerrado ? "Contraer todo" : "Expandir todo";
  }

  function elegirEvento(id) {
    state.evento = id;
    if (!id) {
      var marcado = document.querySelector('input[name="evento"]:checked');
      if (marcado) marcado.checked = false;
      state.soloAplican = false;
      $("#solo").checked = false;
    }
    actualizar();
  }

  /* ---------- Actualización de la vista ---------- */
  function actualizar() {
    var ev = state.evento;
    var eventoInfo = ev ? state.data.eventos.filter(function (e) { return e.id === ev; })[0] : null;
    var total = pasos.length;
    var aplican = 0;

    pasos.forEach(function (p) {
      var a = coincide(p.step.aplica, ev);
      var estado = ev ? (a ? "on" : "off") : "neutral";
      if (a) aplican++;

      p.li.dataset.estado = estado;
      p.li.hidden = state.soloAplican && estado === "off";
      p.li.querySelector(".chip.noaplica").hidden = estado !== "off";

      var ramas = p.li.querySelectorAll(".rama, .col");
      var rutaTxt = "";
      ramas.forEach(function (nodo) {
        var lista = nodo.dataset.aplica ? nodo.dataset.aplica.split(",") : null;
        var m = ev && lista ? lista.indexOf(ev) !== -1 : null;
        nodo.classList.toggle("activa", m === true && estado === "on");
        nodo.classList.toggle("inactiva", m === false || (m === true && estado === "off"));
        if (m === true && estado === "on" && nodo.classList.contains("rama")) {
          rutaTxt = "Tu ruta: " + nodo.querySelector("strong").textContent;
        }
      });
      p.li.querySelector(".ruta-txt").textContent = rutaTxt;
    });

    capitulos.forEach(function (g) {
      var visibles = g.lis.filter(function (li) { return !li.hidden; });
      g.li.hidden = visibles.length === 0;
      g.li.dataset.estado = visibles.length ? visibles[0].dataset.estado : "neutral";
    });

    var fin = document.querySelector("li.fin");
    fin.dataset.estado = ev ? "on" : "neutral";

    tickets.forEach(function (t) {
      var a = coincide(t.plazo.aplica, ev);
      t.el.dataset.estado = ev ? (a ? "on" : "off") : "neutral";
    });

    $("#resumen").textContent = eventoInfo
      ? "En " + eventoInfo.frase + " aplican " + aplican + " de " + total + " pasos."
      : "Elige qué ocurrió para resaltar tu recorrido. Mientras tanto se muestran los " + total + " pasos.";

    $("#limpiar").hidden = !ev;
    $("#solo-wrap").hidden = !ev;
  }

  cargar();
})();

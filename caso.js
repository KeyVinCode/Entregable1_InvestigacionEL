"use strict";

(function () {
  var PAGES = [
    ["index.html", "Flujograma"], ["caso.html", "El caso"], ["etapas.html", "1. Etapas"],
    ["pertinencia.html", "2. Pertinencia"], ["criticos.html", "3. Pasos críticos"], ["reflexion.html", "4. Reflexión"]
  ];
  var TITULOS = {
    caso: ["El caso de Rodrigo Pérez", "Qué ocurrió, cómo se clasifica y qué plazos corren."],
    etapas: ["1. Etapas del procedimiento", "El flujograma de la Resolución 1401 frente al caso, paso por paso."],
    pertinencia: ["2. Pertinencia de cada paso", "Por qué se exige cada paso y qué pasa si se omite."],
    criticos: ["3. Pasos críticos", "Los pasos donde una mala lectura de la norma cambia el resultado."],
    reflexion: ["4. Reflexión", "Por qué importa seguir procedimientos regulados por la ley."]
  };
  var vista = document.body.dataset.vista;
  var app = document.getElementById("app");

  function h(tag, o) {
    var n = document.createElement(tag);
    o = o || {};
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { n.dataset[d] = v[d]; });
      else n.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) { if (c !== null && c !== undefined) n.append(c); });
    }
    return n;
  }

  function cabecera() {
    var nav = h("nav", { class: "nav", "aria-label": "Páginas" }, PAGES.map(function (p) {
      var cur = location.pathname.split("/").pop() === p[0];
      return h("a", { href: p[0], text: p[1], "aria-current": cur ? "page" : false });
    }));
    return h("header", { class: "cabecera chica" },
      h("div", { class: "cabecera-in" }, nav, h("h1", { text: TITULOS[vista][0] }), h("p", { class: "lead", text: TITULOS[vista][1] })),
      h("div", { class: "franja", "aria-hidden": "true" }));
  }

  function pager() {
    var i = PAGES.findIndex(function (p) { return p[0] === location.pathname.split("/").pop(); });
    var prev = PAGES[i - 1], next = PAGES[i + 1];
    return h("div", { class: "pager" },
      prev ? h("a", { href: prev[0], text: "Anterior: " + prev[1] }) : h("span"),
      next ? h("a", { href: next[0], text: "Siguiente: " + next[1] }) : h("span"));
  }

  function error() {
    app.append(cabecera(), h("main", { class: "pagina" }, h("div", { class: "error" },
      h("h2", { text: "No se pudieron cargar los datos" }),
      h("p", { text: "Abre esta carpeta con un servidor local (por ejemplo, python -m http.server 8000) y entra a http://localhost:8000." }))));
  }

  /* ---------- Bloques del flujograma (mismo marcado que el flujograma) ---------- */
  function bloque(b, ev) {
    if (b.p) return h("p", { text: b.p });
    if (b.nota) return h("p", { class: "nota", text: b.nota });
    if (b.lista) return h("ul", {}, b.lista.map(function (t) { return h("li", { text: t }); }));
    if (b.cols) return h("div", { class: "cols" }, b.cols.map(function (c) {
      var m = c.aplica ? c.aplica.indexOf(ev) !== -1 : null;
      return h("div", { class: "col" + (m === true ? " activa" : m === false ? " inactiva" : "") },
        h("span", { class: "tucaso", text: "Tu caso" }), h("strong", { text: c.titulo }), h("p", { text: c.texto }));
    }));
    return null;
  }

  function ramas(step, ev) {
    if (!step.ramas) return null;
    return h("div", { class: "ramas" }, step.ramas.map(function (r) {
      var m = r.aplica ? r.aplica.indexOf(ev) !== -1 : null;
      return h("div", { class: "rama" + (m === true ? " activa" : m === false ? " inactiva" : "") },
        h("span", { class: "tucaso", text: "Tu caso" }), h("strong", { text: r.etiqueta }), h("p", { text: r.texto }));
    }));
  }

  /* ---------- Etapas y pertinencia: recorrido con comparativa ---------- */
  function recorrido(flujo, caso) {
    var ev = caso.evento;
    var pasos = [].concat.apply([], flujo.capitulos.map(function (c) { return c.pasos; }));
    var plazos = {};
    flujo.plazos.forEach(function (p) { plazos[p.id] = p; });
    var info = {}, crit = {};
    caso.pasos.forEach(function (p) { info[p.id] = p; });
    caso.criticos.forEach(function (c) { crit[c.id] = c; });

    var cuenta = { aplica: 0, "no-aplica": 0, validar: 0 };
    var todos = [], numero = 0;
    var ol = h("ol", { class: "ruta" });

    pasos.forEach(function (s, i) {
      var d = info[s.id];
      cuenta[d.estado]++;
      if (s.tipo !== "decision") numero++;

      var chips = [h("span", { class: "chip", text: s.ref })];
      if (d.estado === "aplica") chips.push(h("span", { class: "chip si", text: "Aplica al caso" }));
      if (d.estado === "no-aplica") chips.push(h("span", { class: "chip noaplica", text: "No aplica al caso" }));
      if (d.estado === "validar") chips.push(h("span", { class: "chip validar", text: "Por validar" }));
      if (d.fecha) chips.push(h("span", { class: "chip plazo", text: d.fecha }));
      if (crit[s.id]) chips.push(h("span", { class: "chip critico", text: "Paso crítico" }));

      var cuerpo;
      if (vista === "etapas") {
        var izq = h("section", { class: "lado" }, h("h4", { text: "Lo que dice el flujograma" }),
          h("p", { class: "plazo-txt", text: s.resumen }), ramas(s, ev),
          (s.contenido || []).map(function (b) { return bloque(b, ev); }));
        var der = h("section", { class: "lado caso" }, h("h4", { text: "En el caso de Rodrigo" }),
          h("p", { text: d.caso }), h("p", { class: "debe" }, h("strong", { text: "Debe quedar: " }), d.entregable));
        cuerpo = h("div", { class: "cuerpo comparativa" }, izq, der);
      } else {
        cuerpo = h("div", { class: "cuerpo trio" },
          h("section", {}, h("h4", { text: "Qué exige la norma" }), h("p", { text: s.resumen + " (" + s.ref + ")" })),
          h("section", {}, h("h4", { text: "Por qué es pertinente" }), h("p", { text: d.pertinencia })),
          h("section", { class: "omision" }, h("h4", { text: "Si se omite" }), h("p", { text: d.omision })));
      }

      var btn = h("button", { type: "button", class: "cabeza", id: "btn-" + s.id, "aria-expanded": "false", "aria-controls": "panel-" + s.id },
        h("span", { class: "cabeza-txt" }, h("span", { class: "titulo", text: s.titulo }),
          h("span", { class: "resumen-paso", text: vista === "etapas" ? d.caso : d.pertinencia }),
          h("span", { class: "chips" }, chips)),
        h("span", { class: "chev", "aria-hidden": "true" }));
      var inner = h("div", { class: "panel-in" }, cuerpo);
      inner.inert = true;
      var panel = h("div", { class: "panel", id: "panel-" + s.id, role: "region", "aria-labelledby": "btn-" + s.id }, inner);
      var tarjeta = h("div", { class: "tarjeta" }, h("h3", {}, btn), panel);
      var marca = h("span", { class: "marca", "aria-hidden": "true" }, s.tipo === "decision" ? h("span", { text: "?" }) : String(numero));
      var li = h("li", { class: "paso", id: s.id, style: "--i:" + i,
        dataset: { tipo: s.tipo, fuente: s.fuente, estado: d.estado === "no-aplica" ? "off" : "on" } }, marca, tarjeta);

      var abrir = function (v) {
        btn.setAttribute("aria-expanded", String(v)); panel.classList.toggle("abierto", v);
        tarjeta.classList.toggle("abierta", v); inner.inert = !v;
        if (v) li.classList.add("visto");
      };
      btn.addEventListener("click", function () { abrir(btn.getAttribute("aria-expanded") !== "true"); });
      todos.push(abrir);
      ol.append(li);
    });

    var boton = h("button", { type: "button", class: "boton", text: "Expandir todo" });
    var abiertos = false;
    boton.addEventListener("click", function () {
      abiertos = !abiertos; todos.forEach(function (f) { f(abiertos); });
      boton.textContent = abiertos ? "Contraer todo" : "Expandir todo";
    });
    var resumen = cuenta.aplica + " de " + pasos.length + " pasos aplican al caso. ";

    var frag = h("div", {}, h("div", { class: "resumen-fila" }, h("p", { class: "resumen", text: resumen }), boton), ol);
    if (location.hash) setTimeout(function () {
      var b = document.querySelector(location.hash + " .cabeza");
      if (b) { b.click(); b.scrollIntoView({ block: "center" }); }
    }, 50);
    return frag;
  }

  /* ---------- El caso ---------- */
  function vistaCaso(c) {
    var lista = function (t, arr) { return h("section", {}, h("h2", { text: t }), h("ul", {}, arr.map(function (x) { return h("li", { text: x }); }))); };
    return h("div", {},
      h("section", { class: "bloque" }, h("h2", { text: "El relato" }), c.relato.map(function (p) { return h("p", { text: p }); })),
      h("dl", { class: "datos" }, c.datos.map(function (d) { return h("div", {}, h("dt", { text: d[0] }), h("dd", { text: d[1] })); })),
      h("div", { class: "callout" }, h("strong", { text: "Por qué es grave" }), h("p", { text: c.clasificacion })),
      h("section", { class: "bloque" }, h("h2", { text: "Plazos que corren desde el 15 de abril" }),
        h("ol", { class: "linea" }, c.linea.map(function (l) {
          return h("li", {}, h("span", { class: "fecha", text: l[0] }), h("div", {}, h("strong", { text: l[1] }), h("p", { text: l[2] })));
        }))),
      h("div", { class: "doscol" }, lista("Supuestos del análisis", c.supuestos), lista("Lo que el caso no dice", c.faltantes)));
  }

  /* ---------- Pasos críticos ---------- */
  function vistaCriticos(flujo, caso) {
    var nombre = {};
    flujo.capitulos.forEach(function (c) { c.pasos.forEach(function (p) { nombre[p.id] = p; }); });
    return h("div", { class: "crit-grid" }, caso.criticos.map(function (c) {
      var s = nombre[c.id];
      return h("article", { class: "crit " + (c.nivel === "Alto" ? "alto" : "medio") },
        h("div", { class: "crit-top" }, h("h2", { text: s.titulo }), h("span", { class: "chip critico", text: "Riesgo " + c.nivel.toLowerCase() })),
        h("h4", { text: "Qué se puede malinterpretar" }), h("p", { text: c.mal }),
        h("h4", { text: "Consecuencia" }), h("p", { text: c.cons }),
        h("h4", { text: "Cómo evitarlo" }), h("p", { text: c.como }),
        h("a", { class: "ver", href: "etapas.html#" + c.id, text: "Ver este paso en el caso (" + s.ref + ")" }));
    }));
  }

  /* ---------- Reflexión ---------- */
  function vistaReflexion(r) {
    var KEY = "reflexion-1401";
    var guardado = "";
    try { guardado = localStorage.getItem(KEY) || ""; } catch (e) {}
    var area = h("textarea", { id: "texto", rows: "10", placeholder: "Escribe aquí tu reflexión con tus palabras." });
    area.value = guardado;
    var cont = h("p", { class: "ayuda", "aria-live": "polite" });
    var contar = function () {
      var n = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
      cont.textContent = n + " palabras. Se guarda en este navegador mientras escribes.";
    };
    area.addEventListener("input", function () { contar(); try { localStorage.setItem(KEY, area.value); } catch (e) {} });
    contar();
    return h("div", {}, h("p", { class: "ayuda", text: r.intro }),
      h("div", { class: "ideas" }, r.ideas.map(function (i) { return h("article", { class: "idea" }, h("h2", { text: i[0] }), h("p", { text: i[1] })); })),
      h("section", { class: "bloque" }))}

  /* ---------- Carga ---------- */
  Promise.all([fetch("data.json").then(function (r) { return r.json(); }), fetch("caso.json").then(function (r) { return r.json(); })])
    .then(function (d) {
      var flujo = d[0], caso = d[1], cuerpo;
      if (vista === "caso") cuerpo = vistaCaso(caso.caso);
      else if (vista === "etapas" || vista === "pertinencia") cuerpo = recorrido(flujo, caso);
      else if (vista === "criticos") cuerpo = vistaCriticos(flujo, caso);
      else cuerpo = vistaReflexion(caso.reflexion);
      document.title = TITULOS[vista][0] + " | Resolución 1401 de 2007";
      app.append(cabecera(), h("main", { class: "pagina" }, cuerpo, pager()));
      var imp = document.querySelector("button.boton[type=button]");
      if (vista === "reflexion" && imp) imp.addEventListener("click", function () { window.print(); });
    })
    .catch(error);
})();

(function () {
  const $ = (sel) => document.querySelector(sel);

  const origenSel = $("#origen");
  const destinoSel = $("#destino");
  const cfSel = $("#cf");
  const trmInput = $("#trm");
  const impuestoSel = $("#impuesto");
  const fomentoInput = $("#fomento");
  const btnDescargar = $("#btn-descargar");
  const rutaInvalida = $("#ruta-invalida");
  const emptyState = $("#empty-state");
  const rutaLinea = $("#ruta-linea");
  const tarjetas = $("#tarjetas");
  const avisoCombinada = $("#aviso-combinada");
  const tbody = $("#out-detalle-body");
  const panelTabla = $("#panel-tabla");
  const btnTabla = $("#btn-tabla");
  const cajaMapa = $("#caja-mapa");
  const notaOmitidos = $("#nota-omitidos");

  // Copia de lo que se pinto en la tabla, para poder dibujarlo en el PNG sin
  // depender de si el panel esta desplegado o de que filas estan plegadas.
  let tablaParaImagen = [];
  let contextoTabla = null;

  // Tarjetas de total: mismos decimales que la tabla (1 en COP, 2 en USD)
  const fmtCOP = (n) =>
    "$ " + n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtUSD = (n) =>
    "USD " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n) => (n * 100).toLocaleString("es-CO", { maximumFractionDigits: 2 }) + "%";
  // En la tabla los importes van mas cortos que en las tarjetas, para que
  // quepan las seis columnas sin desplazamiento lateral.
  // El simbolo va envuelto para poder ocultarlo en pantallas muy angostas: el
  // encabezado de la columna ya dice la moneda, y sin el las cifras caben sin
  // desbordarse. El separador es un espacio DURO ( ): con uno normal la
  // celda partia en dos lineas ("$" arriba y la cifra abajo).
  const copTabla = (n) =>
    '<span class="sim">$ </span>'
    + n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const usdTabla = (n) =>
    '<span class="sim">USD </span>'
    + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // La calculadora arranca SIN origen ni destino: la primera opcion es un
  // marcador de posicion vacio, para que el usuario elija a proposito.
  function fillSelect(sel, options, textoVacio) {
    sel.innerHTML = "";
    const vacia = document.createElement("option");
    vacia.value = "";
    vacia.textContent = textoVacio;
    sel.appendChild(vacia);
    options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    sel.value = "";
  }

  fillSelect(origenSel, Tarifas.nodes, "— Elige el origen —");
  fillSelect(destinoSel, Tarifas.nodes, "— Elige el destino —");

  // --- Mapa: clic en un punto alterna entre asignar Origen y Destino ---
  const modoLabel = $("#mapa-modo");
  let proximoClic = "origen";

  function actualizarModo() {
    modoLabel.textContent = proximoClic === "origen" ? "Origen" : "Destino";
  }

  Mapa.init($("#mapa"), {
    onSeleccion(nodo) {
      const otro = proximoClic === "origen" ? destinoSel : origenSel;
      // evita dejar origen y destino en el mismo punto
      if (otro.value === nodo) {
        proximoClic = proximoClic === "origen" ? "destino" : "origen";
      }
      (proximoClic === "origen" ? origenSel : destinoSel).value = nodo;
      proximoClic = proximoClic === "origen" ? "destino" : "origen";
      actualizarModo();
      calcularYRenderizar();
    },
  });
  actualizarModo();

  // ---- Detalle de la tarifa: se despliega en su sitio, no flota ----
  function mostrarTabla(visible) {
    panelTabla.hidden = !visible;
    btnTabla.setAttribute("aria-expanded", String(visible));
    btnTabla.textContent = visible ? "Ocultar detalle" : "Ver detalle de la tarifa";
  }

  // ---- Armado de la tabla ----
  // El nombre de cada columna viaja en data-col: en el telefono la tabla se
  // apila y el CSS lo usa como etiqueta de cada dato, para que se lea completa
  // sin barra de desplazamiento.
  const COLUMNAS = ["Tramo", "Transportador", "Fijos", "Variables", "AOM", "T. tramo"];

  const sinEtiquetas = (s) => String(s).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const fila = (celdas, clase) => {
    const tr = document.createElement("tr");
    if (clase) tr.className = clase;
    tr.innerHTML = celdas
      .map((c, i) => `<td${i >= 2 ? ' class="num"' : ""} data-col="${COLUMNAS[i]}">${c}</td>`)
      .join("");
    tbody.appendChild(tr);
    tablaParaImagen.push({ celdas: celdas.map(sinEtiquetas), clase: clase || "" });
    return tr;
  };

  const separador = () => {
    const tr = document.createElement("tr");
    tr.className = "fila-separadora";
    tr.innerHTML = '<td colspan="6"></td>';
    tbody.appendChild(tr);
  };

  // Bloque de un transportador: estampilla, fomento e impuesto.
  function filasDeTransportador(t, clase) {
    const est = t.estampillaDetalle;
    fila([
      "Estampilla", t.transportador,
      est ? copTabla(est.fijos) : "—",
      est ? copTabla(est.variables) : "—",
      est ? copTabla(est.aom) : "—",
      copTabla(t.estampilla),
    ], clase);
    fila([
      `Cuota de fomento <span class="muted">(${fmtPct(t.fomentoPct)})</span>`,
      t.transportador, "", "", "", copTabla(t.fomentoCOP),
    ], clase);
    fila([
      `Imp. Transporte <span class="muted">(${fmtPct(t.impuestoPct)})</span>`,
      t.transportador, "", "", "", copTabla(t.impuestoCOP),
    ], clase);
  }

  // Estado sin ruta: solo el mensaje de la cabecera y el mapa.
  function mostrarVacio(mensajeDeError) {
    contextoTabla = null;
    notaOmitidos.hidden = true;
    rutaLinea.hidden = true;
    btnTabla.hidden = true;
    tarjetas.hidden = true;
    avisoCombinada.hidden = true;
    emptyState.hidden = Boolean(mensajeDeError);
    rutaInvalida.hidden = !mensajeDeError;
    if (mensajeDeError) rutaInvalida.textContent = mensajeDeError;
    mostrarTabla(false);
  }

  function calcularYRenderizar() {
    const origen = origenSel.value;
    const destino = destinoSel.value;
    const cf = parseFloat(cfSel.value);
    const trm = parseFloat(trmInput.value) || 0;
    // Estos dos parametros aplican solo a TGI; PROMIGAS usa sus porcentajes
    // fijos definidos en Tarifas.config.
    const impuestoPctTGI = parseFloat(impuestoSel.value);
    const fomentoPctTGI = (parseFloat(fomentoInput.value) || 0) / 100;

    // sin los dos extremos no hay nada que calcular; el mapa queda limpio
    // pero visible, para poder seguir eligiendo sobre el
    if (!origen || !destino) {
      mostrarVacio(null);
      Mapa.actualizar({ origen, destino, edges: [] });
      pintarZoom(Mapa.estadoZoom());
      return;
    }

    const r = Tarifas.calcular({ origen, destino, cf, trm, impuestoPctTGI, fomentoPctTGI });

    if (!r.ok) {
      mostrarVacio(
        r.reason === "ORIGEN_IGUAL_DESTINO"
          ? "El origen y el destino no pueden ser el mismo punto."
          : "No fue posible armar la ruta entre el origen y el destino seleccionados."
      );
      Mapa.actualizar({ origen, destino, edges: [] });
      pintarZoom(Mapa.estadoZoom());
      return;
    }

    rutaInvalida.hidden = true;
    emptyState.hidden = true;
    rutaLinea.hidden = false;
    btnTabla.hidden = false;
    tarjetas.hidden = false;

    const { detalle, porTransportador, totales, combinada } = r;

    // Ruta combinada: origen y destino en redes distintas, cada uno se lleva
    // hasta el punto de entrada de su propia red y se suman los dos tramos.
    if (combinada) {
      avisoCombinada.hidden = false;
      avisoCombinada.innerHTML =
        `<strong>Ruta combinada.</strong> ${combinada.origen.punto} y ${combinada.destino.punto} ` +
        `no estan en la misma red, asi que se suman dos rutas: ` +
        `<em>${combinada.origen.punto} → ${combinada.origen.entrada}</em> (${combinada.origen.red}, ` +
        `${combinada.origen.tramos} tramo${combinada.origen.tramos === 1 ? "" : "s"}) y ` +
        `<em>${combinada.destino.entrada} → ${combinada.destino.punto}</em> (${combinada.destino.red}, ` +
        `${combinada.destino.tramos} tramo${combinada.destino.tramos === 1 ? "" : "s"}). ` +
        `Se cobran las dos estampillas, las dos cuotas de fomento y los dos impuestos.`;
    } else {
      avisoCombinada.hidden = true;
    }

    $("#out-total-cop").textContent = fmtCOP(totales.totalCOP);
    $("#out-total-usd").textContent = fmtUSD(totales.totalUSD);
    // La ruta se muestra completa: si no cabe en una linea, sigue en las
    // siguientes en vez de recortarse.
    $("#out-ruta").textContent = detalle.map((d) => d.ruta).join("  →  ");

    // ---- Tabla ----
    tbody.innerHTML = "";
    tbody.classList.remove("detalle-plegado");
    tablaParaImagen = [];

    // 1) un renglon por tramo de la ruta.
    // Los tramos sin tarifa (los del valle de Aburra y Gualanday-Montanuelo)
    // no se listan: solo ensucian la tabla. Siguen contando en la ruta y en el
    // mapa, y su aporte es despreciable.
    //
    // Ojo: en la hoja TRAMOS esos tramos NO estan en cero exacto, llevan
    // 0.00001 como marcador de "sin tarifa asignada". Por eso el criterio es
    // lo que se mostraria (un decimal), no una comparacion contra cero.
    const SIN_TARIFA = 0.05;   // por debajo de esto, la celda diria "$ 0,0"
    const conCargo = detalle.filter(
      (d) => d.fijoPonderado + d.variablePonderado + d.aomIncluido >= SIN_TARIFA);
    const omitidos = detalle.length - conCargo.length;

    // El nombre va en tres partes para que en el telefono el origen quede en
    // una linea y el destino en la siguiente, en vez de partirse a la mitad de
    // una palabra. El separador se oculta ahi, pero sigue en el texto plano
    // que se usa para el PNG.
    const nombreTramo = (d) =>
      `<span class="tramo-o">${d.origen}</span>` +
      `<span class="tramo-sep"> - </span>` +
      `<span class="tramo-d">${d.destino}</span>`;

    conCargo.forEach((d) => {
      fila([
        nombreTramo(d),
        d.transportador,
        copTabla(d.fijoPonderado),
        copTabla(d.variablePonderado),
        copTabla(d.aomIncluido),
        copTabla(d.fijoPonderado + d.variablePonderado + d.aomIncluido),
      ]);
    });

    notaOmitidos.hidden = omitidos === 0;
    notaOmitidos.textContent = omitidos === 0 ? "" :
      `No se listan ${omitidos} tramo${omitidos === 1 ? "" : "s"} sin tarifa ` +
      `asignada; sí aparecen en la ruta y en el mapa.`;

    const subtotalTramos = totales.fijosTotal + totales.variablesTotal + totales.aomTotal;
    fila([
      "Subtotal (COP)", "",
      copTabla(totales.fijosTotal),
      copTabla(totales.variablesTotal),
      copTabla(totales.aomTotal),
      copTabla(subtotalTramos),
    ], "fila-subtotal");

    // 2) cargos por transportador.
    // La cuota de fomento y el impuesto se liquidan sobre la base completa del
    // transportador, no por componente, asi que su importe va solo en la
    // columna de total: repartirlo entre Fijos/Variables/AOM seria inventar.
    separador();
    const variosTransportadores = porTransportador.length > 1;

    if (variosTransportadores) {
      // Con dos transportadores el detalle son seis renglones: se pliega y se
      // dejan a la vista solo los totales de cada concepto.
      tbody.classList.add("detalle-plegado");
      const tr = fila([
        '<span class="chevron" aria-hidden="true">▸</span> Detalle por transportador',
        "", "", "", "", "",
      ], "fila-toggle");
      tr.setAttribute("role", "button");
      tr.setAttribute("tabindex", "0");
      const alternar = () => {
        const plegado = tbody.classList.toggle("detalle-plegado");
        tr.querySelector(".chevron").textContent = plegado ? "▸" : "▾";
      };
      tr.addEventListener("click", alternar);
      tr.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); alternar(); }
      });
    }

    porTransportador.forEach((t, i) => {
      if (variosTransportadores && i > 0) separador();
      filasDeTransportador(t, variosTransportadores ? "fila-transp" : "");
    });

    const sumaEst = (campo) =>
      porTransportador.reduce((s, t) => s + (t.estampillaDetalle ? t.estampillaDetalle[campo] : 0), 0);
    const fijosConEstampilla = totales.fijosTotal + sumaEst("fijos");
    const variablesConEstampilla = totales.variablesTotal + sumaEst("variables");
    const aomConEstampilla = totales.aomTotal + sumaEst("aom");

    if (variosTransportadores) {
      // Totales de cada concepto, sumando los dos transportadores
      separador();
      const cuales = porTransportador.map((t) => t.transportador).join(" + ");
      fila([
        "T. Estampilla", cuales,
        copTabla(sumaEst("fijos")),
        copTabla(sumaEst("variables")),
        copTabla(sumaEst("aom")),
        copTabla(totales.estampillasTotal),
      ], "fila-total-concepto");
      fila([
        "T. Cuota de fomento", cuales, "", "", "", copTabla(totales.fomentoCOP),
      ], "fila-total-concepto");
      fila([
        "T. Impuesto", cuales, "", "", "", copTabla(totales.impuestoCOP),
      ], "fila-total-concepto");
    }

    // 3) total y equivalente en dolares.
    // Cada columna suma exactamente lo que tiene encima: los tramos MAS las
    // estampillas. La cuota de fomento y el impuesto no tienen desglose por
    // componente, asi que solo entran en la ultima columna — por eso el total
    // de la derecha es mayor que la suma de las tres columnas de la izquierda.
    separador();
    fila([
      "Total (COP)", "",
      copTabla(fijosConEstampilla),
      copTabla(variablesConEstampilla),
      copTabla(aomConEstampilla),
      copTabla(totales.totalCOP),
    ], "fila-total");

    separador();
    const usd = (v) => (trm ? usdTabla(v / trm) : "—");
    fila([
      "USD", "",
      usd(fijosConEstampilla),
      usd(variablesConEstampilla),
      usd(aomConEstampilla),
      usd(totales.totalCOP),
    ], "fila-usd");

    contextoTabla = {
      origen, destino, trm,
      cf: Math.round(cf * 100),
      cv: Math.round((1 - cf) * 100),
    };

    Mapa.actualizar({ origen, destino, edges: r.edges, combinada });
    pintarZoom(Mapa.estadoZoom());
  }

  // ---- Caja de referencias del mapa: se pliega y se despliega ----
  $("#btn-caja-mapa").addEventListener("click", () => {
    const plegada = cajaMapa.classList.toggle("plegada");
    $("#btn-caja-mapa").setAttribute("aria-expanded", String(!plegada));
  });

  // ---- Bloque de cargos de TGI: plegado por defecto ----
  const btnTgi = $("#btn-tgi");
  const cuerpoTgi = $("#cuerpo-tgi");
  btnTgi.addEventListener("click", () => {
    const abierto = cuerpoTgi.hidden;
    cuerpoTgi.hidden = !abierto;
    btnTgi.setAttribute("aria-expanded", String(abierto));
    btnTgi.querySelector(".chevron").textContent = abierto ? "▾" : "▸";
  });

  // ---- Notas flotantes (cargos de TGI y combinaciones de %CF) ----
  // Las dos se comportan igual: las abre su boton de informacion y se cierran
  // al hacer clic fuera o con Escape.
  const notas = [
    { caja: $("#nota-tgi"), boton: $("#btn-info-tgi") },
    { caja: $("#nota-cf"), boton: $("#btn-info-cf") },
  ];

  function mostrarNota(nota, visible) {
    nota.caja.hidden = !visible;
    nota.boton.setAttribute("aria-expanded", String(visible));
  }
  const cerrarNotas = () => notas.forEach((n) => mostrarNota(n, false));

  notas.forEach((nota) => {
    nota.boton.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      const abrir = nota.caja.hidden;
      cerrarNotas();
      if (abrir) mostrarNota(nota, true);
    });
    nota.caja.querySelector("[data-cerrar-nota]")
      .addEventListener("click", () => mostrarNota(nota, false));
  });

  document.addEventListener("click", (ev) => {
    notas.forEach((n) => {
      if (!n.caja.hidden && !n.caja.contains(ev.target) && ev.target !== n.boton) {
        mostrarNota(n, false);
      }
    });
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") cerrarNotas();
  });

  // ---- Detalle de la tarifa ----
  btnTabla.addEventListener("click", () => mostrarTabla(panelTabla.hidden));

  // ---- Zoom del mapa sobre la ruta ----
  const zoomCaja = $("#zoom-mapa");
  const zoomNivel = $("#zoom-nivel");
  const btnMas = $("#btn-zoom-mas");
  const btnMenos = $("#btn-zoom-menos");

  function pintarZoom(estado) {
    zoomCaja.hidden = !estado.hayRuta;
    zoomNivel.textContent = `${estado.nivel}/${estado.maximo}`;
    btnMas.disabled = !estado.puedeAcercar;
    btnMenos.disabled = !estado.puedeAlejar;

    // los botones van justo debajo del localizador, que se dibuja dentro del
    // SVG y cambia de tamano con el ancho disponible
    const marco = document.querySelector(".mapa-marco");
    const loc = Mapa.rectLocalizador();
    if (loc && marco && loc.width) {
      const r = marco.getBoundingClientRect();
      zoomCaja.style.top = Math.round(loc.bottom - r.top + 8) + "px";
      zoomCaja.style.right = Math.round(r.right - loc.right) + "px";
    }
  }

  btnMas.addEventListener("click", () => pintarZoom(Mapa.zoom(1)));
  btnMenos.addEventListener("click", () => pintarZoom(Mapa.zoom(-1)));

  // ---- TRM del dia ----
  // Se consulta la TRM oficial (Datos Abiertos Colombia) y se pone en el campo,
  // que sigue siendo editable: si el usuario la cambia, no se vuelve a pisar.
  // Si la consulta falla, se queda el valor que ya estaba y se avisa.
  const TRM_URL =
    "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";
  const trmNota = $("#trm-nota");
  let trmTocadaPorUsuario = false;

  trmInput.addEventListener("input", () => {
    trmTocadaPorUsuario = true;
    trmNota.classList.remove("error");
    trmNota.textContent = "Valor ingresado manualmente.";
  });

  function cargarTRM() {
    fetch(TRM_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then((filas) => {
        const fila = filas && filas[0];
        const valor = fila && parseFloat(fila.valor);
        if (!valor || !isFinite(valor)) throw new Error("respuesta sin valor");

        const desde = new Date(fila.vigenciadesde);
        const fecha = isNaN(desde) ? "" : desde.toLocaleDateString("es-CO",
          { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

        // si el usuario ya escribio su propia TRM, no se le pisa
        if (trmTocadaPorUsuario) {
          trmNota.textContent = `TRM oficial del ${fecha}: ` +
            `${valor.toLocaleString("es-CO", { minimumFractionDigits: 2 })} (no aplicada).`;
          return;
        }

        trmInput.value = valor;
        trmNota.classList.remove("error");
        trmNota.textContent = `TRM oficial del ${fecha}. Puedes cambiarla.`;
        calcularYRenderizar();
      })
      .catch(() => {
        trmNota.classList.add("error");
        trmNota.textContent =
          "No se pudo consultar la TRM del dia; se usa el valor de arriba.";
      });
  }

  cargarTRM();

  // ---- Descargar la tabla como imagen ----
  // Se dibuja a mano en un canvas en vez de convertir el DOM: no necesita
  // librerias externas (el sitio no tiene ninguna) y el resultado es el mismo
  // en todos los navegadores.
  const PNG = {
    escala: 2,           // se dibuja al doble y se exporta nitido
    padding: 18,
    altoFila: 26,
    altoCabecera: 30,
    fuente: '"Segoe UI", system-ui, sans-serif',
  };

  function nombreArchivo() {
    const limpio = (s) => String(s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // sin tildes
      .replace(/[^A-Za-z0-9_]+/g, "");                     // sin espacios ni signos
    const c = contextoTabla;
    return `${limpio(c.origen)}-${limpio(c.destino)}_${c.cf}-${c.cv}_${c.trm}.png`;
  }

  function dibujarTabla() {
    const c = contextoTabla;
    // La imagen refleja lo que se esta viendo: si el detalle por transportador
    // esta plegado, tampoco sale en el PNG. El renglon que pliega/despliega no
    // se dibuja nunca: es un control, no un dato.
    const plegado = tbody.classList.contains("detalle-plegado");
    const filas = tablaParaImagen.filter((f) =>
      !f.clase.includes("fila-toggle")
      && !(plegado && f.clase.includes("fila-transp")));
    const lienzo = document.createElement("canvas");
    const g = lienzo.getContext("2d");
    const s = PNG.escala;

    // 1) medir: el ancho de cada columna sale del texto mas largo
    g.font = `700 13px ${PNG.fuente}`;
    const anchos = COLUMNAS.map((t) => g.measureText(t).width);
    g.font = `12px ${PNG.fuente}`;
    filas.forEach((f) => f.celdas.forEach((texto, i) => {
      anchos[i] = Math.max(anchos[i], g.measureText(texto).width);
    }));
    const anchoCol = anchos.map((a) => Math.ceil(a) + 18);
    const ancho = anchoCol.reduce((a, b) => a + b, 0) + PNG.padding * 2;

    const alturaTitulo = 54;
    const alto = PNG.padding * 2 + alturaTitulo + PNG.altoCabecera
      + filas.length * PNG.altoFila + 26;

    lienzo.width = ancho * s;
    lienzo.height = alto * s;
    g.scale(s, s);

    // 2) fondo
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, ancho, alto);

    // 3) titulo
    let y = PNG.padding + 16;
    g.fillStyle = "#16283f";
    g.font = `700 15px ${PNG.fuente}`;
    g.textAlign = "left";
    g.fillText(`${c.origen}  \u2192  ${c.destino}`, PNG.padding, y);
    y += 19;
    g.fillStyle = "#64748b";
    g.font = `11px ${PNG.fuente}`;
    const trmTexto = Number(c.trm).toLocaleString("es-CO", { maximumFractionDigits: 2 });
    g.fillText(`${c.cf}% Fijo / ${c.cv}% Variable  \u00b7  TRM ${trmTexto}  \u00b7  `
      + new Date().toLocaleDateString("es-CO"), PNG.padding, y);
    y += 20;

    // 4) cabecera
    const xDe = [];
    let x = PNG.padding;
    anchoCol.forEach((w) => { xDe.push(x); x += w; });

    g.fillStyle = "#f5f7fa";
    g.fillRect(PNG.padding, y, ancho - PNG.padding * 2, PNG.altoCabecera);
    g.fillStyle = "#16283f";
    g.font = `700 11px ${PNG.fuente}`;
    COLUMNAS.forEach((titulo, i) => {
      g.textAlign = i >= 2 ? "right" : "left";
      const px = i >= 2 ? xDe[i] + anchoCol[i] - 9 : xDe[i] + 9;
      g.fillText(titulo.toUpperCase(), px, y + PNG.altoCabecera / 2 + 4);
    });
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(PNG.padding, y + PNG.altoCabecera + 0.5);
    g.lineTo(ancho - PNG.padding, y + PNG.altoCabecera + 0.5);
    g.stroke();
    y += PNG.altoCabecera;

    // 5) filas, respetando el realce de subtotales, totales y USD
    filas.forEach((f) => {
      const total = f.clase.includes("fila-total") && !f.clase.includes("concepto");
      const resalta = f.clase.includes("fila-subtotal") || f.clase.includes("fila-total")
        || f.clase.includes("fila-usd") || f.clase.includes("fila-toggle");

      if (resalta) {
        g.fillStyle = total ? "#e9eef5" : "#f5f7fa";
        g.fillRect(PNG.padding, y, ancho - PNG.padding * 2, PNG.altoFila);
      }

      const negrita = resalta;
      const color = f.clase.includes("fila-usd") ? "#0f2544" : "#16283f";
      f.celdas.forEach((texto, i) => {
        if (!texto) return;
        g.fillStyle = i === 1 ? "#64748b" : color;
        g.font = `${negrita ? 700 : 400} 12px ${PNG.fuente}`;
        g.textAlign = i >= 2 ? "right" : "left";
        const px = i >= 2 ? xDe[i] + anchoCol[i] - 9 : xDe[i] + 9;
        g.fillText(texto, px, y + PNG.altoFila / 2 + 4);
      });

      g.strokeStyle = total ? "#123a63" : "#e2e8f0";
      g.beginPath();
      g.moveTo(PNG.padding, y + PNG.altoFila + 0.5);
      g.lineTo(ancho - PNG.padding, y + PNG.altoFila + 0.5);
      g.stroke();
      y += PNG.altoFila;
    });

    // 6) pie
    g.fillStyle = "#94a3b8";
    g.font = `10px ${PNG.fuente}`;
    g.textAlign = "left";
    g.fillText("Calculadora de Tarifas de Transporte de Gas - SNT",
      PNG.padding, y + 16);

    return lienzo;
  }

  btnDescargar.addEventListener("click", () => {
    if (!contextoTabla || !tablaParaImagen.length) return;
    const lienzo = dibujarTabla();
    lienzo.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo();
      document.body.appendChild(a);
      a.click();
      a.remove();
      // se libera en el siguiente ciclo, ya iniciada la descarga
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, "image/png");
  });

  // No hay boton de calcular: cualquier cambio recalcula al vuelo.
  // "input" ademas de "change" para que los campos numericos respondan
  // mientras se escribe, sin esperar a que pierdan el foco.
  [origenSel, destinoSel, cfSel, impuestoSel].forEach((el) =>
    el.addEventListener("change", calcularYRenderizar)
  );
  [trmInput, fomentoInput].forEach((el) => {
    el.addEventListener("input", calcularYRenderizar);
    el.addEventListener("change", calcularYRenderizar);
  });

  // arranque: sin ruta elegida, solo el mapa
  calcularYRenderizar();
})();

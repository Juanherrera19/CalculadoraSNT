// Mapa del SNT sobre el croquis de Colombia.
//
// Dibuja el contorno del pais y sus departamentos (js/colombia.js), encima los
// gasoductos de TGI (rojo) y PROMIGAS (azul) usando la ubicacion geografica de
// cada punto (js/ubicaciones.js), y resalta la ruta calculada con un flujo
// animado que va del origen al destino.
//
// Los colores replican el mapa oficial del Sistema Nacional de Transporte.

const Mapa = (() => {
  const NS = "http://www.w3.org/2000/svg";

  const RADIO_PUNTO = 2.9;    // 30% mas pequenos que antes (eran 4.2)
  const RADIO_EXTREMO = 4.9;  // el origen y el destino (eran 7)
  const PASO_DIBUJO = 70;        // ms entre el arranque de un tramo y el siguiente
  const DURACION_DIBUJO = 260;   // ms que tarda en dibujarse cada tramo
  const MARGEN = 14;              // aire alrededor del croquis

  const NIVELES_ZOOM = 3;     // tres pasos de acercamiento sobre la ruta
  const PADDING_ZOOM = 26;    // aire alrededor de la ruta al acercarse

  let svg = null;
  let alClicNodo = null;
  let recorteBase = null;     // el encuadre completo, sin zoom
  let cajaRuta = null;        // caja de la ruta seleccionada
  let nivelZoom = 0;
  const punto = new Map();        // nodo -> {x, y, red}
  const nodoEl = new Map();       // nodo -> {grupo, circulo, etiqueta}
  const tramoEl = new Map();      // indice de tramo -> {base, flujo}

  // ---- Proyeccion: la misma que uso tools/generar_croquis.py ----
  function proyectar(lat, lon) {
    const p = COLOMBIA_GEO.proyeccion;
    return {
      x: (lon - p.lonMin) * p.kLon * p.escala,
      y: (p.latMax - lat) * p.escala,
    };
  }

  // ---- Trazado de los gasoductos ----
  // Un gasoducto real no va en linea recta entre sus extremos: rodea sierras,
  // sigue valles y bordea la costa. El trazo de cada tramo se arma en dos pasos:
  //
  //  1. Se toman los puntos de paso de TRAZADOS (js/ubicaciones.js) si el tramo
  //     tiene, leidos de la lamina oficial. Si no tiene, se inventa uno solo,
  //     desviado de la recta lo justo para que no se vea tieso; la desviacion
  //     sale de un hash del nombre del tramo (no de Math.random()), asi el
  //     dibujo es identico entre recargas y entre navegadores.
  //  2. Esa polilinea se suaviza con una spline de Catmull-Rom convertida a
  //     curvas de Bezier, que pasa exactamente por todos los puntos.
  // En la lamina la linea entre dos estaciones es una curva suave y larga, no
  // un zigzag menudo: por eso se generan MUY pocos puntos intermedios (uno o
  // dos por tramo) en vez de uno cada pocos pixeles.
  const TROZOS_MIN = 2;          // 1 punto intermedio -> una sola curva suave
  const TROZOS_MAX = 4;          // 3 puntos -> curva larga con dos inflexiones
  const LARGO_POR_TROZO = 55;    // px de tramo por cada trozo
  const AMPLITUD_MEANDRO = 0.11; // desvio, como fraccion del tramo
  const AMPLITUD_MAX = 8;        // tope del desvio, en px
  const TENSION = 0.5;           // suavidad de la spline (0.5 = Catmull-Rom clasica)

  // Referencia al relleno de Colombia, para poder comprobar si un punto del
  // trazo cayo en el mar. Se guarda al dibujar el croquis.
  let tierra = null;
  let puntoAux = null;

  function enTierra(x, y) {
    if (!tierra || !puntoAux) return true;
    puntoAux.x = x;
    puntoAux.y = y;
    return tierra.isPointInFill(puntoAux);
  }

  // Si el serpenteo saco un punto al mar, se devuelve hacia la recta hasta que
  // vuelva a tierra. Si ni siquiera la recta esta en tierra (tramos costeros),
  // se queda en la recta: nunca queda peor que antes de serpentear.
  function ajustarATierra(p, recto) {
    if (enTierra(p.x, p.y)) return p;
    for (let f = 0.6; f > 0; f -= 0.3) {
      const q = { x: recto.x + (p.x - recto.x) * f, y: recto.y + (p.y - recto.y) * f };
      if (enTierra(q.x, q.y)) return q;
    }
    return recto;
  }

  function ruido(texto, sal) {
    let h = 2166136261 ^ sal;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 2000) / 1000 - 1;   // a [-1, 1]
  }

  // Convierte la polilinea base (extremos + puntos de paso) en muchos puntos
  // con pequenos desvios alternos a lado y lado. Es lo que hace que el ducto
  // parezca una carretera y no una recta ni un arco: el desvio cambia de signo
  // varias veces a lo largo del tramo, en vez de curvarlo todo hacia un lado.
  function meandro(base, semilla) {
    const salida = [base[0]];
    for (let i = 0; i < base.length - 1; i++) {
      const p = base[i];
      const q = base[i + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const largo = Math.hypot(dx, dy) || 1;
      const nx = -dy / largo;
      const ny = dx / largo;
      const trozos = Math.max(TROZOS_MIN,
        Math.min(TROZOS_MAX, Math.round(largo / LARGO_POR_TROZO)));
      const amplitud = Math.min(largo * AMPLITUD_MEANDRO, AMPLITUD_MAX);

      for (let k = 1; k < trozos; k++) {
        const t = k / trozos;
        const recto = { x: p.x + dx * t, y: p.y + dy * t };
        // el desvio se apaga en los extremos para llegar derecho a cada punto
        // se amortigua solo cerca de los extremos, no en todo el tramo
        const peso = Math.min(1, Math.sin(Math.PI * t) * 1.8);
        // El lado se ALTERNA a proposito y solo la magnitud es aleatoria: con
        // desvios del todo al azar el tramo se arquea hacia un lado y parece un
        // ovalo. Alternando queda el zigzag suave de una carretera.
        const lado = k % 2 ? 1 : -1;
        const magnitud = 0.45 + 0.55 * Math.abs(ruido(semilla, i * 31 + k));
        const desvio = lado * magnitud * amplitud * peso;
        salida.push(ajustarATierra(
          { x: recto.x + nx * desvio, y: recto.y + ny * desvio }, recto));
      }
      salida.push(q);
    }
    return salida;
  }

  // Convierte una polilinea en una curva suave que pasa por todos sus puntos.
  function suavizar(puntos) {
    if (puntos.length < 2) return "";
    const n = (v) => v.toFixed(1);
    let d = `M${n(puntos[0].x)} ${n(puntos[0].y)}`;
    for (let i = 0; i < puntos.length - 1; i++) {
      const p0 = puntos[i - 1] || puntos[i];
      const p1 = puntos[i];
      const p2 = puntos[i + 1];
      const p3 = puntos[i + 2] || p2;
      const c1 = {
        x: p1.x + ((p2.x - p0.x) / 6) * TENSION * 2,
        y: p1.y + ((p2.y - p0.y) / 6) * TENSION * 2,
      };
      const c2 = {
        x: p2.x - ((p3.x - p1.x) / 6) * TENSION * 2,
        y: p2.y - ((p3.y - p1.y) / 6) * TENSION * 2,
      };
      d += ` C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(p2.x)} ${n(p2.y)}`;
    }
    return d;
  }

  function trazado(a, b, ruta) {
    const pasos = (typeof TRAZADOS !== "undefined" && TRAZADOS[ruta]) || null;
    const base = pasos && pasos.length
      ? [a, ...pasos.map((p) => proyectar(p.lat, p.lon)), b]
      : [a, b];
    const puntos = meandro(base, ruta);

    return {
      // el flujo animado necesita poder recorrer el trazo del origen al
      // destino aunque el tramo este guardado en el sentido contrario
      directo: suavizar(puntos),
      inverso: suavizar([...puntos].reverse()),
    };
  }

  function crear(tag, atributos, texto) {
    const el = document.createElementNS(NS, tag);
    Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  // Los nombres de los puntos van a un lado del circulo. Para que no se
  // salgan del mapa ni se pisen con las lineas, los del occidente se escriben
  // a la izquierda y los del oriente a la derecha.
  function ladoEtiqueta(x, nodo) {
    // las excepciones de ETIQUETAS_IZQUIERDA mandan sobre la regla general
    if (nodo && typeof ETIQUETAS_IZQUIERDA !== "undefined"
        && ETIQUETAS_IZQUIERDA.indexOf(nodo) !== -1) return "izquierda";
    return x > COLOMBIA_GEO.ancho * 0.62 ? "izquierda" : "derecha";
  }

  // Varios puntos estan a pocos kilometros entre si (el valle de Aburra, o
  // Apiay y Villavicencio), asi que a esta escala sus nombres se encimarian.
  // Se separan verticalmente solo dentro de cada grupo apretado, y el punto
  // se une a su nombre con una linea fina cuando queda desplazado.
  const SEPARACION = 11;       // px minimos entre dos nombres que se pisarian
  const CORRIMIENTO_MAX = 40;  // px que un nombre puede alejarse de su punto
  const PASADAS = 200;

  // Relajacion iterativa: en cada pasada se separan los pares que siguen
  // encimados. Se hace sobre todos los nombres del mismo lado a la vez (no por
  // grupos), porque al correr uno puede empezar a chocar con su vecino.
  // El ancho de cada nombre se MIDE del texto ya dibujado (no se estima), que
  // es lo unico que da un resultado exacto con tipografias distintas.
  function desapilarEtiquetas() {
    const items = [];
    nodoEl.forEach(({ etiqueta }, nodo) => {
      const p = punto.get(nodo);
      const ancho = etiqueta.getComputedTextLength() || nodo.length * 4.6;
      const izquierda = ladoEtiqueta(p.x, nodo) === "izquierda";
      items.push({
        p,
        base: p.y,
        y: p.y,
        x0: izquierda ? p.x - 9 - ancho : p.x + 9,
        x1: izquierda ? p.x - 9 : p.x + 9 + ancho,
      });
    });

    const seCruzan = (a, b) => a.x0 < b.x1 && b.x0 < a.x1;

    for (let pasada = 0; pasada < PASADAS; pasada++) {
      items.sort((a, b) => a.y - b.y);
      let movio = false;

      for (let i = 0; i < items.length - 1; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const hueco = b.y - a.y;
          if (hueco >= SEPARACION) break;      // los siguientes estan aun mas lejos
          if (!seCruzan(a, b)) continue;
          const empuje = (SEPARACION - hueco) / 2 + 0.01;
          a.y -= empuje;
          b.y += empuje;
          movio = true;
        }
      }
      if (!movio) break;

      items.forEach((it) => {
        it.y = Math.max(it.base - CORRIMIENTO_MAX,
                        Math.min(it.base + CORRIMIENTO_MAX, it.y));
      });
    }

    items.forEach((it) => { it.p.dy = it.y - it.base; });
  }

  // Aplica el corrimiento calculado y, si el nombre quedo lejos de su punto,
  // lo une con una linea fina.
  function colocarEtiquetas() {
    nodoEl.forEach(({ grupo, etiqueta }, nodo) => {
      const p = punto.get(nodo);
      const dy = p.dy || 0;
      const signo = ladoEtiqueta(p.x, nodo) === "izquierda" ? -1 : 1;
      etiqueta.setAttribute("y", (dy + 3.5).toFixed(1));

      const previa = grupo.querySelector(".punto-guia");
      if (previa) previa.remove();
      if (Math.abs(dy) > 2) {
        grupo.insertBefore(crear("line", {
          x1: signo * RADIO_PUNTO, y1: 0,
          x2: signo * 7.5, y2: dy.toFixed(1),
          class: "punto-guia",
        }), grupo.firstChild);
      }
    });
  }

  function init(elementoSvg, { onSeleccion } = {}) {
    svg = elementoSvg;
    alClicNodo = onSeleccion;
    svg.innerHTML = "";
    tierra = null;

    const ancho = COLOMBIA_GEO.ancho + MARGEN * 2;
    const alto = COLOMBIA_GEO.alto + MARGEN * 2;
    svg.setAttribute("viewBox", `${-MARGEN} ${-MARGEN} ${ancho} ${alto}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // ---- Croquis ----
    // Orden de dibujo: primero el contexto (paises vecinos), luego Colombia
    // encima, para que el pais quede destacado sobre el resto.
    const capaMapa = crear("g", { class: "mapa-croquis" });

    (COLOMBIA_GEO.vecinos || []).forEach((d) => {
      capaMapa.appendChild(crear("path", { d, class: "croquis-vecino" }));
    });

    COLOMBIA_GEO.pais.forEach((d) => {
      const relleno = crear("path", { d, class: "croquis-relleno" });
      // se guarda el primero: sirve para saber si un trazo se fue al mar
      if (!tierra) tierra = relleno;
      capaMapa.appendChild(relleno);
    });
    puntoAux = svg.createSVGPoint ? svg.createSVGPoint() : null;
    COLOMBIA_GEO.departamentos.forEach((d) => {
      capaMapa.appendChild(crear("path", { d, class: "croquis-depto" }));
    });
    COLOMBIA_GEO.pais.forEach((d) => {
      capaMapa.appendChild(crear("path", { d, class: "croquis-borde" }));
    });

    // el lago va despues del relleno de Venezuela para que se vea recortado
    if (COLOMBIA_GEO.lago) {
      capaMapa.appendChild(crear("path", { d: COLOMBIA_GEO.lago.d, class: "croquis-lago" }));
    }

    // Nombre del lago. El rotulo trae su posicion, su tipo y como se ancla al
    // punto; viene calculado en tools/generar_croquis.py.
    const capaRotulos = crear("g", { class: "mapa-rotulos" });
    const rotular = (info) => {
      (info && info.rotulos ? info.rotulos : []).forEach((r) => {
        capaRotulos.appendChild(crear("text", {
          x: r.x.toFixed(1),
          y: r.y.toFixed(1),
          class: `rotulo rotulo-${r.tipo}`,
          "text-anchor": r.anclaje,
        }, r.texto));
      });
    };

    rotular(COLOMBIA_GEO.lago);
    // mares y paises vecinos
    rotular({ rotulos: COLOMBIA_GEO.geograficos || [] });
    capaMapa.appendChild(capaRotulos);

    svg.appendChild(capaMapa);

    // ---- Ubicacion de cada punto ----
    TARIFAS_DATA.nodes.forEach((nodo) => {
      const u = UBICACIONES[nodo];
      if (!u) {
        console.warn(`Mapa: falta la ubicacion de "${nodo}" en js/ubicaciones.js`);
        return;
      }
      const { x, y } = proyectar(u.lat, u.lon);
      const red = (TARIFAS_DATA.segments.find(
        (s) => s.origen === nodo || s.destino === nodo) || {}).transportador;
      punto.set(nodo, { x, y, red });
    });

    // ---- Gasoductos ----
    // Cada tramo son dos lineas superpuestas: la base siempre visible, y encima
    // una linea punteada que solo se anima cuando el tramo esta en la ruta.
    const capaTramos = crear("g", { class: "mapa-tramos" });
    TARIFAS_DATA.segments.forEach((seg, i) => {
      const a = punto.get(seg.origen);
      const b = punto.get(seg.destino);
      if (!a || !b) return;

      const curva = trazado(a, b, seg.ruta);
      const base = crear("path", {
        d: curva.directo, class: `tramo-base tramo-${seg.transportador}`,
      });
      const flujo = crear("path", {
        d: curva.directo, class: `tramo-flujo tramo-${seg.transportador}`,
      });
      base.appendChild(crear("title", {}, `${seg.ruta} (${seg.transportador})`));

      capaTramos.appendChild(base);
      capaTramos.appendChild(flujo);
      tramoEl.set(i, { base, flujo, curva });
    });
    svg.appendChild(capaTramos);

    // ---- Puntos ----
    const capaNodos = crear("g", { class: "mapa-nodos" });
    punto.forEach((p, nodo) => {
      const izquierda = ladoEtiqueta(p.x, nodo) === "izquierda";
      const grupo = crear("g", {
        class: "mapa-nodo",
        transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`,
        tabindex: "0",
        role: "button",
        "aria-label": `Punto ${nodo}`,
      });
      // dos anillos concentricos para el ping de radar: solo se ven cuando el
      // punto es el origen o el destino (lo enciende el CSS)
      const ping1 = crear("circle", { r: RADIO_EXTREMO, class: "ping ping-1" });
      const ping2 = crear("circle", { r: RADIO_EXTREMO, class: "ping ping-2" });
      const circulo = crear("circle", { r: RADIO_PUNTO, class: `punto punto-${p.red}` });
      const etiqueta = crear("text", {
        x: (izquierda ? -9 : 9),
        y: 3.5,
        class: "punto-etiqueta",
        "text-anchor": izquierda ? "end" : "start",
      }, nodo);

      grupo.appendChild(ping1);
      grupo.appendChild(ping2);
      grupo.appendChild(circulo);
      grupo.appendChild(etiqueta);
      const u = UBICACIONES[nodo];
      grupo.appendChild(crear("title", {}, u && u.nota ? `${nodo} - ${u.nota}` : nodo));

      const seleccionar = () => alClicNodo && alClicNodo(nodo);
      grupo.addEventListener("click", seleccionar);
      grupo.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          seleccionar();
        }
      });

      capaNodos.appendChild(grupo);
      nodoEl.set(nodo, { grupo, circulo, etiqueta });
    });
    svg.appendChild(capaNodos);

    // getComputedTextLength() devuelve 0 mientras el navegador no haya hecho el
    // layout del SVG, y entonces el desapilado trabajaria con anchos inventados.
    // Por eso se mide despues, no aqui mismo, y se reintenta hasta que se pueda.
    //
    // Se programa por dos vias a proposito: requestAnimationFrame NO se ejecuta
    // mientras la pestana esta en segundo plano, y sin el respaldo por
    // temporizador el mapa se quedaria sin desapilar ni recortar hasta que el
    // usuario la mirara. La bandera evita que corra dos veces.
    let ajustado = false;
    const ajustarEtiquetas = (intentos = 0) => {
      if (ajustado) return;
      const alguna = nodoEl.values().next().value;
      const medible = !alguna || alguna.etiqueta.getComputedTextLength() > 0;
      if (!medible && intentos < 40) {
        programar(intentos + 1);
        return;
      }
      ajustado = true;
      desapilarEtiquetas();
      colocarEtiquetas();
      recortar();
    };
    function programar(intentos) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => ajustarEtiquetas(intentos));
      }
      setTimeout(() => ajustarEtiquetas(intentos), 40);
    }
    programar(0);
  }


  // ---- Recorte cuadrado sobre la zona donde hay red ----
  // La red ocupa poco mas de un tercio del pais, asi que mostrar el croquis
  // entero deja mucho vacio. Se recorta al cuadrado que envuelve todos los
  // puntos y sus nombres, y arriba a la derecha se dibuja un localizador con
  // el pais completo y un marco senalando la parte que se esta viendo.
  const PADDING_RECORTE = 20;   // aire alrededor del contenido
  const INSET_FRACCION = 0.23;  // alto del localizador respecto del recorte
  const INSET_MARGEN = 10;

  function cajaDelContenido() {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;

    // los puntos de la red y sus nombres
    nodoEl.forEach(({ etiqueta }, nodo) => {
      const p = punto.get(nodo);
      const ancho = etiqueta.getComputedTextLength() || nodo.length * 4.6;
      const izquierda = ladoEtiqueta(p.x, nodo) === "izquierda";
      const ly = p.y + (p.dy || 0);
      x0 = Math.min(x0, izquierda ? p.x - 9 - ancho : p.x - RADIO_EXTREMO);
      x1 = Math.max(x1, izquierda ? p.x + RADIO_EXTREMO : p.x + 9 + ancho);
      y0 = Math.min(y0, Math.min(p.y, ly) - 7);
      y1 = Math.max(y1, Math.max(p.y, ly) + 7);
    });

    // y ademas el lago y su rotulo, que son parte de lo que se quiere ver:
    // si no, el recorte los deja cortados por el borde
    svg.querySelectorAll(".croquis-lago, .mapa-rotulos text").forEach((el) => {
      const r = el.getBBox();
      x0 = Math.min(x0, r.x);
      x1 = Math.max(x1, r.x + r.width);
      y0 = Math.min(y0, r.y);
      y1 = Math.max(y1, r.y + r.height);
    });

    return { x0, x1, y0, y1 };
  }

  function recortar() {
    const caja = cajaDelContenido();
    if (!isFinite(caja.x0)) return;

    let { x0, x1, y0, y1 } = caja;
    x0 -= PADDING_RECORTE; x1 += PADDING_RECORTE;
    y0 -= PADDING_RECORTE; y1 += PADDING_RECORTE;

    const cuadrar = () => {
      const lado = Math.max(x1 - x0, y1 - y0);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return { lado, vx: cx - lado / 2, vy: cy - lado / 2 };
    };

    let { lado, vx, vy } = cuadrar();

    // El localizador va arriba a la derecha: si ahi hay contenido, se ensancha
    // el recorte para hacerle sitio en vez de taparlo.
    const altoInset = lado * INSET_FRACCION;
    const anchoInset = (COLOMBIA_GEO.ancho / COLOMBIA_GEO.alto) * altoInset;
    const zona = {
      x0: vx + lado - anchoInset - INSET_MARGEN * 2,
      y0: vy,
      y1: vy + altoInset + INSET_MARGEN * 2,
    };
    if (caja.x1 > zona.x0 && caja.y0 < zona.y1) {
      x1 += anchoInset + INSET_MARGEN * 2;
      ({ lado, vx, vy } = cuadrar());
    }

    recorteBase = { vx, vy, lado };
    aplicarVista();
  }

  // Cuadra una caja cualquiera, con aire alrededor.
  function cuadrar(caja, aire) {
    const lado = Math.max(caja.x1 - caja.x0, caja.y1 - caja.y0) + aire * 2;
    return {
      vx: (caja.x0 + caja.x1) / 2 - lado / 2,
      vy: (caja.y0 + caja.y1) / 2 - lado / 2,
      lado,
    };
  }

  // Pinta el encuadre actual: el base, o interpolado hacia la ruta segun el
  // nivel de zoom. Interpolar (en vez de saltar) hace que los pasos
  // intermedios sigan mostrando contexto alrededor de la ruta.
  function aplicarVista() {
    if (!recorteBase) return;
    let { vx, vy, lado } = recorteBase;

    if (nivelZoom > 0 && cajaRuta) {
      const destino = cuadrar(cajaRuta, PADDING_ZOOM);
      const f = nivelZoom / NIVELES_ZOOM;
      lado = recorteBase.lado + (destino.lado - recorteBase.lado) * f;
      vx = recorteBase.vx + (destino.vx - recorteBase.vx) * f;
      vy = recorteBase.vy + (destino.vy - recorteBase.vy) * f;
    }

    svg.setAttribute("viewBox",
      `${vx.toFixed(1)} ${vy.toFixed(1)} ${lado.toFixed(1)} ${lado.toFixed(1)}`);
    dibujarLocalizador({ vx, vy, lado });
  }

  function dibujarLocalizador({ vx, vy, lado }) {
    const previo = svg.querySelector(".mapa-inset");
    if (previo) previo.remove();

    const altoInset = lado * INSET_FRACCION;
    const escala = altoInset / COLOMBIA_GEO.alto;
    const anchoInset = COLOMBIA_GEO.ancho * escala;
    const tx = vx + lado - anchoInset - INSET_MARGEN;
    const ty = vy + INSET_MARGEN;

    const inset = crear("g", { class: "mapa-inset" });
    inset.appendChild(crear("rect", {
      x: tx - 4, y: ty - 4,
      width: anchoInset + 8, height: altoInset + 8,
      rx: 3, class: "inset-fondo",
    }));

    // el pais en pequeno, con las mismas rutas del croquis grande
    const contenido = crear("g", { transform: `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${escala.toFixed(5)})` });
    COLOMBIA_GEO.pais.forEach((d) => {
      contenido.appendChild(crear("path", { d, class: "inset-pais" }));
    });
    // los limites departamentales, para que se lea como mapa y no como mancha
    COLOMBIA_GEO.departamentos.forEach((d) => {
      contenido.appendChild(crear("path", { d, class: "inset-depto" }));
    });
    // marco de la zona que se esta viendo en el mapa grande
    // el borde va con non-scaling-stroke (en el CSS), asi que aqui no hay que
    // compensar la escala: sale de 1 px reales
    contenido.appendChild(crear("rect", {
      x: vx.toFixed(1), y: vy.toFixed(1),
      width: lado.toFixed(1), height: lado.toFixed(1),
      class: "inset-marco",
    }));
    inset.appendChild(contenido);
    inset.appendChild(crear("title", {}, "Zona del mapa que se esta mostrando"));

    svg.appendChild(inset);
  }

  // ---- Resaltado + animacion de la ruta calculada ----
  function actualizar({ origen, destino, edges = [], combinada = null } = {}) {
    const activos = new Set(edges);

    // El flujo debe correr en el sentido origen -> destino. `edges` viene en
    // orden de recorrido, asi que se compara con el tramo anterior para saber
    // si hay que invertir la linea animada.
    let anterior = origen;
    const sentido = new Map();
    edges.forEach((i) => {
      const seg = TARIFAS_DATA.segments[i];
      if (seg.origen === anterior) {
        sentido.set(i, false);
        anterior = seg.destino;
      } else if (seg.destino === anterior) {
        sentido.set(i, true);
        anterior = seg.origen;
      } else {
        // salto entre las dos mitades de una ruta combinada
        sentido.set(i, false);
        anterior = seg.destino;
      }
    });

    // Orden de recorrido, para que la ruta se dibuje de origen a destino
    // (y no todos los tramos a la vez).
    // El usuario pidio movimiento constante, asi que la animacion NO se apaga
    // con prefers-reduced-motion: en Windows basta con tener desactivado
    // "mostrar animaciones" para que el navegador la reporte, y la ruta se
    // quedaba quieta.
    const posicion = new Map(edges.map((e, i) => [e, i]));

    tramoEl.forEach(({ base, flujo, curva }, i) => {
      const activo = activos.has(i);
      base.classList.toggle("activo", activo);
      flujo.classList.toggle("activo", activo);

      if (!activo) {
        flujo.style.transitionDelay = "";
        return;
      }

      // el guion debe correr origen -> destino, asi que se usa el trazo al
      // derecho o al reves segun como este guardado el tramo
      flujo.setAttribute("d", sentido.get(i) ? curva.inverso : curva.directo);

      // La ruta se "dibuja" tramo a tramo: cada uno arranca cuando le toca por
      // su lugar en el recorrido. Se hace con la Web Animations API para no
      // dejar residuos en el atributo style del elemento.
      const retraso = (posicion.get(i) || 0) * PASO_DIBUJO;
      const largo = base.getTotalLength();
      base.animate(
        [
          { strokeDasharray: `${largo} ${largo}`, strokeDashoffset: largo },
          { strokeDasharray: `${largo} ${largo}`, strokeDashoffset: 0 },
        ],
        { duration: DURACION_DIBUJO, delay: retraso, easing: "ease-out", fill: "backwards" }
      );
      // el flujo de rayitas aparece cuando ese tramo ya termino de dibujarse
      flujo.style.transitionDelay = `${retraso + DURACION_DIBUJO}ms`;
    });

    // Caja que envuelve la ruta, para el zoom. Incluye los puntos de sus
    // tramos; si no hay ruta, el zoom se apaga y se vuelve al encuadre base.
    if (edges.length) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      edges.forEach((i) => {
        const seg = TARIFAS_DATA.segments[i];
        [seg.origen, seg.destino].forEach((n) => {
          const p = punto.get(n);
          if (!p) return;
          x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
          y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        });
      });
      cajaRuta = isFinite(x0) ? { x0, x1, y0, y1 } : null;
    } else {
      cajaRuta = null;
      nivelZoom = 0;
    }
    aplicarVista();

    const entradas = combinada
      ? [combinada.origen.entrada, combinada.destino.entrada]
      : [];

    const enRuta = new Set();
    edges.forEach((i) => {
      const seg = TARIFAS_DATA.segments[i];
      enRuta.add(seg.origen);
      enRuta.add(seg.destino);
    });

    nodoEl.forEach(({ grupo, circulo }, nodo) => {
      const esOrigen = nodo === origen;
      const esDestino = nodo === destino;
      grupo.classList.toggle("es-origen", esOrigen);
      grupo.classList.toggle("es-destino", esDestino);
      grupo.classList.toggle("es-entrada",
        entradas.includes(nodo) && !esOrigen && !esDestino);
      grupo.classList.toggle("en-ruta", enRuta.has(nodo) && !esOrigen && !esDestino);
      circulo.setAttribute("r", esOrigen || esDestino ? RADIO_EXTREMO : RADIO_PUNTO);
    });
  }

  // --- Zoom sobre la ruta seleccionada ---
  function zoom(paso) {
    const antes = nivelZoom;
    nivelZoom = Math.max(0, Math.min(NIVELES_ZOOM, nivelZoom + paso));
    if (nivelZoom !== antes) aplicarVista();
    return estadoZoom();
  }

  function estadoZoom() {
    return {
      nivel: nivelZoom,
      maximo: NIVELES_ZOOM,
      hayRuta: Boolean(cajaRuta),
      puedeAcercar: Boolean(cajaRuta) && nivelZoom < NIVELES_ZOOM,
      puedeAlejar: nivelZoom > 0,
    };
  }

  // Rectangulo en pantalla del localizador, para colocar los botones debajo.
  function rectLocalizador() {
    const fondo = svg && svg.querySelector(".inset-fondo");
    return fondo ? fondo.getBoundingClientRect() : null;
  }

  return { init, actualizar, zoom, estadoZoom, rectLocalizador };
})();

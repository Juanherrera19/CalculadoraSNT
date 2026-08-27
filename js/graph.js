// Motor de calculo de tarifas de transporte de gas (SNT)
// Construye el grafo de tramos y calcula la ruta y el costo unitario
// entre un Origen y un Destino.

const Tarifas = (() => {
  const { segments, estampillas, nodes } = TARIFAS_DATA;

  // ---- Configuracion regulatoria por transportador ----
  // Cada transportador liquida su propia cuota de fomento y su propio impuesto
  // local sobre SU parte del costo (tramos propios + su estampilla).
  // - PROMIGAS: valores fijos, no editables desde la interfaz.
  // - TGI: el usuario puede cambiar fomento e impuesto (editable: true).
  const CONFIG_TRANSPORTADOR = {
    TGI: { editable: true, fomentoPct: 0.03, impuestoPct: 0.0 },
    PROMIGAS: { editable: false, fomentoPct: 0.03, impuestoPct: 0.06 },
  };

  // ---- Punto de entrada (raiz) de cada red ----
  // Cuando Origen y Destino estan en redes distintas no existe un camino fisico
  // continuo, asi que la tarifa se arma sumando DOS rutas: la de cada punto
  // hasta el punto de entrada de su propia red. Son los mismos nodos raiz que
  // usa la matriz de pertenencia del Excel (ver docs/DECISIONES.md D5 y D10).
  const PUNTOS_ENTRADA = {
    TGI: "Ballenas_tgi",
    PROMIGAS: "Ballenas_prom",
  };

  // ---- Construccion del grafo (lista de adyacencia) ----
  const adj = new Map();
  nodes.forEach((n) => adj.set(n, []));
  segments.forEach((seg, i) => {
    adj.get(seg.origen).push({ to: seg.destino, edge: i });
    adj.get(seg.destino).push({ to: seg.origen, edge: i });
  });

  // ---- Componentes conexas: a que red pertenece cada nodo ----
  // La red son 2 arboles disjuntos: TGI y PROMIGAS.
  const redDeNodo = new Map();
  nodes.forEach((raiz) => {
    if (redDeNodo.has(raiz)) return;
    const cola = [raiz];
    const miembros = [];
    redDeNodo.set(raiz, raiz); // marca provisional
    while (cola.length) {
      const cur = cola.shift();
      miembros.push(cur);
      for (const { to } of adj.get(cur) || []) {
        if (!redDeNodo.has(to)) {
          redDeNodo.set(to, raiz);
          cola.push(to);
        }
      }
    }
    // el transportador de la componente identifica la red
    const alguno = segments.find((s) => miembros.includes(s.origen));
    const transportador = alguno ? alguno.transportador : null;
    miembros.forEach((n) => redDeNodo.set(n, transportador));
  });

  // ---- BFS: camino unico entre dos nodos de la MISMA red (es un arbol) ----
  function caminoEnRed(origen, destino) {
    if (origen === destino) return [];
    const visited = new Set([origen]);
    const parentEdge = new Map(); // nodo -> {from, edge}
    const queue = [origen];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === destino) break;
      for (const { to, edge } of adj.get(cur) || []) {
        if (!visited.has(to)) {
          visited.add(to);
          parentEdge.set(to, { from: cur, edge });
          queue.push(to);
        }
      }
    }
    if (!visited.has(destino)) return null;
    // reconstruir camino de tramos (destino -> origen)
    const edgesUsed = [];
    let cur = destino;
    while (cur !== origen) {
      const pe = parentEdge.get(cur);
      edgesUsed.push(pe.edge);
      cur = pe.from;
    }
    edgesUsed.reverse();
    return edgesUsed;
  }

  function findPath(origen, destino) {
    if (origen === destino) return { ok: false, reason: "ORIGEN_IGUAL_DESTINO" };

    const redOrigen = redDeNodo.get(origen);
    const redDestino = redDeNodo.get(destino);

    // Caso normal: misma red -> camino unico dentro del arbol.
    if (redOrigen === redDestino) {
      const edges = caminoEnRed(origen, destino);
      if (!edges) return { ok: false, reason: "SIN_RUTA" };
      return { ok: true, tipo: "DIRECTA", edges };
    }

    // Redes distintas -> ruta combinada: cada punto hasta la entrada de SU red.
    const entradaOrigen = PUNTOS_ENTRADA[redOrigen];
    const entradaDestino = PUNTOS_ENTRADA[redDestino];
    if (!entradaOrigen || !entradaDestino) {
      return { ok: false, reason: "SIN_PUNTO_ENTRADA" };
    }

    const tramoOrigen = caminoEnRed(origen, entradaOrigen);
    const tramoDestino = caminoEnRed(entradaDestino, destino);
    if (!tramoOrigen || !tramoDestino) return { ok: false, reason: "SIN_RUTA" };

    return {
      ok: true,
      tipo: "COMBINADA",
      edges: [...tramoOrigen, ...tramoDestino],
      combinada: {
        origen: { punto: origen, red: redOrigen, entrada: entradaOrigen, tramos: tramoOrigen.length },
        destino: { punto: destino, red: redDestino, entrada: entradaDestino, tramos: tramoDestino.length },
      },
    };
  }

  // ---- Calculo tarifario ----
  // cf: fraccion cobrada como cargo fijo (0..1); el resto (1-cf) se cobra como cargo variable.
  // AOM se cobra siempre al 100%, independiente de cf.
  // La estampilla de un transportador se aplica una sola vez si la ruta usa alguno de sus tramos.
  // La cuota de fomento y el impuesto local se liquidan POR TRANSPORTADOR sobre su
  // propia base (tramos propios + estampilla propia), no sobre el costo base global.
  // fomentoPctTGI / impuestoPctTGI aplican solo a los transportadores editables (TGI);
  // los demas usan los porcentajes fijos de CONFIG_TRANSPORTADOR.
  function calcular({ origen, destino, cf, trm, impuestoPctTGI = 0, fomentoPctTGI = 0.03 }) {
    const path = findPath(origen, destino);
    if (!path.ok) {
      return { ok: false, reason: path.reason };
    }

    const tramosUsados = path.edges.map((i) => segments[i]);

    let fijosTotal = 0, variablesTotal = 0, aomTotal = 0;
    const detalle = tramosUsados.map((seg) => {
      const fijo = seg.fijos * cf;
      const variable = seg.variables * (1 - cf);
      const aom = seg.aom;
      fijosTotal += fijo;
      variablesTotal += variable;
      aomTotal += aom;
      return { ...seg, fijoPonderado: fijo, variablePonderado: variable, aomIncluido: aom };
    });

    // orden de aparicion del transportador en la ruta
    const operadoresUsados = [...new Set(tramosUsados.map((t) => t.transportador))];

    // ---- Desglose por transportador ----
    const porTransportador = operadoresUsados.map((nombre) => {
      const cfg = CONFIG_TRANSPORTADOR[nombre] || { editable: false, fomentoPct: 0, impuestoPct: 0 };
      const propios = detalle.filter((d) => d.transportador === nombre);

      const fijos = propios.reduce((s, d) => s + d.fijoPonderado, 0);
      const variables = propios.reduce((s, d) => s + d.variablePonderado, 0);
      const aom = propios.reduce((s, d) => s + d.aomIncluido, 0);

      const est = estampillas.find((e) => e.transportador === nombre);
      // desglosada, porque la tabla de resultados la muestra por componente
      const estampillaDetalle = est
        ? { fijos: est.fijos * cf, variables: est.variables * (1 - cf), aom: est.aom }
        : null;
      const estampilla = estampillaDetalle
        ? estampillaDetalle.fijos + estampillaDetalle.variables + estampillaDetalle.aom
        : 0;

      const base = fijos + variables + aom + estampilla;
      const fomentoPct = cfg.editable ? fomentoPctTGI : cfg.fomentoPct;
      const impuestoPct = cfg.editable ? impuestoPctTGI : cfg.impuestoPct;
      const fomentoCOP = base * fomentoPct;
      const impuestoCOP = base * impuestoPct;

      return {
        transportador: nombre,
        editable: cfg.editable,
        tramos: propios.length,
        fijos, variables, aom,
        estampilla,
        estampillaDetalle,
        base,
        fomentoPct, fomentoCOP,
        impuestoPct, impuestoCOP,
        totalCOP: base + fomentoCOP + impuestoCOP,
      };
    });

    const estampillasAplicadas = porTransportador
      .filter((t) => t.estampilla > 0)
      .map((t) => ({ transportador: t.transportador, valor: t.estampilla }));

    const sum = (campo) => porTransportador.reduce((s, t) => s + t[campo], 0);
    const estampillasTotal = sum("estampilla");
    const costoBaseCOP = sum("base");
    const fomentoCOP = sum("fomentoCOP");
    const impuestoCOP = sum("impuestoCOP");
    const totalCOP = costoBaseCOP + fomentoCOP + impuestoCOP;
    const costoBaseUSD = trm ? costoBaseCOP / trm : 0;
    const totalUSD = trm ? totalCOP / trm : 0;

    return {
      ok: true,
      tipoRuta: path.tipo,
      combinada: path.combinada || null,
      edges: path.edges,          // indices de tramos, para dibujar el mapa
      detalle,
      operadoresUsados,
      porTransportador,
      estampillasAplicadas,
      totales: {
        fijosTotal, variablesTotal, aomTotal,
        estampillasTotal, costoBaseCOP, fomentoCOP, impuestoCOP, totalCOP,
        costoBaseUSD, totalUSD,
      },
    };
  }

  return {
    nodes: [...nodes].sort((a, b) => a.localeCompare(b, "es")),
    segments,
    estampillas,
    config: CONFIG_TRANSPORTADOR,
    puntosEntrada: PUNTOS_ENTRADA,
    redDeNodo,
    findPath,
    calcular,
  };
})();

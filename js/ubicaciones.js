// Ubicacion geografica (lat, lon) de cada punto del SNT, para dibujarlos
// sobre el croquis de Colombia.
//
// ⚠️ IMPORTANTE: estas coordenadas son APROXIMADAS. Se ubicaron a partir del
// municipio o del campo/estacion al que corresponde cada nombre, tomando como
// referencia el mapa oficial del Sistema Nacional de Transporte. NO vienen de
// una fuente georreferenciada del operador. Sirven para que el diagrama se lea
// bien; no las uses para calcular distancias ni para nada regulatorio.
//
// Ajustar un punto es seguro: cambia su lat/lon aqui y el mapa se redibuja
// solo. No afectan el calculo de tarifas (eso solo depende de js/data.js).
//
// lat = latitud norte (grados), lon = longitud oeste (grados, negativa).

const UBICACIONES = {
  // ---------- PROMIGAS (costa Caribe) ----------
  Ballenas_prom: { lat: 11.42, lon: -72.88, nota: "Campo Ballenas, La Guajira" },
  "La Mami":     { lat: 10.62, lon: -74.22, nota: "Estacion La Mami, Magdalena" },
  Barranquilla:  { lat: 10.97, lon: -74.78 },
  Cartagena:     { lat: 10.40, lon: -75.44 },
  "Red Mamonal": { lat: 10.27, lon: -75.42, nota: "Zona industrial de Mamonal, Cartagena" },
  Sincelejo:     { lat: 9.30, lon: -75.40 },
  "La Creciente":{ lat: 9.00, lon: -75.07, nota: "Campo La Creciente, San Pedro (Sucre)" },
  Jobo:          { lat: 8.90, lon: -75.48, nota: "Campo Jobo, Sahagun (Cordoba)" },

  // ---------- TGI (troncal Ballenas - Barranca - Sebastopol y ramales) ----------
  Ballenas_tgi:  { lat: 11.56, lon: -72.72, nota: "Campo Ballenas, punto de entrada de TGI" },
  Barranca:      { lat: 7.07, lon: -73.85, nota: "Barrancabermeja, Santander" },
  Sebastopol:    { lat: 6.45, lon: -74.42, nota: "Estacion Sebastopol, Antioquia" },

  // ramal Antioquia / Medellin
  Transmetano:   { lat: 6.42, lon: -75.08, nota: "Sistema Transmetano, Antioquia" },
  Donmatias:     { lat: 6.49, lon: -75.39 },
  Barbosa:       { lat: 6.44, lon: -75.33, nota: "Barbosa, Antioquia" },
  Girardota:     { lat: 6.38, lon: -75.45 },
  Bello:         { lat: 6.34, lon: -75.56 },
  Medellin:      { lat: 6.24, lon: -75.58 },

  // troncal centro
  Vasconia:      { lat: 5.99, lon: -74.59, nota: "Puerto Boyaca, Boyaca" },
  "La Belleza":  { lat: 5.86, lon: -73.96, nota: "La Belleza, Santander" },
  "Montañuelo":  { lat: 5.10, lon: -74.35, nota: "Estacion Montanuelo, Cundinamarca" },
  Cogua:         { lat: 5.06, lon: -73.98 },
  Sabana:        { lat: 4.85, lon: -74.09, nota: "Sabana de Bogota" },
  Usme:          { lat: 4.50, lon: -74.13, nota: "Usme, Bogota D.C." },

  // ramal occidente (Mariquita - eje cafetero - Cali)
  Mariquita:     { lat: 5.20, lon: -74.89 },
  Pereira:       { lat: 4.81, lon: -75.70 },
  Armenia:       { lat: 4.53, lon: -75.68 },
  Cali:          { lat: 3.45, lon: -76.53 },
  Acopi:         { lat: 3.58, lon: -76.50, nota: "Acopi - Yumbo, Valle del Cauca" },

  // ramal sur
  Gualanday:     { lat: 4.31, lon: -75.03, nota: "Gualanday, Coello (Tolima)" },
  Neiva:         { lat: 2.93, lon: -75.28 },

  // ramal llanos
  Villavicencio: { lat: 4.14, lon: -73.63 },
  Apiay:         { lat: 4.07, lon: -73.56, nota: "Campo Apiay, Meta" },
  Porvenir:      { lat: 4.42, lon: -73.30, nota: "El Porvenir, Cundinamarca/Meta" },
  Cusiana:       { lat: 4.98, lon: -72.75, nota: "Campo Cusiana, Tauramena (Casanare)" },
};

// ---------------------------------------------------------------------------
// Nodos cuyo nombre se escribe a la IZQUIERDA del punto.
//
// Por defecto el nombre va a la derecha, salvo en el oriente del mapa. Estos
// son excepciones elegidas a ojo: puntos donde a la derecha el nombre choca
// con otro o con una linea, y a la izquierda hay hueco libre.
const ETIQUETAS_IZQUIERDA = [
  "Jobo",
  "Red Mamonal",
  "Barranquilla",
  "Ballenas_tgi",
  "Medellin",
  "Girardota",
  "Donmatias",
  "Mariquita",
  "Pereira",
  "Armenia",
  "Cali",
  "Apiay",
];

// ---------------------------------------------------------------------------
// Puntos de paso (waypoints) de algunos tramos.
//
// Un gasoducto no va en linea recta entre sus dos extremos: rodea sierras,
// sigue valles y bordea la costa. Para los tramos largos, una recta entre
// origen y destino se sale visiblemente del corredor real (y a veces del
// territorio). Aqui se listan los puntos intermedios por los que debe pasar
// el trazo, leidos de la lamina oficial del SNT.
//
// ⚠️ Igual que UBICACIONES, son APROXIMADOS: trazados a ojo sobre la lamina,
// no son el recorrido georreferenciado del ducto. Solo afectan el dibujo,
// nunca el calculo de la tarifa.
//
// La clave es el nombre del tramo tal como esta en la hoja TRAMOS. Los tramos
// que no aparecen aqui se dibujan con una curva suave automatica.
const TRAZADOS = {
  // --- PROMIGAS: la troncal costera bordea el Caribe ---
  "Ballenas_prom - La Mami": [
    { lat: 11.30, lon: -73.00 },   // baja de Ballenas hacia Riohacha
    { lat: 11.18, lon: -73.55 },   // corredor entre la sierra y la costa
    { lat: 11.15, lon: -74.00 },   // altura de Santa Marta, por tierra
    { lat: 10.85, lon: -74.18 },
  ],
  "La Mami - Barranquilla": [
    { lat: 10.68, lon: -74.45 },   // rodea la Cienaga Grande por el sur
    { lat: 10.72, lon: -74.70 },
    { lat: 10.88, lon: -74.78 },
  ],
  "Barranquilla - Cartagena": [
    { lat: 10.72, lon: -75.10 },   // sigue la linea de costa
  ],
  "Cartagena - Sincelejo": [
    { lat: 10.02, lon: -75.32 },
    { lat: 9.58, lon: -75.30 },
  ],
  "Sincelejo - Jobo": [
    { lat: 9.10, lon: -75.42 },
  ],

  // --- TGI: troncal Ballenas -> Barrancabermeja por el valle del Cesar ---
  "Ballenas_tgi - Barranca": [
    { lat: 10.90, lon: -72.80 },
    { lat: 10.15, lon: -73.18 },   // Valledupar
    { lat: 9.20, lon: -73.42 },    // La Jagua / Casacara
    { lat: 8.20, lon: -73.55 },    // San Alberto
    { lat: 7.50, lon: -73.72 },
  ],
  "Barranca - Sebastopol": [
    { lat: 6.85, lon: -74.05 },
  ],

  // --- TGI: ramal del magdalena medio hacia el interior ---
  "Sebastopol - Vasconia": [
    { lat: 6.20, lon: -74.52 },
  ],
  "Vasconia - Mariquita": [
    { lat: 5.60, lon: -74.72 },
  ],
  "Vasconia - La Belleza": [
    { lat: 5.94, lon: -74.20 },
  ],
  "La Belleza - Cogua": [
    { lat: 5.40, lon: -73.90 },
  ],

  // --- TGI: ramal occidental (eje cafetero) ---
  "Mariquita - Pereira": [
    { lat: 5.00, lon: -75.30 },
  ],
  "Armenia - Cali": [
    { lat: 4.05, lon: -75.95 },
    { lat: 3.70, lon: -76.30 },
  ],

  // --- TGI: ramal sur ---
  "Mariquita - Gualanday": [
    { lat: 4.75, lon: -74.95 },
  ],
  "Gualanday - Neiva": [
    { lat: 3.60, lon: -75.15 },
  ],

  // --- TGI: ramal de los llanos ---
  "La Belleza - Porvenir": [
    { lat: 5.30, lon: -73.60 },
    { lat: 4.80, lon: -73.35 },
  ],
  "Porvenir - Cusiana": [
    { lat: 4.75, lon: -72.95 },
  ],
  "Cusiana - Apiay": [
    { lat: 4.55, lon: -72.95 },
  ],
  "Apiay - Usme": [
    { lat: 4.25, lon: -73.90 },
  ],

  // --- TGI: valle de Aburra ---
  "Sebastopol - Transmetano": [
    { lat: 6.48, lon: -74.75 },
  ],
  "Transmetano - Donmatias": [
    { lat: 6.55, lon: -75.24 },
  ],
};

// Datos de tramos y tarifas vigentes del SNT.
// GENERADO por tools/sincronizar_datos.py desde la hoja TRAMOS de
// docs/CALCULADORA_TARIFAS_2026.xlsx. No editar a mano: actualiza la hoja
// TRAMOS y vuelve a ejecutar el script, para que el Excel y la web no
// queden descuadrados.
const TARIFAS_DATA = {
  "segments": [
    {
      "ruta": "Ballenas_tgi - Barranca",
      "origen": "Ballenas_tgi",
      "destino": "Barranca",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 3072.983562,
      "variables": 4695,
      "aom": 2405.306849
    },
    {
      "ruta": "Barranca - Sebastopol",
      "origen": "Barranca",
      "destino": "Sebastopol",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1430.010959,
      "variables": 3174,
      "aom": 582.172603
    },
    {
      "ruta": "Sebastopol - Transmetano",
      "origen": "Sebastopol",
      "destino": "Transmetano",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 1e-05,
      "variables": 1e-05,
      "aom": 0
    },
    {
      "ruta": "Transmetano - Donmatias",
      "origen": "Transmetano",
      "destino": "Donmatias",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 1e-05,
      "variables": 1e-05,
      "aom": 0
    },
    {
      "ruta": "Donmatias - Barbosa",
      "origen": "Donmatias",
      "destino": "Barbosa",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 1e-05,
      "variables": 1e-05,
      "aom": 0
    },
    {
      "ruta": "Barbosa - Girardota",
      "origen": "Barbosa",
      "destino": "Girardota",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 1e-05,
      "variables": 1e-05,
      "aom": 0
    },
    {
      "ruta": "Girardota - Bello",
      "origen": "Girardota",
      "destino": "Bello",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 1e-05,
      "variables": 1e-05,
      "aom": 0
    },
    {
      "ruta": "Bello - Medellin",
      "origen": "Bello",
      "destino": "Medellin",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 5254.295304,
      "variables": 6590,
      "aom": 839.9753425
    },
    {
      "ruta": "Sebastopol - Vasconia",
      "origen": "Sebastopol",
      "destino": "Vasconia",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 583.145205,
      "variables": 1753,
      "aom": 167.043836
    },
    {
      "ruta": "Vasconia - Mariquita",
      "origen": "Vasconia",
      "destino": "Mariquita",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1387.241096,
      "variables": 2073,
      "aom": 434.512329
    },
    {
      "ruta": "Mariquita - Gualanday",
      "origen": "Mariquita",
      "destino": "Gualanday",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 4807.926027,
      "variables": 5098,
      "aom": 1064.284932
    },
    {
      "ruta": "Gualanday - Neiva",
      "origen": "Gualanday",
      "destino": "Neiva",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 17583.216438,
      "variables": 19512,
      "aom": 2580.876712
    },
    {
      "ruta": "Gualanday - Montañuelo",
      "origen": "Gualanday",
      "destino": "Montañuelo",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 0,
      "variables": 0,
      "aom": 0
    },
    {
      "ruta": "Mariquita - Pereira",
      "origen": "Mariquita",
      "destino": "Pereira",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1729.690411,
      "variables": 2757,
      "aom": 1495.00274
    },
    {
      "ruta": "Pereira - Armenia",
      "origen": "Pereira",
      "destino": "Armenia",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 611.578082,
      "variables": 1026,
      "aom": 514.336986
    },
    {
      "ruta": "Armenia - Cali",
      "origen": "Armenia",
      "destino": "Cali",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1412.460274,
      "variables": 2457,
      "aom": 1155.630137
    },
    {
      "ruta": "Cali - Acopi",
      "origen": "Cali",
      "destino": "Acopi",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1447.7123287671,
      "variables": 2547,
      "aom": 1034.1232876712
    },
    {
      "ruta": "Vasconia - La Belleza",
      "origen": "Vasconia",
      "destino": "La Belleza",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1559.150685,
      "variables": 2348,
      "aom": 303.939726
    },
    {
      "ruta": "La Belleza - Cogua",
      "origen": "La Belleza",
      "destino": "Cogua",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1042.942466,
      "variables": 1418,
      "aom": 209.693151
    },
    {
      "ruta": "Cogua - Sabana",
      "origen": "Cogua",
      "destino": "Sabana",
      "transportador": "TGI",
      "tipo": "Intermedio",
      "fijos": 0,
      "variables": 0,
      "aom": 0
    },
    {
      "ruta": "La Belleza - Porvenir",
      "origen": "La Belleza",
      "destino": "Porvenir",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 2923.794521,
      "variables": 4099,
      "aom": 693.180822
    },
    {
      "ruta": "Porvenir - Cusiana",
      "origen": "Porvenir",
      "destino": "Cusiana",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 268.312329,
      "variables": 373,
      "aom": 47.043836
    },
    {
      "ruta": "Cusiana - Apiay",
      "origen": "Cusiana",
      "destino": "Apiay",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1854.958904,
      "variables": 1917,
      "aom": 954.035616
    },
    {
      "ruta": "Apiay - Villavicencio",
      "origen": "Apiay",
      "destino": "Villavicencio",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 1506.043836,
      "variables": 1625,
      "aom": 396.808219
    },
    {
      "ruta": "Apiay - Usme",
      "origen": "Apiay",
      "destino": "Usme",
      "transportador": "TGI",
      "tipo": "Punto",
      "fijos": 2077.093151,
      "variables": 2076,
      "aom": 972.057534
    },
    {
      "ruta": "Ballenas_prom - La Mami",
      "origen": "Ballenas_prom",
      "destino": "La Mami",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 733.131,
      "variables": 1197.172,
      "aom": 298
    },
    {
      "ruta": "La Mami - Barranquilla",
      "origen": "La Mami",
      "destino": "Barranquilla",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 1296.441,
      "variables": 1993.12,
      "aom": 296
    },
    {
      "ruta": "Barranquilla - Cartagena",
      "origen": "Barranquilla",
      "destino": "Cartagena",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 736.496,
      "variables": 849.141,
      "aom": 457
    },
    {
      "ruta": "Cartagena - Sincelejo",
      "origen": "Cartagena",
      "destino": "Sincelejo",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 2087.698,
      "variables": 2490.203,
      "aom": 266
    },
    {
      "ruta": "Cartagena - Red Mamonal",
      "origen": "Cartagena",
      "destino": "Red Mamonal",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 143.462,
      "variables": 158.435,
      "aom": 50
    },
    {
      "ruta": "Sincelejo - La Creciente",
      "origen": "Sincelejo",
      "destino": "La Creciente",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 898.436,
      "variables": 897.79,
      "aom": 163
    },
    {
      "ruta": "Sincelejo - Jobo",
      "origen": "Sincelejo",
      "destino": "Jobo",
      "transportador": "PROMIGAS",
      "tipo": "Punto",
      "fijos": 1675.082,
      "variables": 1769.096,
      "aom": 956
    }
  ],
  "estampillas": [
    {
      "transportador": "TGI",
      "fijos": 500.542466,
      "variables": 709,
      "aom": 158.427397
    },
    {
      "transportador": "PROMIGAS",
      "fijos": 815.331,
      "variables": 1195.386,
      "aom": 97
    }
  ],
  "nodes": [
    "Acopi",
    "Apiay",
    "Armenia",
    "Ballenas_prom",
    "Ballenas_tgi",
    "Barbosa",
    "Barranca",
    "Barranquilla",
    "Bello",
    "Cali",
    "Cartagena",
    "Cogua",
    "Cusiana",
    "Donmatias",
    "Girardota",
    "Gualanday",
    "Jobo",
    "La Belleza",
    "La Creciente",
    "La Mami",
    "Mariquita",
    "Medellin",
    "Montañuelo",
    "Neiva",
    "Pereira",
    "Porvenir",
    "Red Mamonal",
    "Sabana",
    "Sebastopol",
    "Sincelejo",
    "Transmetano",
    "Usme",
    "Vasconia",
    "Villavicencio"
  ]
};

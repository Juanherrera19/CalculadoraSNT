# -*- coding: utf-8 -*-
"""
Genera js/colombia.js: el croquis de la zona (Colombia con sus departamentos,
mas Panama, Venezuela y el lago de Maracaibo) como rutas SVG ya proyectadas.

Fuente de los limites: geoBoundaries (dominio publico, Open Data Commons),
version "simplified" de COL:
  COL ADM0 (pais)          .../gbOpen/COL/ADM0/geoBoundaries-COL-ADM0_simplified.geojson
  COL ADM1 (departamentos) .../gbOpen/COL/ADM1/geoBoundaries-COL-ADM1_simplified.geojson
  PAN ADM0 (Panama)        .../gbOpen/PAN/ADM0/geoBoundaries-PAN-ADM0_simplified.geojson
  VEN ADM0 (Venezuela)     .../gbOpen/VEN/ADM0/geoBoundaries-VEN-ADM0_simplified.geojson

El lago de Maracaibo NO viene de ninguna fuente: Natural Earth lo clasifica
como mar y no aparece en su capa de lagos, asi que se aproximo A OJO desde la
lamina oficial del SNT. Es solo decorado del mapa: no interviene en ningun
calculo.

Proyeccion: equirectangular (lon/lat lineal) con correccion del ancho por el
coseno de la latitud media del pais. Colombia esta sobre el ecuador, asi que la
distorsion es minima y a cambio ubicar un punto en el mapa es tan simple como
aplicar la misma formula a su lon/lat (ver js/ubicaciones.js).

Uso:
    python tools/generar_croquis.py <carpeta_con_adm0.json_y_adm1.json>

Si no se pasa carpeta, intenta descargar los archivos a una temporal.
"""

import json
import math
import os
import sys
import tempfile
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "js", "colombia.js")

BASE = ("https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/"
        "releaseData/gbOpen")
URLS = {
    "adm0.json": BASE + "/COL/ADM0/geoBoundaries-COL-ADM0_simplified.geojson",
    "adm1.json": BASE + "/COL/ADM1/geoBoundaries-COL-ADM1_simplified.geojson",
    "pan_adm0.json": BASE + "/PAN/ADM0/geoBoundaries-PAN-ADM0_simplified.geojson",
    "ven_adm0.json": BASE + "/VEN/ADM0/geoBoundaries-VEN-ADM0_simplified.geojson",
}

# Ventana que se dibuja. Los paises vecinos se recortan a esto para no cargar
# territorio que nunca se ve (Panama llega hasta -83, Venezuela hasta -60).
VENTANA = {"lon0": -81.0, "lon1": -68.0, "lat0": 0.0, "lat1": 14.0}

# --- Lago de Maracaibo (aproximado a ojo, ver nota de arriba) ---
# --- Rotulos geograficos: mares y paises vecinos, como en la lamina ---
# Sin croquis propio: son solo textos colocados sobre el mar o sobre el
# territorio del vecino.
ROTULOS_GEOGRAFICOS = [
    {"texto": "MAR CARIBE", "tipo": "mar", "lon": -77.10, "lat": 11.55, "anclaje": "middle"},
    {"texto": "OCEANO", "tipo": "mar", "lon": -78.05, "lat": 4.90, "anclaje": "middle"},
    {"texto": "PACIFICO", "tipo": "mar", "lon": -78.05, "lat": 4.62, "anclaje": "middle"},
    {"texto": "Panama", "tipo": "pais", "lon": -78.05, "lat": 8.55, "anclaje": "middle"},
    {"texto": "Venezuela", "tipo": "pais", "lon": -70.30, "lat": 7.40, "anclaje": "middle"},
]

MARACAIBO_ROTULOS = [
    {"texto": "Lago de", "tipo": "lago", "lon": -71.45, "lat": 9.95, "anclaje": "middle"},
    {"texto": "Maracaibo", "tipo": "lago", "lon": -71.45, "lat": 9.75, "anclaje": "middle"},
]
MARACAIBO = [
    (-71.58, 11.00), (-71.36, 10.98), (-71.30, 10.72), (-71.26, 10.48),
    (-71.10, 10.28), (-71.01, 10.00), (-70.98, 9.68), (-71.06, 9.38),
    (-71.16, 9.14), (-71.31, 8.94), (-71.51, 8.80), (-71.67, 8.73),
    (-71.81, 8.78), (-71.90, 8.97), (-71.96, 9.26), (-71.92, 9.60),
    (-71.85, 9.96), (-71.77, 10.26), (-71.71, 10.56), (-71.66, 10.82),
]

# Solo Colombia continental: descarta el archipielago de San Andres y
# Providencia (lon < -80), que quedaria muy lejos y encogeria el resto.
LON_MIN_CONTINENTAL = -80.0

ANCHO_OBJETIVO = 640          # px del viewBox
TOLERANCIA_PAIS = 0.012       # grados (~1.3 km) para el contorno del pais
TOLERANCIA_DEPTOS = 0.030     # los limites internos van mas simplificados
TOLERANCIA_VECINOS = 0.035    # los vecinos son contexto: mas simplificados aun
AREA_MINIMA = 0.004           # grados^2: descarta islotes diminutos


def descargar(carpeta):
    os.makedirs(carpeta, exist_ok=True)
    for nombre, url in URLS.items():
        destino = os.path.join(carpeta, nombre)
        if os.path.exists(destino):
            continue
        print(f"descargando {nombre} ...")
        urllib.request.urlretrieve(url, destino)
    return carpeta


def anillos(geometria):
    """Devuelve todos los anillos exteriores de un Polygon/MultiPolygon."""
    if geometria["type"] == "Polygon":
        return [geometria["coordinates"][0]]
    if geometria["type"] == "MultiPolygon":
        return [poligono[0] for poligono in geometria["coordinates"]]
    return []


def area_aprox(anillo):
    """Area por la formula del cordon de zapato, en grados cuadrados."""
    s = 0.0
    for i in range(len(anillo) - 1):
        x1, y1 = anillo[i][0], anillo[i][1]
        x2, y2 = anillo[i + 1][0], anillo[i + 1][1]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def simplificar(puntos, tolerancia):
    """Ramer-Douglas-Peucker iterativo (evita recursion profunda)."""
    if len(puntos) < 3:
        return puntos
    conservar = [False] * len(puntos)
    conservar[0] = conservar[-1] = True
    pila = [(0, len(puntos) - 1)]

    while pila:
        ini, fin = pila.pop()
        if fin <= ini + 1:
            continue
        ax, ay = puntos[ini]
        bx, by = puntos[fin]
        dx, dy = bx - ax, by - ay
        norma = math.hypot(dx, dy)

        peor, indice = -1.0, -1
        for i in range(ini + 1, fin):
            px, py = puntos[i]
            if norma == 0:
                dist = math.hypot(px - ax, py - ay)
            else:
                dist = abs(dy * px - dx * py + bx * ay - by * ax) / norma
            if dist > peor:
                peor, indice = dist, i

        if peor > tolerancia:
            conservar[indice] = True
            pila.append((ini, indice))
            pila.append((indice, fin))

    return [p for p, guardar in zip(puntos, conservar) if guardar]


def cargar_anillos(ruta, tolerancia, recortar_ventana=False):
    with open(ruta, encoding="utf-8") as fh:
        datos = json.load(fh)

    resultado = []
    for feature in datos["features"]:
        for anillo in anillos(feature["geometry"]):
            lons = [c[0] for c in anillo]
            lats = [c[1] for c in anillo]
            if recortar_ventana:
                # se descarta el anillo que no asoma por la ventana visible
                if (max(lons) < VENTANA["lon0"] or min(lons) > VENTANA["lon1"]
                        or max(lats) < VENTANA["lat0"] or min(lats) > VENTANA["lat1"]):
                    continue
            elif min(lons) < LON_MIN_CONTINENTAL:
                # solo territorio continental de Colombia
                continue
            if area_aprox(anillo) < AREA_MINIMA:
                continue
            puntos = [(c[0], c[1]) for c in anillo]
            resultado.append(simplificar(puntos, tolerancia))
    return resultado


def main():
    carpeta = sys.argv[1] if len(sys.argv) > 1 else descargar(
        os.path.join(tempfile.gettempdir(), "croquis_col"))

    pais = cargar_anillos(os.path.join(carpeta, "adm0.json"), TOLERANCIA_PAIS)
    deptos = cargar_anillos(os.path.join(carpeta, "adm1.json"), TOLERANCIA_DEPTOS)
    vecinos = []
    for archivo in ("pan_adm0.json", "ven_adm0.json"):
        ruta = os.path.join(carpeta, archivo)
        if os.path.exists(ruta):
            vecinos += cargar_anillos(ruta, TOLERANCIA_VECINOS, recortar_ventana=True)
        else:
            print("aviso: falta " + archivo + ", se dibuja sin ese vecino")

    todos = [p for anillo in pais for p in anillo]
    lon_min = min(p[0] for p in todos)
    lon_max = max(p[0] for p in todos)
    lat_min = min(p[1] for p in todos)
    lat_max = max(p[1] for p in todos)

    # Correccion del ancho: 1 grado de longitud mide cos(lat) veces 1 de latitud.
    lat_media = (lat_min + lat_max) / 2
    k_lon = math.cos(math.radians(lat_media))

    escala = ANCHO_OBJETIVO / ((lon_max - lon_min) * k_lon)
    alto = (lat_max - lat_min) * escala

    def proyectar(lon, lat):
        x = (lon - lon_min) * k_lon * escala
        y = (lat_max - lat) * escala
        return round(x, 1), round(y, 1)

    def proyectar_rotulo(r):
        x, y = proyectar(r["lon"], r["lat"])
        return {"texto": r["texto"], "tipo": r["tipo"],
                "x": x, "y": y, "anclaje": r["anclaje"]}

    def a_path(anillo):
        partes = []
        for i, (lon, lat) in enumerate(anillo):
            x, y = proyectar(lon, lat)
            partes.append(f"{'M' if i == 0 else 'L'}{x} {y}")
        return "".join(partes) + "Z"

    salida = {
        "ancho": round(ANCHO_OBJETIVO, 1),
        "alto": round(alto, 1),
        # parametros de la proyeccion, para ubicar puntos por lon/lat
        "proyeccion": {
            "lonMin": lon_min, "lonMax": lon_max,
            "latMin": lat_min, "latMax": lat_max,
            "kLon": k_lon, "escala": escala,
        },
        "pais": [a_path(a) for a in pais],
        "departamentos": [a_path(a) for a in deptos],
        "vecinos": [a_path(a) for a in vecinos],
        "lago": {
            "d": a_path(MARACAIBO),
            "rotulos": [proyectar_rotulo(r) for r in MARACAIBO_ROTULOS],
        },
        "geograficos": [proyectar_rotulo(r) for r in ROTULOS_GEOGRAFICOS],
    }

    contenido = (
        "// Croquis de Colombia continental (contorno del pais + departamentos),\n"
        "// ya proyectado a coordenadas SVG.\n"
        "// GENERADO por tools/generar_croquis.py. No editar a mano.\n"
        "// Fuente de los limites: geoBoundaries (gbOpen, COL ADM0 y ADM1, simplified).\n"
        f"const COLOMBIA_GEO = {json.dumps(salida, ensure_ascii=False, separators=(',', ':'))};\n"
    )
    with open(SALIDA, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(contenido)

    print(f"js/colombia.js generado: {len(pais)} anillos de pais, "
          f"{len(deptos)} de departamentos, {len(vecinos)} de paises vecinos, "
          f"1 lago con {len(MARACAIBO_ROTULOS)} rotulos, "
          f"{len(ROTULOS_GEOGRAFICOS)} rotulos geograficos, "
          f"viewBox {salida['ancho']}x{salida['alto']}, "
          f"{os.path.getsize(SALIDA) // 1024} KB")


if __name__ == "__main__":
    main()

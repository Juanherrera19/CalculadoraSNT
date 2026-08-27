# Contexto del Proyecto

## Qué es

Una calculadora web de tarifas de transporte de gas natural para el Sistema
Nacional de Transporte (SNT) de Colombia, que replica en un repositorio
propio del usuario la funcionalidad de:

https://comercialgaskr.github.io/Calculadora-de-Tarifas/

## Para qué sirve

El usuario (identificado en el chat como "Gas Guys") trabaja con tarifas de
transporte de gas y necesitaba:

1. Una calculadora que él controle y pueda mantener/actualizar él mismo
   (en vez de depender del sitio de un tercero).
2. Un Excel de tarifas propio, actualizado y simplificado, para uso interno.

## Qué problema resuelve

El usuario tenía un Excel (`CALCULADORA_TARIFAS_2025.xlsx`, subido al chat,
UUID `d23cc160-f4eb-48f6-9201-751b0b6a8a48`) con **26 hojas**, la mayoría con
tarifas viejas (Resolución 070, Resolución 122, TGI 2024, comparativos de
variación 2025, etc.), y una hoja "Calculadora" **rota**: celda `A1` decía
literalmente `"USD MANUAL"`, tenía errores `#VALUE!`, fórmulas `ArrayFormula`
opacas y texto placeholder `"="` en varias celdas. La hoja "Tabla Tarifas x
Tramo" tenía un mecanismo de selección de ruta por columnas `Y` (0/1) marcadas
**a mano**, y estaban **desactualizadas/inconsistentes** para la ruta de
prueba usada (Jobo → Ballenas_prom): solo 2 de los 5 tramos reales de esa
ruta estaban marcados.

Conclusión: el motor de cálculo original **no era confiable** para replicar
tal cual. Se decidió reconstruir la lógica desde cero (ver
`docs/DECISIONES.md`, decisión D4), usando como fuente de datos únicamente
la hoja **"Tramos SNT 2026"** del Excel original (la más completa y con
nombre de año vigente).

## Cómo empezó

1. El usuario subió `CALCULADORA_TARIFAS_2025.xlsx` y pidió: (a) actualizar y
   simplificar el Excel, y (b) replicar la calculadora del link en su propio
   repositorio local: `C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS`.
2. Se investigó el sitio original con WebFetch (descripción de la página
   renderizada) y se intentó localizar su código fuente en GitHub
   (`github.com/comercialgaskr/Calculadora-de-Tarifas` → **404**, y una
   búsqueda web tampoco lo encontró). **El código fuente real del sitio
   original nunca se pudo inspeccionar** — todo lo implementado aquí es una
   reconstrucción basada en (a) la descripción del WebFetch y (b) los datos
   y fórmulas del Excel del usuario.
3. Se hicieron dos preguntas de aclaración al usuario (vía `AskUserQuestion`):
   - Tecnología para la réplica → el usuario eligió **sitio estático
     HTML/CSS/JS** (no Python/Streamlit).
   - Qué hacer con las hojas viejas del Excel → el usuario eligió
     **eliminarlas** y especificó exactamente 4 hojas nuevas: `CALCULADORA`,
     `Calculo`, `TRAMOS`, `listas`, con las columnas que debía tener `TRAMOS`.
4. Se extrajeron y analizaron los datos de tarifas del Excel (hojas
   `Tramos SNT 2026`, `Tabla Tarifas x Tramo`, `Procesamiento`, `Calculadora`).
5. Se modeló la red de tramos como un grafo (árbol, sin ciclos) y se
   implementó un algoritmo de búsqueda de ruta (BFS + XOR de caminos desde
   una raíz) — la misma lógica se implementó dos veces: en fórmulas de Excel
   (con una matriz de pertenencia precalculada) y en JavaScript (con BFS en
   vivo).
6. Se construyó el Excel simplificado con Python/openpyxl y se validaron las
   fórmulas recalculando con LibreOffice headless.
7. Se construyó el sitio estático y se probó con Playwright (Chromium
   headless), comparando resultados numéricos contra el Excel — coinciden
   exactamente en los 3 escenarios probados.
8. Ambos entregables se enviaron al usuario; el sitio web se escribió además
   directamente en su carpeta local conectada
   (`C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS`) vía el puente de dispositivo
   (`device_commit_files`), y se confirmó su presencia con `device_list_dir`.

## Qué queremos conseguir (objetivo final)

Una calculadora de tarifas de transporte de gas, propia del usuario,
publicable en GitHub Pages, mantenible sin dependencias externas, cuyos
resultados coincidan con la metodología regulatoria real (CREG) — pendiente
de verificación fina de varios parámetros (ver `PENDIENTE DE CONFIRMAR` en
`docs/ESTADO_ACTUAL.md` y `docs/DECISIONES.md`) — y que eventualmente iguale
la cobertura funcional del sitio original (tabla de sensibilidad, base de
datos regulada por ruta, mapa visual del SNT), que hoy **no** está implementada.

## Flujo general del sistema (réplica web)

```
Usuario elige Origen, Destino, %CF, TRM, Impuesto local, % Fomento
        │
        ▼
js/app.js  lee el formulario y llama Tarifas.calcular({...})
        │
        ▼
js/graph.js
  1) findPath(origen, destino) → BFS sobre el grafo de TARIFAS_DATA.segments
     - construye la lista de adyacencia una sola vez al cargar
     - si origen === destino → {ok:false, reason:"ORIGEN_IGUAL_DESTINO"}
     - si no hay camino (redes distintas) → {ok:false, reason:"SIN_RUTA"}
     - si hay camino → {ok:true, edges:[indices de tramos en orden]}
  2) Por cada tramo del camino:
     fijoPonderado    = tramo.fijos * cf
     variablePonderado = tramo.variables * (1 - cf)
     aomIncluido       = tramo.aom            (siempre 100%, no se pondera)
  3) operadoresUsados = transportadores distintos entre los tramos usados
  4) Por cada estampilla (TGI, PROMIGAS) cuyo transportador esté en
     operadoresUsados, se suma UNA VEZ:
     valorEstampilla = estampilla.fijos*cf + estampilla.variables*(1-cf) + estampilla.aom
  5) costoBaseCOP = Σ fijoPonderado + Σ variablePonderado + Σ aomIncluido + Σ estampillas
  6) fomentoCOP  = costoBaseCOP * fomentoPct   (default 0.03)
  7) impuestoCOP = costoBaseCOP * impuestoPct  (0 / 0.02 / 0.06)
  8) totalCOP = costoBaseCOP + fomentoCOP + impuestoCOP
  9) costoBaseUSD = costoBaseCOP / trm ; totalUSD = totalCOP / trm
        │
        ▼
js/app.js pinta: tarjetas de Total COP/USD, texto de ruta, tabla de tramos,
estampillas aplicadas, y filas de costo base/fomento/impuesto/total.
```

## Componentes principales

| Componente | Archivo | Responsabilidad |
|---|---|---|
| Datos | `js/data.js` | `TARIFAS_DATA` = `{segments, estampillas, nodes}` |
| Motor de cálculo | `js/graph.js` | Módulo `Tarifas`: grafo, `findPath`, `calcular` |
| Interfaz | `index.html` | Formulario + zona de resultados (HTML semántico) |
| Interacción | `js/app.js` | Wiring DOM ↔ `Tarifas`, formateo de números, render |
| Estilos | `css/style.css` | Tema claro/oscuro automático, layout responsivo, impresión |
| Documentación de uso | `README.md` | Cómo abrir/publicar, cómo actualizar tarifas, supuestos |

## Tecnologías utilizadas

- **HTML5 / CSS3 / JavaScript (ES6+, vanilla, sin frameworks, sin build step).**
- **Python 3 + openpyxl** — usado (fuera de este repo, en el entorno cloud de
  la sesión anterior) para generar el Excel simplificado mediante un script
  (`build_excel.py`, no incluido en este repositorio).
- **LibreOffice headless** — usado para validar/recalcular las fórmulas del
  Excel generado (no es una dependencia del proyecto, solo se usó como
  herramienta de QA durante la construcción).
- **Playwright + Chromium headless** — usado para probar la réplica web
  (tampoco es una dependencia del proyecto en producción).

## Integraciones externas

Ninguna en tiempo de ejecución. El sitio es 100% estático y calcula todo en
el navegador del usuario, sin llamadas a APIs externas.

Fuentes externas consultadas **durante la construcción** (no integradas al
código):
- `https://comercialgaskr.github.io/Calculadora-de-Tarifas/` (WebFetch, para
  entender qué inputs/outputs debía tener la réplica).
- `https://github.com/comercialgaskr/Calculadora-de-Tarifas` (intento de
  WebFetch → 404; repo no localizado).
- Búsqueda web sobre metodología CREG (cuota de fomento, cargo fijo/variable)
  — no arrojó una fuente única confirmada; resultados relevantes pero no
  leídos en profundidad (ver `docs/DECISIONES.md` D6):
  - Comisión de Regulación de Energía y Gas — Cargos de Transporte (Promigas):
    `https://gestornormativo.creg.gov.co/Publicac.nsf/2b8fb06f012cc9c245256b7b00789b0c/3c16875b523ac8ab0525785a007a61d7/$FILE/D-037-CARGOS%20PROMIGAS.pdf`
  - CREG — Metodología para la comparación de costos:
    `https://gestornormativo.creg.gov.co/Publicac.nsf/1c09d18d2d5ffb5b05256eee00709c02/de588cda703a107d05257863004c2eda/$FILE/D-008-11%20METODOLOGIA%20PARA%20COMPARAR%20COSTOS%20DE%20PRESTACI%C3%93N%20DEL%20SERVICIO%20DE%20GAS%20NATURAL%20Y%20GLP.pdf`
  - CREG — Estructura Tarifaria: `https://creg.gov.co/publicaciones/7826/estructura-tarifaria/`

## Archivos importantes

Ver tabla en "Componentes principales" arriba. Adicionalmente:

- **`CALCULADORA_TARIFAS_2026.xlsx`** — el Excel simplificado. **No está en
  este repositorio.** Se entregó al usuario por el chat de Cowork
  (`SendUserFile`), no se copió a esta carpeta. `PENDIENTE DE CONFIRMAR`
  dónde lo guardó el usuario finalmente.
- **`CALCULADORA_TARIFAS_2025.xlsx`** (original, 26 hojas) — el archivo que el
  usuario subió al inicio de la conversación. Fuente de todos los datos de
  tarifas usados. No está en este repositorio; solo se tuvo acceso a él
  dentro de la sesión anterior de Cowork.

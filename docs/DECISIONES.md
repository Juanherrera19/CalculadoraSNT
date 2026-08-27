# Decisiones Tomadas

Cada decisión incluye motivo, alternativas consideradas y qué se debe
mantener a futuro. **No propongas de nuevo una alternativa descartada sin
explicar por qué debería reconsiderarse.**

---

## D1. Tecnología de la réplica web: HTML/CSS/JS estático (sin framework, sin build)

**Decisión:** sitio 100% estático — HTML, CSS y JavaScript vanilla, sin
frameworks ni paso de compilación.

**Motivo:** el usuario lo eligió explícitamente vía `AskUserQuestion` cuando
se le presentaron dos opciones. Coincide con la tecnología del sitio
original (GitHub Pages), es directamente publicable ahí, y no requiere
`npm install` ni servidor para funcionar.

**Alternativa considerada y descartada:** app en Python con Streamlit
(se ofreció porque la carpeta destino está bajo `PYTHON\PROGRAMAS`). Se
descartó porque requiere correr un servidor local y no se publica en
GitHub Pages de la misma forma.

**Mantener a futuro:** no introducir un framework (React, Vue, etc.) ni un
bundler salvo que el usuario lo pida explícitamente. Si se agregan las
funcionalidades pendientes (mapa, sensibilidad, tabla de rutas), hacerlo
también en HTML/CSS/JS vanilla para ser consistentes.

---

## D2. Alcance del Excel simplificado: eliminar hojas viejas, dejar solo 4

**Decisión:** el Excel simplificado tiene **exactamente 4 hojas**:
`CALCULADORA`, `Calculo`, `TRAMOS`, `listas`. Se eliminaron las 22 hojas
restantes del archivo original (resoluciones viejas, comparativos, cuadros
históricos de TGI/Promigas 2024-2025, etc.).

**Motivo:** decisión explícita del usuario vía `AskUserQuestion`
("ELIMINARLAS, DEJAR SOLO LO VIGENTE"), con especificación exacta del
propósito de cada hoja y de las columnas de `TRAMOS`
(`Ruta, Origen, Destino, Fijos, Variables, AOM, Cap Disp Flujo,
Cap D Contra Flujo, Transportador, Tramo` + tabla auxiliar
`Transportador, Fijos, Variables, AOM` para estampillas).

**Alternativa considerada y descartada:** mover las hojas viejas a una hoja
de archivo/histórico en vez de borrarlas. El usuario prefirió eliminarlas.

**Mantener a futuro:** no volver a agregar hojas históricas al Excel salvo
pedido explícito del usuario. Si se necesita el histórico, está en el
archivo original `CALCULADORA_TARIFAS_2025.xlsx` (fuera de este repo).

---

## D3. Fuente de datos de tarifas: hoja "Tramos SNT 2026" (no "Procesamiento" ni "Tabla Tarifas x Tramo")

**Decisión:** todos los tramos (34) y estampillas (2) usados en ambos
entregables provienen de la hoja **"Tramos SNT 2026"** del Excel original.

**Motivo:** era la hoja más completa (incluye los 2 tramos de PROMIORIENTE
que "Procesamiento" omitía) y la más "vigente" por nombre. Las otras hojas
candidatas tenían problemas:
- `Procesamiento`: no incluye PROMIORIENTE; columnas `Cap Disp Flujo`/
  `Cap D Contra Flujo` vacías o en cero.
- `Tabla Tarifas x Tramo`: mecanismo de selección de ruta por columna `Y`
  marcada a mano, **desactualizado/inconsistente** (verificado: para la
  ruta Jobo→Ballenas_prom solo 2 de los 5 tramos reales estaban marcados).
- `Calculadora`: hoja rota (`#VALUE!`, `ArrayFormula` opacas, celda A1 =
  `"USD MANUAL"`, TRM inconsistente entre `Tabla Tarifas x Tramo!C1`=4000 y
  `Calculadora!B8`=3693.6).

**Alternativa considerada:** ninguna otra fuente de datos fue seriamente
considerada — las tres hojas alternativas se descartaron por las razones
anteriores, no por preferencia.

**Punto abierto (no es descarte, es duda real):** al elegir "Tramos SNT
2026" en vez de replicar el comportamiento de "Procesamiento", se incluyeron
los tramos de PROMIORIENTE que el motor "activo" original no usaba. Esto
está marcado como `PENDIENTE DE CONFIRMAR` en `docs/ESTADO_ACTUAL.md` — no
es una decisión cerrada, es un supuesto a validar con el usuario.

**Mantener a futuro:** si se actualizan tarifas, actualizar `TRAMOS` (Excel)
y `js/data.js` (web) **juntos**, a partir de la misma fuente, para que no
queden desincronizados.

---

## D4. Motor de cálculo reconstruido desde cero (no reverse-engineered del Excel viejo)

**Decisión:** la fórmula de tarifa se diseñó de nuevo, no se copió de las
fórmulas rotas del Excel original.

**Fórmula implementada** (igual en Excel y en `js/graph.js`):

```
fijo_ponderado(tramo)    = tramo.Fijos * %CF
variable_ponderado(tramo) = tramo.Variables * (1 - %CF)
aom(tramo)                = tramo.AOM                      # SIEMPRE 100%, no se pondera por %CF

subtotal_tramos = Σ fijo_ponderado + Σ variable_ponderado + Σ aom   (sobre los tramos de la ruta)

para cada transportador distinto usado en la ruta (TGI y/o PROMIGAS):
    estampilla = estampilla.Fijos*%CF + estampilla.Variables*(1-%CF) + estampilla.AOM
    (se suma UNA SOLA VEZ por transportador, sin importar cuántos tramos suyos se usen)

costo_base_COP = subtotal_tramos + Σ estampillas
cuota_fomento_COP  = costo_base_COP * %fomento     (default 3%, editable)
impuesto_local_COP = costo_base_COP * %impuesto    (0% / 2% / 6%, seleccionable)
total_COP = costo_base_COP + cuota_fomento_COP + impuesto_local_COP

costo_base_USD = costo_base_COP / TRM
total_USD      = total_COP / TRM
```

> ⚠️ **SUPERSEDIDA PARCIALMENTE POR D8** (2026-08-26): la parte del cálculo de
> tramos y estampillas sigue igual, pero la cuota de fomento y el impuesto
> local **ya no se calculan sobre el costo base global** — se liquidan por
> transportador. Ver D8.

**Motivo:** las fórmulas originales estaban rotas (ver D3) y el mecanismo de
selección de ruta era manual y estaba desactualizado. No había una base
confiable para "traducir" tal cual.

**De dónde salió cada pieza:**
- Que AOM no se pondera por %CF: confirmado observando las fórmulas vivas
  de `Tabla Tarifas x Tramo` (`M=D*C2`, `N=E*(1-C2)`, `O=F/1` sin ponderar) —
  esto sí se tomó del archivo original porque esa parte de la lógica era
  coherente y verificable.
- Que la estampilla se aplica una vez por transportador usado: inferido de
  la estructura del archivo original (filas "Estampilla" separadas por
  transportador) + descripción del sitio original (cargos "TGI Delta branch
  stamp" y "Promigas branch charge" como líneas separadas).
- Cuota de fomento 3%, impuesto local 0/2/6%, combos de %CF: tomados de la
  **descripción del sitio original obtenida por WebFetch**, no de un
  documento CREG leído en detalle. Ver D6 para el detalle de este supuesto.

**Alternativa considerada y descartada:** reverse-engineer las fórmulas
`ArrayFormula`/`FILTER`/`VSTACK` de la hoja `Procesamiento`/`Calculadora`
originales. Descartada porque esas fórmulas ya producían errores y datos
inconsistentes en el archivo del usuario — no eran una base confiable.

**Mantener a futuro:** si se corrige algún parámetro tras verificar contra
CREG, actualizar la fórmula en **ambos** lugares (hoja `Calculo` del Excel
y `js/graph.js`).

---

## D5. Algoritmo de ruteo: BFS + XOR de caminos desde una raíz (no un algoritmo de LCA explícito)

**Decisión:** la red de tramos se modela como grafo no dirigido. Se verificó
que tiene **3 componentes conexas, cada una un árbol** (sin ciclos):

| Componente | Nodos | Aristas | Raíz elegida |
|---|---|---|---|
| TGI | 26 | 25 | `Ballenas_tgi` |
| PROMIGAS | 8 | 7 | `Ballenas_prom` |
| PROMIORIENTE | 3 | 2 | `Barrancabermeja` |

(nodos = aristas + 1 en cada una → confirma que son árboles, sin ciclos).

Para encontrar la ruta entre dos nodos:
- **En Excel:** se precalculó (en Python, fuera del workbook) el conjunto de
  tramos entre cada nodo y la raíz de su componente (BFS), y se guardó como
  una matriz estática 37 nodos × 34 tramos (0/1) en la hoja `Calculo`
  (filas 80-117, ver `docs/CONTEXTO_PROYECTO.md`/estructura de archivos).
  El tramo `i` pertenece a la ruta Origen→Destino si
  `ABS(flag_origen_i - flag_destino_i) = 1` (diferencia simétrica / XOR).
- **En JS (`js/graph.js`):** BFS en vivo en cada cálculo (`findPath`), más
  simple porque no hay que precalcular nada — JS puede recorrer el grafo
  directamente.

**Motivo:** en un árbol, el camino entre dos nodos es único y es exactamente
la diferencia simétrica de sus caminos hacia cualquier raíz común — evita
implementar un algoritmo de ancestro común más complejo.

**Verificado con caso de prueba:** Medellín → Cali (ambos en el árbol TGI,
en ramas distintas que divergen en el nodo "Sebastopol"). El resultado
excluyó correctamente los tramos troncales comunes (`Ballenas_tgi-Barranca`,
`Barranca-Sebastopol`) y devolvió solo los tramos de cada rama — sin
necesitar lógica adicional de "ancestro común".

**Importante — validación de red:** el XOR **no detecta por sí solo** si
origen y destino están en componentes distintas (produce un resultado sin
sentido, no un error). Por eso se agregó una verificación explícita de
"misma red" (comparar el id de componente) **antes** de aplicar el XOR, en
ambos entregables. Ver `docs/PROBLEMAS_Y_SOLUCIONES.md`.

**Alternativa considerada:** ninguna otra alternativa de ruteo se evaluó en
profundidad — el árbol + XOR fue la primera solución y se validó
correctamente, no hubo necesidad de buscar otra.

**Mantener a futuro:** si en algún momento se agregan tramos que crean un
**ciclo** en la red (dos caminos posibles entre dos puntos), este enfoque
deja de ser válido y habría que rediseñar el ruteo (ej. Dijkstra si hay
varios caminos con distinto costo). Hoy la red es un árbol puro — no asumir
que seguirá siéndolo si se agregan tramos nuevos sin volver a verificarlo.

---

## D6. Parámetros regulatorios tratados como configurables/asumidos, no verificados

**Decisión:** los siguientes valores se implementaron como **valores por
defecto editables**, no como constantes verificadas:
- Cuota de fomento: 3% (input numérico editable en ambos entregables).
- Impuesto local: 0% / 2% / 6% (selector, ambos entregables).
- Combos de %CF: 100/0, 85/15 (marcado como estándar), 70/30, 50/50, 30/70,
  15/85, 0/100.

**Motivo:** se tomaron de la **descripción del sitio original** obtenida por
WebFetch (no de su código fuente, inaccesible — ver `docs/CONTEXTO_PROYECTO.md`),
más nombres de hojas del Excel original (`RES 122 100-0`, `RES 122 0-100`,
`... Pareja`) que sugerían ese conjunto de combos. Una búsqueda web sobre la
metodología CREG no confirmó estos números con una fuente primaria leída en
detalle (se encontraron documentos CREG relevantes pero no se procesaron a
fondo por alcance/tiempo).

**Alternativa considerada:** leer en profundidad los PDFs de CREG encontrados
por WebSearch (ver enlaces en `docs/CONTEXTO_PROYECTO.md`, sección
"Integraciones externas") para confirmar los porcentajes exactos. No se hizo
en esta conversación — queda como tarea pendiente (`docs/PROXIMOS_PASOS.md`).

**Mantener a futuro:** **no** afirmar frente al usuario que estos valores
están confirmados contra la resolución CREG vigente — seguirán marcados
`PENDIENTE DE CONFIRMAR` hasta que alguien (usuario o Claude Code, leyendo
los PDFs) los verifique explícitamente.

---

## D7. Entregables separados: el Excel no se copia al repositorio

**Decisión:** el Excel simplificado se entregó **solo por el chat**
(`SendUserFile`), no se escribió dentro de
`C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS`. Solo los archivos de la
réplica web (`index.html`, `css/`, `js/`, `README.md`) se escribieron en esa
carpeta.

**Motivo:** el pedido original del usuario tenía dos partes separadas —
"actualizar el Excel" y "replicar la calculadora en mi repositorio" — se
interpretaron como dos entregables independientes, no como que el Excel
debía vivir dentro del repo de código.

**Alternativa considerada:** copiar también el Excel dentro del repo (p. ej.
como referencia de datos). No se hizo porque no fue pedido así.

**Mantener a futuro:** si el usuario pide integrar el Excel al repo (por
ejemplo como fuente única de verdad de las tarifas, o para versionarlo con
git), es una decisión nueva, no revertir esta sin que el usuario lo pida.

---

## D8. Cuota de fomento e impuesto local se liquidan POR TRANSPORTADOR

**Decisión (2026-08-26, instrucción explícita del usuario):** la cuota de
fomento y el impuesto local dejan de calcularse una sola vez sobre el costo
base global de la ruta. Cada transportador liquida **su propia** estampilla,
**su propia** cuota de fomento y **su propio** impuesto local sobre **su
propia base**.

**Fórmula implementada** (idéntica en `js/graph.js` y en el Excel):

```
Para cada transportador T presente en la ruta:
    base_T     = Σ (Fijos*%CF + Variables*(1-%CF) + AOM) de los tramos de T
                 + estampilla_T          # una sola vez, si T tiene estampilla
    fomento_T  = base_T * %fomento_T
    impuesto_T = base_T * %impuesto_T
    total_T    = base_T + fomento_T + impuesto_T

costo_base_COP = Σ base_T
total_COP      = Σ total_T
```

**Porcentajes por transportador:**

| Transportador | % Cuota de fomento | % Impuesto local | ¿Editable? |
|---|---|---|---|
| TGI | 3% (default) | 0% / 2% / 6% (default 0%) | **Sí**, desde la interfaz |
| PROMIGAS | 3% | 6% | No — automático |
| PROMIORIENTE | 3% | 6% | No — automático |

**Motivo:** instrucción directa del usuario. Textual: *"todo lo que sea
PROMIGAS tiene cuota de fomento 3% impuestos 6% fijos, pero en caso de tener
TGI si debe dar la opcion de cambiar estos impuestos... en caso de que una
ruta pase por ambos, debe cobrarse cada estampilla, cada cuota de fomento y
cada impuesto independiente para cada transportador"*. El tratamiento de
PROMIORIENTE (igual a PROMIGAS: 3% / 6% fijos) también lo confirmó el usuario
al preguntársele explícitamente, junto con la decisión de mantener sus tramos
en el cálculo (cierra el punto abierto de D3).

**Alternativa considerada y descartada:** mantener el cálculo global anterior
y ofrecer un único par de porcentajes para toda la ruta. Descartada porque no
refleja que cada transportador liquida sus propios cargos.

**Dónde vive cada cosa:**
- Web: constante `CONFIG_TRANSPORTADOR` al inicio de `js/graph.js`; el
  resultado por transportador viaja en `r.porTransportador` y `js/app.js` lo
  pinta como tabla de desglose.
- Excel: porcentajes fijos en `Calculo!B10` (fomento) y `Calculo!B11`
  (impuesto); porcentajes editables de TGI en `Calculo!B8`/`B9`, alimentados
  desde `CALCULADORA!C9`/`C10`. El desglose está en `Calculo!A57:L62` y se
  espeja en `CALCULADORA!A16:L21`. Se regenera con
  `python tools/actualizar_excel.py`.

**Verificado:** 4 escenarios recalculados en Excel real (vía COM) y comparados
con el motor JS — coinciden con diferencia < 1e-11 COP. Ver
`docs/ESTADO_ACTUAL.md`.

**Mantener a futuro:** cualquier ajuste de esta fórmula debe hacerse en
`js/graph.js` **y** en `tools/actualizar_excel.py`, y volver a correr el
script. Agregar un transportador nuevo implica agregarlo en ambos sitios
(`CONFIG_TRANSPORTADOR` y la lista `TRANSPORTADORES` del script).

---

## D9. `js/data.js` se genera desde la hoja TRAMOS, no se edita a mano

**Decisión (2026-08-26):** `js/data.js` pasa a ser un archivo **generado** por
`tools/sincronizar_datos.py` a partir de la hoja `TRAMOS` de
`docs/CALCULADORA_TARIFAS_2026.xlsx`.

**Motivo:** al comparar los dos motores aparecieron diferencias de ~7e-7 COP
porque `js/data.js` tenía las tarifas truncadas a 6 decimales mientras la hoja
`TRAMOS` las guarda completas (p. ej. `1456.558904` vs `1456.5589041096`). La
diferencia es irrelevante en pesos, pero rompía la regla de que ambos
entregables deben coincidir exactamente. Generar el archivo elimina la
posibilidad de que vuelvan a desincronizarse.

**Detalle:** la hoja `TRAMOS` no tiene la columna `tipo` (`Punto` /
`Intermedio`) que sí estaba en `js/data.js`. El script **conserva** ese campo
leyéndolo del `data.js` anterior, indexado por `ruta`, para no perder
información. Hoy ese campo no lo usa nadie en el cálculo. Si algún día
`TRAMOS` incorpora esa columna, leerla desde ahí y borrar esa función.

**Mantener a futuro:** no editar `js/data.js` a mano. Actualizar `TRAMOS` y
correr `python tools/sincronizar_datos.py`.

---

## D10. Origen y Destino en redes distintas: ruta COMBINADA por el punto de entrada de cada red

**Decisión (2026-08-26, instrucción explícita del usuario):** cuando Origen y
Destino no pertenecen a la misma red, **ya no se devuelve "sin ruta"**. Se
arma una **ruta combinada**: se calcula la ruta de cada punto hasta el punto
de entrada de **su propia** red, y se suman las dos. Se cobran **ambas
estampillas, ambas cuotas de fomento y ambos impuestos**, cada uno con los
porcentajes de su transportador (D8).

Textual del usuario: *"en caso de no pertenecer a la misma red, deben hacerse
las 2 rutas hasta cada respectivo ballena, y agregar ambas estampillas, ambas
cuotas y ambos impuestos"*.

**Puntos de entrada por red** — son exactamente las mismas raíces que ya usaba
la matriz de pertenencia del Excel (verificado: son las tres filas con todos
los flags en 0):

| Red | Punto de entrada |
|---|---|
| TGI | `Ballenas_tgi` |
| PROMIGAS | `Ballenas_prom` |
| PROMIORIENTE | `Barrancabermeja` |

⚠️ El usuario habló de *"cada respectivo ballena"*, que cubre TGI y PROMIGAS.
Para **PROMIORIENTE** no hay un "Ballenas": se usó `Barrancabermeja`, que es
la raíz de esa red (los dos tramos son Barrancabermeja→Payoa→Bucaramanga).
`PENDIENTE DE CONFIRMAR` con el usuario que ese sea el punto de entrada
correcto para las rutas combinadas que tocan PROMIORIENTE.

**Implementación:**
- Web (`js/graph.js`): constante `PUNTOS_ENTRADA`; `findPath` detecta la red de
  cada extremo, y si difieren devuelve
  `{tipo:"COMBINADA", edges:[...rutaOrigen, ...rutaDestino], combinada:{...}}`.
  El resto del cálculo no cambió: al agrupar por transportador, las dos
  estampillas / fomentos / impuestos salen solos.
- Excel: la columna `Incluido` (`Calculo!G21:G54`) pasó de
  `ABS(flag_origen - flag_destino)` a
  `IF(misma_red, ABS(fo - fd), fo + fd)`. Como la matriz guarda el camino de
  cada nodo hasta la raíz de **su** red y las redes son disjuntas, la suma
  `fo + fd` es exactamente la unión de las dos rutas. `Calculo!B19` indica si
  la ruta es `DIRECTA` o `COMBINADA`.

**Caso degenerado conocido:** si Origen y Destino **son** los dos puntos de
entrada (p. ej. `Ballenas_tgi` → `Ballenas_prom`), las dos rutas tienen 0
tramos y el total da **0,00 COP**, sin estampillas. Es coherente con la regla
de que la estampilla se cobra por transportador *usado*, pero
`PENDIENTE DE CONFIRMAR` si el usuario espera que ahí se cobren igual las dos
estampillas.

**Mantener a futuro:** este comportamiento reemplaza el mensaje de error de
`docs/PROBLEMAS_Y_SOLUCIONES.md` P4. La validación de "misma red" **sigue
siendo necesaria** — ya no para bloquear, sino para decidir entre XOR
(misma red) y suma (redes distintas). No volver a "sin ruta".

---

## D11. Mapa del SNT: SVG con layout calculado, sin coordenadas escritas a mano

> ⚠️ **SUPERSEDIDA POR D13** (2026-08-27): el usuario pidio el mapa sobre el
> croquis geografico de Colombia, con las coordenadas reales de cada punto.
> El layout de arbol automatico se reemplazo. Se conserva el registro para no
> reproponer el diagrama topologico como si fuera nuevo.

**Decisión (2026-08-26):** el mapa (`js/mapa.js`) dibuja las tres redes como
árboles en SVG, calculando el layout **en tiempo de ejecución** a partir de
`TARIFAS_DATA`. No hay coordenadas geográficas ni posiciones fijas en el
código.

**Motivo:** si se agregan, quitan o renombran tramos en la hoja `TRAMOS`, el
diagrama se reacomoda solo — no hay que mantener un segundo archivo de
posiciones en sincronía con los datos. Es un diagrama de topología (quién se
conecta con quién), no un mapa geográfico.

**Cómo funciona el layout:** para cada red se recorre el árbol desde su punto
de entrada (D10); `x` = profundidad × 168 px, y las filas se asignan con el
algoritmo clásico de árbol — las hojas ocupan filas consecutivas y cada nodo
interno se centra frente a sus hijos. Los hijos se ordenan alfabéticamente
para que el dibujo sea estable entre cargas. Las tres redes se apilan
verticalmente con una separación.

**Interacción:** clic (o Enter con foco de teclado) sobre un punto lo asigna
alternando Origen → Destino → Origen. La ruta calculada se resalta en naranja,
y en las rutas combinadas se marcan además los dos puntos de entrada con
borde punteado.

**Alternativa considerada y descartada:** un mapa geográfico real de Colombia
con coordenadas de cada punto. Descartada porque no se tienen las coordenadas,
y porque para leer la tarifa importa la topología, no la geografía. Si el
usuario quiere el mapa geográfico, es trabajo nuevo (haría falta la lista de
lat/lon de los 37 puntos).

**Mantener a futuro:** el mapa asume que cada red es un **árbol**. Si se
agrega un tramo que cree un ciclo, el layout dejaría de ser correcto (igual
que el ruteo — ver D5).

---

## D12. PROMIORIENTE (y los demas transportadores) quedan fuera de todo el proyecto

**Decision (2026-08-27, instruccion explicita del usuario):** *"por ahora
descartemos completamente promoriente y las demas, solo usemos promigas y tgi
para todo"*. Solo se modelan **TGI** y **PROMIGAS**.

Esto **revierte** la respuesta anterior del usuario del 2026-08-26 ("Si,
mantenerlos", ver D3 y `docs/ESTADO_ACTUAL.md`). Manda la instruccion mas
reciente.

**Que se quito:**
- Los 2 tramos de PROMIORIENTE (`Barrancabermeja - Payoa`, `Payoa -
  Bucaramanga`) se **borraron de la hoja `TRAMOS`**, que es la fuente de
  verdad. Con eso desaparecieron tambien sus 3 nodos (Barrancabermeja, Payoa,
  Bucaramanga) de todos los desplegables y del mapa.
- `CONFIG_TRANSPORTADOR` y `PUNTOS_ENTRADA` en `js/graph.js`.
- `CONFIG` y `ORDEN_TRANSPORTADORES` en `tools/actualizar_excel.py`.
- Textos de la interfaz, la leyenda del mapa y el README.

**Estado despues del cambio:** 32 tramos (25 TGI + 7 PROMIGAS) y 34 nodos.
El SNT real tiene ademas PROGASUR, TRANSMETANO, COINOGAS y TRANSOCCIDENTE
(ver la tabla del mapa oficial); ninguno esta modelado.

**Respaldo:** el archivo previo, con PROMIORIENTE, quedo en
`docs/CALCULADORA_TARIFAS_2026_respaldo_v2_con_promioriente.xlsx`. Para
volver a incluirlo: restaurar esas 2 filas en `TRAMOS`, renumerar la columna
`Tramo`, agregar el transportador a los dos archivos de configuracion y correr
`python tools/actualizar_excel.py` y `python tools/sincronizar_datos.py`.

**Mantener a futuro:** si se agrega un transportador nuevo hay que tocarlo en
**los dos** lugares (`js/graph.js` y `tools/actualizar_excel.py`), agregar sus
tramos a `TRAMOS` y las coordenadas de sus puntos a `js/ubicaciones.js`.

---

## D13. Mapa geografico: croquis real de Colombia con las coordenadas de cada punto

**Decision (2026-08-27, instruccion explicita del usuario):** el mapa se
rehizo desde cero como un **mapa geografico** — el croquis de Colombia
continental con sus limites departamentales, y encima los gasoductos ubicados
por lat/lon, replicando el mapa oficial del SNT que el usuario envio en foto.
Reemplaza el diagrama topologico de D11.

**Como se arma:**
- `tools/generar_croquis.py` descarga los limites de **geoBoundaries**
  (gbOpen, COL ADM0 y ADM1, version *simplified*; dominio publico), los
  simplifica con Ramer-Douglas-Peucker, los proyecta y escribe
  `js/colombia.js` (33 KB, 1 anillo de pais + 32 de departamentos).
- Proyeccion **equirectangular** con el ancho corregido por el coseno de la
  latitud media. Colombia esta sobre el ecuador, asi que la distorsion es
  minima y a cambio ubicar un punto es aplicar la misma formula a su lon/lat.
- Se excluye el archipielago de San Andres y Providencia (lon < -80): esta muy
  lejos del continente y encogeria el resto del mapa.

**Coordenadas de los puntos — `js/ubicaciones.js`:** ⚠️ son **aproximadas**.
Se ubicaron por el municipio o campo al que corresponde cada nombre, tomando
como referencia el mapa oficial. **No** provienen de una fuente
georreferenciada del operador. No se usan para calcular la tarifa (eso solo
depende de `js/data.js`); son solo para dibujar. Cartagena y Red Mamonal se
corrieron ~5 km tierra adentro porque el contorno simplificado recorta la
bahia y quedaban sobre el mar.

Esto **rompe a proposito** la regla de D11 de "no coordenadas escritas a
mano": un mapa geografico las necesita. La regla que se mantiene es que
`js/colombia.js` sigue siendo generado, no editado.

**Colores** — tomados de la lamina oficial del SNT que envio el usuario
(2026-08-27, segunda foto):

| Elemento | Color |
|---|---|
| TGI | `#e2231a` (rojo) |
| PROMIGAS | `#1c4f9c` (azul) |
| Relleno del pais | `#c3c9dd` (azul lavanda) |
| Limites departamentales | `#ffffff` |
| Fuera del pais | `#fbfbfc` |
| Panama / Venezuela | `#e4e6ee` |
| Lago de Maracaibo | `#dfe6f2` |
| Bloques marinos | `#f5d24a` |
| Localizador (pais en pequeno) | `#8a6f55` (cafe) |

**Contexto geografico** (2026-08-27, pedido del usuario): ademas de Colombia,
el mapa dibuja **Panama y Venezuela** (geoBoundaries PAN/VEN ADM0, recortados a
la ventana visible), el **lago de Maracaibo** y los **bloques marinos** — los
poligonos amarillos de la lamina.

Los paises vecinos van **sin nombre**; el lago si lleva el suyo.

> ⚠️ **Los bloques marinos se eliminaron** el 2026-08-27 a peticion del usuario
> ("nunca me terminaron de gustar"). Eran los cuatro poligonos amarillos
> aproximados a ojo. Al quitarlos, el recorte automatico se aprovecho: el mapa
> subio y se corrio a la izquierda, y paso de 606 a **512 unidades de lado**.
> Como efecto secundario, la esquina inferior **izquierda** dejo de estar libre
> y la caja de referencias se mudo a la **derecha** (D16).

El recorte cuadrado tiene en cuenta el lago y su rotulo, no solo los puntos de
la red, para que no queden cortados por el borde.

**Trazado de los ductos:** los tramos **no** se dibujan como rectas. Un
gasoducto rodea sierras, sigue valles y bordea la costa, y una recta entre sus
extremos se sale visiblemente del corredor real (a veces hasta del territorio).
El trazo se arma en dos pasos:

1. Se toman los **puntos de paso** de `TRAZADOS` (en `js/ubicaciones.js`), que
   son waypoints leidos de la lamina. Hoy 21 de los 32 tramos tienen. Los que
   no tienen usan un solo punto intermedio desviado de la recta, con la
   desviacion sacada de un **hash del nombre del tramo** (no de
   `Math.random()`): asi el dibujo es identico entre recargas y entre
   navegadores, que es lo que uno espera de un mapa.
2. Esa polilinea se suaviza con una **spline de Catmull-Rom** convertida a
   curvas de Bezier, que pasa exactamente por todos los puntos.

⚠️ Los waypoints son **aproximados**, trazados a ojo sobre la lamina; no son el
recorrido georreferenciado del ducto. Solo afectan el dibujo.

Verificado: los 32 trazos siguen tocando exactamente sus dos puntos y ninguno
se sale del recorte.

**Efecto de movimiento:** cada tramo se dibuja dos veces — una linea base
siempre visible y encima una linea punteada blanca que solo aparece cuando el
tramo esta en la ruta, animando `stroke-dashoffset` para que el guion corra en
el sentido origen → destino. Se apaga con `prefers-reduced-motion: reduce`.

> ⚠️ El usuario pidio "el mismo efecto de movimiento del repositorio que te
> mande". **El codigo fuente de ese repositorio nunca se pudo inspeccionar**
> (404, ver `docs/PROBLEMAS_Y_SOLUCIONES.md` P5), asi que este efecto es una
> reconstruccion razonable, no una copia. `PENDIENTE DE CONFIRMAR` con el
> usuario si es el efecto que esperaba.

**Etiquetas:** varios puntos estan a pocos kilometros entre si (el valle de
Aburra tiene 6 en ~20 px). Los nombres se separan con **relajacion iterativa**
sobre el ancho **medido** del texto (`getComputedTextLength()`), y cuando un
nombre queda corrido se une a su punto con una linea guia. La medicion se hace
dentro de un `requestAnimationFrame`: antes del layout esa funcion devuelve 0
y el desapilado trabajaria con anchos inventados (fallo real durante la
construccion).

**Recorte cuadrado + localizador** (2026-08-27, pedido del usuario): la red
ocupa poco mas de un tercio del pais, asi que mostrar el croquis completo
dejaba mucho vacio. El mapa se recorta al **cuadrado** que envuelve todos los
puntos y sus nombres (512x512 en vez de 668x910), y arriba a la derecha se
dibuja un **localizador**: el pais completo en pequeno con un marco azul
senalando la parte que se esta viendo.

El recorte se calcula, no se fija a mano: sale de la caja que ocupan los
puntos y sus etiquetas ya desapiladas. Si el localizador fuera a taparle el
nombre a algun punto, el recorte se ensancha hacia la derecha para hacerle
sitio en vez de superponerse. Verificado: 0 puntos tapados, 0 contenido fuera
del recorte.

**Mantener a futuro:** al agregar un punto nuevo hay que darle lat/lon en
`js/ubicaciones.js`, o el mapa lo omite y avisa por consola. El recorte y el
localizador se reajustan solos.

---

## D14. Paleta de la interfaz: azul marino, blanco y grises, con verde y azul de acento

**Decision (2026-08-27, instruccion explicita del usuario):** se rediseñaron
los colores de toda la pagina tomando como referencia una captura que envio el
usuario (solo los colores, no la estructura). Se reemplazo el esquema anterior
de azul marino + naranja.

**TEMA CLARO FIJO** (correccion del mismo dia): la primera version definia
tambien un bloque `@media (prefers-color-scheme: dark)`, asi que en un equipo
con el sistema en modo oscuro la pagina se veia oscura — no era lo que el
usuario pedia. Se **elimino ese bloque por completo** y se agrego
`color-scheme: light` en `:root`, que ademas obliga a los controles nativos
(desplegables, campos numericos, barras de desplazamiento) a dibujarse claros
aunque el sistema este en oscuro. Verificado emulando un sistema en modo
oscuro: la pagina se mantiene clara.

Si algun dia se quiere volver a tener modo oscuro, hay que reintroducir un
bloque que redefina **todas** las variables de `:root`, no solo algunas.

| Uso | Color |
|---|---|
| Barra superior | `#0f2544` |
| Boton primario / tarjeta total COP | `#123a63` |
| Acento positivo (tarjeta total USD, origen) | `#2e9e63` |
| Acento informativo (avisos, etiqueta editable) | `#1d6fa5` |
| Fondo / superficie | `#f1f4f8` / `#ffffff` |
| Texto / texto atenuado | `#16283f` / `#64748b` |

Todo pasa por variables CSS en `:root`. **Excepcion deliberada:** los colores
del mapa (relleno, TGI rojo, PROMIGAS azul, localizador cafe) no siguen la
paleta de la interfaz — son los de la lamina oficial del SNT (D13).

**Mantener a futuro:** no usar colores en crudo en el CSS; agregar la variable
a `:root`.

---

## D15. Estructura de la tabla de resultados

**Decision (2026-08-27, el usuario dio la estructura exacta):** las dos tablas
que habia (detalle por tramo + desglose por transportador + resumen) se
reemplazaron por **una sola tabla** con seis columnas:

`Tramo | Transportador | Fijos (COP) | Variables (COP) | AOM (COP) | Total tramo (COP)`

Se quito el sufijo "pond." de los encabezados y se agrego la columna **Total
tramo**. El orden de los renglones es el que pidio el usuario:

1. Un renglon por tramo de la ruta.
2. `Subtotal (COP)`.
3. Un bloque por transportador usado: `Estampilla`, `Cuota de fomento`,
   `Imp. Transporte` (con el porcentaje aplicado entre parentesis).
4. `Total (COP)`.
5. Un renglon final `USD` con el equivalente de cada columna.

**Dos detalles que hubo que resolver:**

- La **estampilla se desglosa** en Fijos / Variables / AOM (se agrego
  `estampillaDetalle` a `js/graph.js`), porque la plantilla del usuario la
  muestra asi: `Estampilla | PROMIGAS | $693,03 | $179,31 | $97,00 | $969,34`.
- La **cuota de fomento y el impuesto NO tienen desglose por componente**: se
  liquidan sobre la base completa del transportador. Sus renglones dejan
  vacias las tres columnas de componentes y solo llenan la de total.
  Repartirlos entre Fijos/Variables/AOM seria inventar un dato.

Consecuencia: en el renglon `Total (COP)`, **cada columna suma exactamente lo
que tiene encima** (tramos + estampillas), pero la ultima columna es mayor que
la suma de las otras tres, porque incluye ademas fomento e impuesto. Es
correcto, y esta comentado en `js/app.js` para que no se "corrija" por error.
Verificado: las tres columnas cuadran con la suma de sus renglones.

---

## D16. Estructura de la pagina: sin numeros, mapa bajo la ruta, paneles plegables

**Decision (2026-08-27, instruccion del usuario):** se reorganizo la pagina.

1. **Sin numeracion en los titulos.** "1. Ruta y opciones" / "2. Resultado" /
   "3. Mapa del SNT" pasaron a "Ruta y opciones" y "Resultado". El mapa dejo de
   tener titulo propio porque dejo de ser una seccion.

2. **El mapa se movio dentro del panel de resultado**, justo debajo de la linea
   `Ruta:`. Ya no es un panel a lo ancho de la pagina.

3. **La ayuda y la leyenda del mapa viven en una caja plegable** anclada a la
   esquina inferior izquierda del propio mapa (`.caja-mapa`, posicionada
   absoluta sobre `.mapa-marco`). Se pliega y despliega desde su cabecera.

4. **La tabla de detalle paso a una ventana flotante** (`.ventana-flotante`),
   oculta por defecto, que se abre con el boton "Ver detalle de la tarifa" que
   esta al lado de la ruta. Se cierra con su boton, con `Escape`, o con el
   mismo boton que la abrio. Se puede **arrastrar** por su cabecera, con topes
   para que no se salga de la pantalla.

**Dos cosas que hubo que resolver:**

- **La caja de referencias tapaba el bloque COL 5.** La esquina inferior
  izquierda del mapa no esta tan vacia como parece: por encima queda el bloque
  marino occidental. Se compacto la caja (176 px de ancho y
  `max-height: calc(100% - 210px)`, con scroll interno como red de seguridad)
  hasta que dejo de solaparse. Verificado: **no tapa ningun punto, tramo,
  bloque, rotulo ni el localizador.** Si se agranda su contenido, hay que
  volver a comprobarlo.

- **El mapa quedo dentro de `#results`, que arranca oculto.** Mientras un
  elemento esta oculto, `getComputedTextLength()` devuelve 0 y el desapilado de
  etiquetas trabajaria con anchos inventados. `js/mapa.js` ahora **reintenta**
  la medicion frame a frame (hasta 30) hasta que haya layout. Verificado: las
  34 etiquetas se miden bien y se generan las 18 lineas guia.

**Mantener a futuro:** al mover o agrandar la caja de referencias, volver a
verificar que no tape nada del mapa.

---

## D17. Arranque sin ruta y animacion al elegirla

**Decision (2026-08-27, instruccion del usuario):**

**1. La calculadora arranca vacia.** Los desplegables de Origen y Destino
empiezan en un marcador de posicion (`— Elige el origen —`), sin nada
preseleccionado. Mientras falte cualquiera de los dos se muestra el estado
vacio y se cierra la ventana del detalle.

Esto obligo a **sacar el mapa de `#results`**: ese bloque arranca oculto, y si
el mapa viviera dentro, no se podria hacer clic en el para elegir los puntos —
que es justo como se espera usarlo sin nada seleccionado. Ahora el mapa vive en
el panel de resultado pero fuera de `#results`, asi que siempre se ve; cuando
hay ruta, las tarjetas y la linea `Ruta:` aparecen encima.

**2. La ruta se dibuja animada.** Al elegirla:

- **Dibujo progresivo**: cada tramo se traza de origen a destino, uno tras
  otro, con la Web Animations API (`stroke-dashoffset`, 260 ms por tramo y
  70 ms de desfase entre uno y el siguiente). Se usa `fill: "backwards"` para
  que el tramo este invisible hasta que le toca.
- **Rayitas en movimiento**: el flujo blanco punteado aparece en cada tramo
  justo cuando ese tramo termino de dibujarse (`transitionDelay` calculado por
  tramo), y desde ahi corre en bucle en el sentido origen → destino.
- **Ping de radar en los extremos**: origen y destino llevan dos anillos
  concentricos que se expanden y se desvanecen, desfasados 0,9 s entre si, mas
  un latido suave del propio punto. El origen usa el verde de acento y el
  destino el azul marino, los mismos de la leyenda.

Todo se apaga con `prefers-reduced-motion: reduce`.

**Un fallo real que aparecio aqui:** `requestAnimationFrame` **no se ejecuta
mientras la pestana esta en segundo plano**, y el desapilado de etiquetas y el
recorte del mapa dependian de el. Una pestana abierta sin mirar se quedaba con
el mapa sin recortar. Ahora se programa por **dos vias** (rAF y un
`setTimeout` de respaldo) con una bandera para que no corra dos veces.

**Mantener a futuro:** no volver a preseleccionar origen/destino, y no meter el
mapa dentro de `#results`.

---

## D18. Segunda pasada de interfaz: sin boton de calcular, plegables y animacion sin condiciones

**Decision (2026-08-27, lista de cambios del usuario):**

**1. Cabecera compacta.** El subtitulo pasa al lado del titulo, en la misma
linea: la barra bajo de 78 a **44 px**. El boton de imprimir se fue de ahi al
borde derecho del encabezado del panel "Resultado".

**2. Sin boton "Calcular tarifa".** Todo se recalcula al vuelo. Los
desplegables escuchan `change`; los campos numericos (TRM y % de fomento)
escuchan ademas `input`, para que respondan mientras se escribe y no al perder
el foco.

**3. Totales compactos y al pie del panel de opciones**, donde estaba el boton
de calcular. Ocupan la mitad de alto que antes.

**4. Cargos de TGI, plegado por defecto**, con 3% de fomento y **6% de
impuesto** ya puestos. El impuesto por defecto cambio de 0% a 6%; el Excel se
alineo al mismo valor de arranque para que los dos entregables partan igual.

La nota que explicaba el reparto por transportador salio del formulario y vive
en una **nota flotante**. Se abre con el boton `ⓘ` de la cabecera del bloque y
se cierra al hacer clic fuera o con `Escape`.

> Interpretacion: el usuario pidio la nota "al poner el clic sobre el titulo de
> Cargos de TGI". Como ese mismo titulo tiene que plegar y desplegar el bloque,
> se separo: la cabecera pliega, y el `ⓘ` que esta junto al titulo abre la nota.
> Si prefiere que sea el titulo entero el que abra la nota, es un cambio de una
> linea.

**5. El aviso de ruta combinada pasa debajo del mapa.**

**6. El detalle de la tarifa se despliega en su sitio**, ya no es ventana
flotante (se retiro el arrastre que tenia).

**7. Totales por concepto en la tabla.** Cuando la ruta usa **los dos**
transportadores aparecen `T. Estampilla`, `T. Cuota de fomento` y
`T. Impuesto`, y los seis renglones del detalle por transportador se **pliegan**
detras de un renglon `▸ Detalle por transportador` que los despliega. Con un
solo transportador no aparece ninguna de las dos cosas: el detalle se muestra
directo.

**8. La animacion del mapa ya no depende de `prefers-reduced-motion`.** Era la
causa de que al usuario "se vieran las lineas pero no se movieran": en Windows
basta con tener apagado "mostrar animaciones" para que el navegador reporte esa
preferencia, y el flujo y los pings se quedaban quietos. Se quito esa condicion
de las animaciones del mapa porque el usuario pidio **movimiento constante**.

Los pings pasaron de anillo con borde a **disco relleno** que se expande y se
desvanece, que es lo que se ve en la referencia que mando.

**Verificado**: los 5 escenarios de la web coinciden exactamente con el Excel
recalculado con el mismo 6% por defecto.

---

## D19. Cabecera del resultado en una sola linea

**Decision (2026-08-27):** el recuadro de "Elige un origen y un destino" ocupaba
demasiado alto. Todo lo que iba encima del mapa se subio a la **misma linea del
titulo "Resultado"**:

`Resultado | mensaje o ruta | Ver detalle de la tarifa | 🖨️`

- El mensaje de "elige una ruta" dejo de ser una caja punteada y es texto
  atenuado en esa linea. Se muestra solo cuando no hay ruta.
- La **linea de ruta** ocupa el mismo hueco cuando si hay ruta.
- El boton de **imprimir quedo solo con el icono** (con `aria-label` y `title`
  para que se siga entendiendo).
- El `<div id="results">` que envolvia todo desaparecio: ahora se muestran y se
  ocultan las piezas por separado (`#empty-state`, `#ruta-linea`, `#btn-tabla`,
  `#tarjetas`).

La cabecera bajo a **36 px sin ruta y 42 px con ruta**.

**Corregido el 2026-08-27:** la primera version recortaba la ruta con puntos
suspensivos. El usuario pidio verla completa, asi que ahora **sigue en las
lineas siguientes** (`white-space: normal` + `overflow-wrap: anywhere`). Con la
ruta mas larga (Medellin → Jobo, 13 tramos, 328 caracteres) ocupa 5 lineas en
escritorio y 8 en movil, sin recortes. El mensaje corto de "elige una ruta" si
sigue en una sola linea.

**Un fallo de responsive que aparecio revisando esto:** en pantallas angostas
el mapa no encogia y la pagina desbordaba 1413 px en horizontal. Era el
`min-width: auto` que traen por defecto los items de grid y de flex: el panel
no podia encoger por debajo del ancho de su contenido. Se puso `min-width: 0`
en `.panel`, `.mapa-marco` y `#mapa`. Verificado a 375 px: **0 px de
desbordamiento** y el mapa se ajusta a 264 px.

> Nota para futuras verificaciones: `python -m http.server` deja cachear el CSS,
> y una recarga normal puede seguir mostrando la hoja vieja. Si un cambio de
> estilos "no se aplica", recargar `css/style.css` con un parametro de version
> antes de dar por hecho que el CSS esta mal.

---

## D20. Colores del mapa: PROMIGAS en verde y la ruta de un solo azul

**Decision (2026-08-27, instruccion del usuario):**

| Elemento | Antes | Ahora |
|---|---|---|
| PROMIGAS | azul `#1c4f9c` | **verde `#0e8f4d`** |
| Ruta calculada | el color de cada transportador | **un solo azul `#2f5fd0`** |
| Punto de origen | verde | **blanco**, con borde casi negro |
| Punto de destino | azul marino | **negro `#10141c`**, con borde blanco |
| Localizador (pais) | cafe `#8a6f55` | **azul oscuro `#1f3a68`** |
| Marco del localizador | gris | blanco |

**La ruta se pinta entera del mismo azul**, aunque cruce los dos
transportadores: `.tramo-base.activo` fija el `stroke` y gana en especificidad
a `.tramo-TGI` / `.tramo-PROMIGAS`. Antes una ruta combinada salia mitad roja y
mitad azul. Verificado en los 5 escenarios: **un unico color de ruta en todos**,
incluidas las combinadas.

**El parpadeo se hizo mas notorio:** el ping pasa de `opacity` 0.45 a 0.95 y
crece hasta `scale(3.6)` en vez de 2.8; el ciclo bajo de 1.8 s a 1.4 s y el
latido del punto crece a `scale(1.35)`. Los dos anillos van desfasados 0.7 s.

**El localizador dejo de ser una silueta lisa:** ahora dibuja tambien los 32
limites departamentales, para que se lea como mapa. Reutiliza las mismas rutas
SVG del croquis grande, con `vector-effect: non-scaling-stroke` para que la
linea no se afine al reducirlo.

Tambien se renombro la columna `Total tramo (COP)` a `T. tramo (COP)`.

---

## D21. Trazado tipo carretera y correccion contra el mar

**Decision (2026-08-27, instruccion del usuario):** los ductos se veian
demasiado rectos y "ovalados", y dos se salian del territorio. El trazado se
rehizo en tres capas:

1. **Polilinea base**: extremos + puntos de paso de `TRAZADOS`.
2. **Meandro**: cada tramo de esa polilinea se parte en **muy pocos** puntos
   (uno a tres, segun el largo: un trozo por cada ~55 px) y cada punto se
   desvia de la recta. El **lado se alterna a proposito** y solo la magnitud
   sale del hash del nombre del tramo. La amplitud es 11% del largo con tope de
   8 px, asi que los tramos cortos (el valle de Aburra, ~5 px) casi no se
   mueven.

   > **Ajustado el 2026-08-27 (segunda pasada):** la primera version generaba un
   > punto cada 13 px, lo que producia un zigzag menudo. En la lamina la linea
   > entre dos estaciones es una **curva suave y larga**, no un serpenteo
   > frecuente. Bajar la frecuencia dejo 21 de 32 tramos con una sola curva y el
   > resto con una ese larga (0,8 inflexiones de media), que es lo que se ve en
   > la lamina.
3. **Correccion contra el mar**: si un punto del meandro cae fuera del relleno
   de Colombia (`isPointInFill` sobre el croquis), se devuelve hacia la recta
   hasta volver a tierra. Si ni la recta esta en tierra, se queda en la recta:
   **nunca queda peor que sin serpentear**.

**Los dos tramos que se salian** eran los costeros de PROMIGAS
(`Ballenas_prom - La Mami`, 39% fuera, y `La Mami - Barranquilla`, 22%): sus
waypoints estaban mar adentro. Se trazo un corredor por tierra comprobando
punto por punto contra el croquis (rejilla de lat/lon), y ahora van por
Riohacha, el corredor entre la sierra y la costa, y rodeando la Cienaga Grande
por el sur.

**Verificado:** **0 tramos fuera de tierra** (antes 2), los 32 siguen tocando
exactamente sus dos puntos, y el desvio maximo medio es 3,4 px sobre un tramo
medio de 45,6 px.

**Localizador**: el pais paso de azul oscuro a un **azul apagado** (`#61708c`)
y el recuadro de la zona enfocada ahora tiene **borde negro y relleno azul al
22% de opacidad**, para que se lea como "esto es lo que estas viendo".

---

## D22. Servidor local sin cache para desarrollo

**Problema real, encontrado dos veces:** `python -m http.server` no manda
cabeceras de cache, asi que el navegador aplica su heuristica y **se queda con
la version vieja de `css/` y `js/`**. Dos veces di por fallido un cambio que en
realidad ya estaba bien: la primera con el CSS del recorte responsive, la
segunda con los waypoints costeros. La pista es que el archivo en disco y el que
sirve el servidor son correctos, pero lo que corre en la pagina es lo viejo.

**Solucion:** `tools/servidor_local.py`, que sirve la carpeta mandando
`Cache-Control: no-store`. `.claude/launch.json` apunta ahi.

**Si aun asi se ve viejo** (queda una entrada cacheada de antes), forzar la
revalidacion una vez:

```js
['css/style.css','js/data.js','js/colombia.js','js/ubicaciones.js',
 'js/graph.js','js/mapa.js','js/app.js']
  .forEach(u => fetch(u, { cache: 'reload' }));
```

y recargar. En el navegador del usuario basta con **Ctrl+F5**.

**Mantener a futuro:** antes de concluir que un cambio de CSS o JS "no
funciona", comprobar que la pagina esta corriendo el archivo nuevo (por ejemplo
leyendo una constante que solo exista en la version nueva).

---

## D23. Zoom sobre la ruta, tabla apilada en el telefono y ajustes del mapa

**Decision (2026-08-27, lista del usuario):**

**1. Zoom sobre la ruta.** Debajo del localizador aparecen dos botones (`+` /
`−`) con **tres pasos** de acercamiento. Solo salen cuando hay una ruta
elegida.

El encuadre no salta directo a la ruta: se **interpola** entre el encuadre
completo y la caja de la ruta segun el nivel (1/3, 2/3, 3/3). Asi los pasos
intermedios siguen mostrando contexto alrededor. Como el destino es la caja de
la ruta, el acercamiento depende de que tan grande sea: Cartagena → Sincelejo
llega a **x4,7**, Medellin → Cali a **x2,4**, y Medellin → Jobo solo a **x1,5**
porque esa ruta ya ocupa casi todo el mapa.

El recuadro del localizador sigue el encuadre actual, asi que al acercarse se
ve encogerse sobre la zona.

Los botones se colocan por JS justo debajo del localizador (que se dibuja
dentro del SVG y cambia de tamano con el ancho disponible), no con una posicion
fija en CSS.

**2. Los nombres de los puntos tambien son clicables.** Antes el
`.punto-etiqueta` tenia `pointer-events: none` y solo respondia el circulito,
que ahora ademas es mas pequeno. Verificado: hacer clic sobre el texto "Cali"
lo asigna como origen.

**3. Tabla apilada en el telefono.** A <= 700 px la tabla deja de ser tabla:
cada renglon pasa a ser una tarjeta y cada dato lleva delante el nombre de su
columna, que viaja en `data-col` desde `js/app.js`. Las celdas vacias (la cuota
de fomento y el impuesto no tienen desglose por componente) se ocultan.
Verificado a 375 px: **0 px de desplazamiento horizontal**, ni en la pagina ni
dentro de la tabla.

**4. Ajustes de color y tamano:**

| Elemento | Antes | Ahora |
|---|---|---|
| Verde PROMIGAS | `#0e8f4d` | `#12b76a` (mas vivo) |
| Pais del localizador | `#61708c` | `#a8b1cb`, del mismo azul que la tierra del mapa grande |
| Limites del localizador | `#8b98ae` | blanco, como en el mapa grande |
| Borde del recuadro enfocado | ~1,6 px negro, escalado a mano | **1 px gris** `#6f7787` con `non-scaling-stroke` |
| Relleno del recuadro enfocado | azul al 22% | azul al **11%** |
| Radio de los puntos | 4,2 / 7 | **2,9 / 4,9** (30% menos) |

---

## D24. Nota del %CF, formatos de la tabla y rotulos geograficos

**Decision (2026-08-27, lista del usuario):**

**1. Nota flotante del %CF.** Junto a la etiqueta "Cargo Fijo / Cargo Variable"
hay ahora un boton de informacion que abre una nota con:

> **0 - 100** (Tarifa mas cara)
> **100 - 0** (Tarifa mas barata)

Las dos notas flotantes (esta y la de los cargos de TGI) comparten el mismo
mecanismo: abrir una cierra la otra, y las dos se cierran al hacer clic fuera o
con `Escape`.

**2. El %CF por defecto paso de 85/15 a 0/100** y se quito la etiqueta
"(estandar)" del 85/15. El 0/100 **no lleva etiqueta**, como pidio el usuario.
El Excel se alineo al mismo arranque (y se limpio "(estandar)" de la hoja
`listas`), para que los dos entregables partan igual.

> Ojo: esto cambia todos los totales de referencia. Con 0/100 e impuesto TGI al
> 6%: Jobo → Ballenas_prom $12.931,89 · Medellin → Cali $24.983,79 ·
> Barranca → Cartagena $16.107,18 · Medellin → Jobo $34.505,07 ·
> Cali → Barranquilla $34.892,68. **Verificado: los cinco coinciden entre la
> web y el Excel.**

**3. Formatos de la tabla.** Los importes de la tabla usan **1 decimal en COP**
y **2 en USD**, con funciones propias (`copTabla` / `usdTabla`). Las tarjetas de
total siguen con 2 y 4 decimales: ahi si importa la precision, y el usuario
pidio el cambio para la tabla.

**4. Tamanos y colores de la tabla.** Todo bajo una talla (0,82 → 0,74 rem), los
encabezados pasaron a **negro y negrita** con una talla menos todavia
(0,64 rem), y la fila `USD` va en **azul marino y negrita**.

Ese ultimo necesito `.table-detalle .fila-usd td` en vez de `.fila-usd td`: la
regla `.table-detalle td:first-child { font-weight: 500 }` le ganaba en
especificidad y la primera celda salia sin negrita.

**5. La tabla ya no pide desplazamiento lateral en ningun ancho.** Se quito el
`min-width: 720px` y el `overflow-x` del contenedor, y se paso a
`table-layout: fixed` con anchos por columna. Verificado: **0 px de
desplazamiento** tanto en escritorio (tabla 705 px en un hueco de 705 px) como
en movil a 375 px.

> **Corregido despues:** la primera version apilaba la tabla en el telefono
> (cada renglon como tarjeta). El usuario pidio que se viera **exactamente
> igual** que en el ordenador, asi que se retiro ese bloque de CSS. Ahora en
> movil sigue siendo una tabla de seis columnas: cabe sin desplazamiento
> (260 px en un hueco de 260 px), a costa de que el texto de las celdas parta
> en varias lineas. Los `data-col` que alimentaban el apilado se dejaron en el
> HTML: no estorban y describen la celda.

> El desplazamiento **vertical** de la pagina si se mantiene: con 13 tramos mas
> los totales no hay forma de que quepa entero en la altura de un telefono sin
> volver el texto ilegible.

**6. Nombres de nodo a la izquierda.** `ETIQUETAS_IZQUIERDA` en
`js/ubicaciones.js` lista los 12 puntos cuyo nombre se escribe a la izquierda
(Jobo, Red Mamonal, Barranquilla, Ballenas_tgi, Medellin, Girardota, Donmatias,
Mariquita, Pereira, Armenia, Cali y Apiay). Manda sobre la regla general, que
sigue decidiendo por la posicion en el mapa.

**7. Rotulos geograficos.** Se agregaron `MAR CARIBE`, `OCEANO PACIFICO`,
`Panama` y `Venezuela`, colocados por lon/lat en `ROTULOS_GEOGRAFICOS`
(`tools/generar_croquis.py`), con el estilo de la lamina: los mares en
mayuscula espaciada y azul apagado, los paises en minuscula y gris.
Verificado: los cinco caen dentro del recorte y **ninguno choca con un nombre
de punto**.

---

## D25. Sin halo detras de los nombres de los puntos

**Decision (2026-08-27):** los nombres de los puntos llevaban un contorno del
color de la tierra (`paint-order: stroke` con `stroke: var(--mapa-tierra)`)
para despegarlos del fondo. Cuando el nombre caia sobre el mar, ese contorno se
veia como un **recuadro de color** alrededor de las letras, que es lo que al
usuario no le gustaba. Se quito.

**A cambio:** sobre una linea de gasoducto el nombre pierde algo de contraste.
Se acepto porque los nombres ya se separan entre si con el desapilado
(`docs/DECISIONES.md` D13) y los puntos se hicieron mas pequenos (D23), asi que
los cruces son pocos.

---

## D26. TRM del dia automatica

**Decision (2026-08-28):** el campo TRM se llena solo al abrir la pagina,
consultando la **TRM oficial** en Datos Abiertos Colombia:

```
https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde DESC
```

Se comprobo que responde con CORS abierto, asi que sirve desde un sitio
estatico sin backend.

**Sigue siendo editable.** Si el usuario escribe su propia TRM, se marca como
manual y la consulta **no la pisa** (si llega despues, solo informa el valor
oficial sin aplicarlo). Si la consulta falla, se queda el valor que hubiera y
se avisa bajo el campo. Nunca bloquea el calculo.

---

## D27. Tarifas de TGI alineadas con el sitio de referencia

**Hallazgo:** al fin se pudo leer la fuente del sitio original — su
`cargos_data.js`, servido por GitHub Pages, aunque el repositorio siga dando
404 (cierra el punto abierto de `docs/PROBLEMAS_Y_SOLUCIONES.md` P5).

Su modelo resulto ser **el mismo que el nuestro**, solo tabulado: guarda `cf` y
`aom` **anuales** y `cv` por unidad, y calcula
`base = cf/365 + aom/365 + cv`, luego 3% de fomento y el impuesto elegido.
Sus tablas por %CF son lineales, asi que el equivalente exacto de nuestros
campos es:

```
Fijos = cf(1.0)/365      Variables = cv(0.0)      AOM = aom/365
```

**Comparacion (antes de tocar nada):**

| | Resultado |
|---|---|
| Estampilla PROMIGAS | **identica** |
| 7 tramos de PROMIGAS | **identicos** |
| Estampilla TGI | nuestra +8,2% / +6,8% / +1,6% |
| 13 tramos de TGI comparables | nuestros **+5,9% a +8,3%** |

Es decir: la estampilla de TGI no estaba descuadrada respecto de nuestros
propios tramos de TGI — **todo el bloque TGI del Excel era una vigencia
distinta**, ~7% mayor. PROMIGAS coincidia al decimal en las dos fuentes.

**Decision del usuario (preguntada explicitamente): alinear TODO TGI al sitio.**

Se actualizaron en la hoja `TRAMOS` **16 tramos de TGI + la estampilla**.
Respaldo de las tarifas anteriores en
`docs/CALCULADORA_TARIFAS_2026_respaldo_v3_tgi_excel2026.xlsx`.

**Lo que NO se alineo, y por que:**

| Tramo | Motivo |
|---|---|
| Sebastopol-Transmetano, Transmetano-Donmatias, Donmatias-Barbosa, Barbosa-Girardota, Girardota-Bello | ya estaban en cero en las dos fuentes |
| Gualanday-Montanuelo | ya estaba en cero |
| Bello-Medellin, Cali-Acopi | el sitio **no los modela**: siguen con la tarifa del Excel |
| Cogua-Sabana | nuestro Excel lo tiene en cero; el equivalente del sitio ("Gasoducto de la Sabana") es un ducto completo, no ese enlace. Mapearlo seria una suposicion |

**Verificado:** para una ruta enteramente sobre tramos alineados
(Barranca → Cali, %CF 0/100, impuesto 6%), nuestro motor da **exactamente** el
mismo numero que la formula del sitio: base 18.456,1260 y total 20.117,1774,
**diferencia 0**. Y los cinco escenarios de siempre siguen cuadrando entre la
web y el Excel.

> ⚠️ Otra diferencia de logica que **no** se cambio, por decision del usuario:
> en el sitio las estampillas son **casillas manuales apagadas por defecto**;
> aqui se cobran automaticamente cuando la ruta usa esa red.

---

## D28. Tramos sin tarifa fuera de la tabla, y descarga de la tabla en PNG

**Decision (2026-08-28, instruccion del usuario):**

**1. Los tramos sin tarifa no se listan en la tabla.** Son los cinco del valle
de Aburra (Sebastopol-Transmetano, Transmetano-Donmatias, Donmatias-Barbosa,
Barbosa-Girardota, Girardota-Bello) y Gualanday-Montanuelo. **Solo desaparecen
de la tabla**: siguen apareciendo en la linea `Ruta:`, en el mapa y en el
recorrido, y su aporte al total no cambia.

Bajo la tabla se avisa cuantos se omitieron, porque si no la tabla contradice
en silencio a la linea de ruta (13 tramos en la ruta, 8 en la tabla).

> **Trampa que costo un intento:** esos tramos **no estan en cero exacto** en la
> hoja `TRAMOS`: llevan **0,00001** como marcador de "sin tarifa asignada". Un
> filtro `> 0` no quitaba ninguno. El criterio correcto es el que se muestra:
> se omite el tramo cuyo total quedaria por debajo de 0,05 COP, o sea el que
> aparecería como `$ 0,0`.

**2. El boton de imprimir paso a ser de descarga.** Baja la tabla como PNG con
el nombre `ORIGEN-DESTINO_CF%-CV%_TRM.png`
(ej. `Medellin-Jobo_0-100_3144.28.png`); los nombres se limpian de tildes,
espacios y signos.

La imagen **se dibuja a mano en un canvas**, no se convierte el DOM. Se evaluo
`foreignObject` sobre SVG, que es lo habitual, pero obliga a incrustar todo el
CSS y falla en algunos navegadores; y una libreria tipo html2canvas habria sido
la primera dependencia externa del proyecto (ver D1). Dibujar la rejilla a mano
son ~90 lineas y sale igual en todos lados.

La imagen se arma desde **una copia de los datos** (`tablaParaImagen`), no
leyendo el DOM, para que no dependa de que el panel este desplegado.

> **Ajustado despues (2026-08-28):** el PNG **respeta si el detalle por
> transportador esta plegado o desplegado**. El renglon que pliega/despliega no
> se dibuja nunca: es un control, no un dato. Verificado: 1136x1020 px plegado
> y 1136x1332 px desplegado. Incluye titulo con origen → destino,
%CF, TRM y fecha. Verificado: PNG valido de 1158x1384 px con contenido.

---

## D29. La tabla en pantallas angostas, sin cambiar su estructura

**Decision (2026-08-28):** el usuario pidio que la tabla se lea mejor en el
telefono **sin tocar la estructura** (siguen las mismas seis columnas). Se
trabajo solo sobre espacio y tamano:

| | <=700 px | <=430 px |
|---|---|---|
| Margen de la pagina | 12 px (era 24) | 8 px |
| Relleno del panel | 14 px (era 20) | 10 px |
| Letra de la tabla | 0,66 rem | 0,60 rem |
| Encabezados | 0,56 rem | 0,50 rem |
| Relleno de celda | 5x4 px | 4x3 px |

**Tres cosas que hubo que arreglar para que de verdad quedara legible:**

1. **Las cifras partian en dos lineas**, con el `$` arriba y el numero abajo.
   El corte era por el espacio entre simbolo y cifra: se cambio por un
   **espacio duro** (` `).

2. **Las cifras mas anchas seguian desbordandose.** El simbolo de moneda se
   envolvio en `<span class="sim">` y **se oculta por debajo de 430 px**: el
   encabezado de la columna ya dice `(COP)`, y la fila de dolares empieza con
   `USD` en su primera celda, asi que no se pierde informacion. En el PNG el
   simbolo si sale (la copia para la imagen quita las etiquetas HTML).

3. **La fila `Total` se salia igual.** Traia `font-size: 0.92rem` del estilo de
   escritorio, que ninguna consulta de medios pisaba: a 14,7 px no cabia en una
   columna de 57 px. Se iguala al resto de la tabla en movil.

**Verificado a 375 px:** 0 px de desplazamiento horizontal (ni en la pagina ni
en la tabla), **0 cifras partidas y 0 desbordadas** de 62, y solo parten en
varias lineas 11 de 21 nombres de tramo, que es lo esperable. En escritorio no
cambia nada.

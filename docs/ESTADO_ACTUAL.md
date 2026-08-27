# Estado Actual del Proyecto

> Actualizado el 2026-08-27, tras eliminar PROMIORIENTE, rehacer el mapa como
> mapa geografico de Colombia y rediseñar la paleta
> (ver `docs/DECISIONES.md` D12, D13 y D14).

## COMPLETADO

### Sesión del 2026-08-27 (solo TGI+PROMIGAS, mapa geográfico, paleta nueva)

- [x] **PROMIORIENTE eliminado de todo el proyecto** (D12), por instrucción
      explícita del usuario, que revierte su respuesta del día anterior.
      Se borraron sus 2 tramos de la hoja `TRAMOS` (la fuente de verdad) y con
      ellos sus 3 nodos. Quedan **32 tramos (25 TGI + 7 PROMIGAS) y 34 nodos**.
      Respaldo previo en
      `docs/CALCULADORA_TARIFAS_2026_respaldo_v2_con_promioriente.xlsx`.
- [x] **La matriz de pertenencia del Excel ya no está escrita a mano**:
      `tools/actualizar_excel.py` la recalcula con BFS desde `TRAMOS`, junto
      con las columnas de nodos de la hoja `listas` y los rangos de los
      desplegables. Toda la distribución de filas de `Calculo` se deriva del
      número de tramos, así que agregar o quitar tramos ya no rompe nada.
- [x] **Mapa geográfico del SNT** (D13), rehecho desde cero:
      - `tools/generar_croquis.py` → `js/colombia.js`: croquis de Colombia
        continental (1 anillo de país + 32 de departamentos, 33 KB) a partir de
        geoBoundaries, simplificado con Ramer-Douglas-Peucker y proyectado.
      - `js/ubicaciones.js`: lat/lon **aproximada** de los 34 puntos.
      - `js/mapa.js`: gasoductos con los colores del mapa oficial
        (TGI `#e1251b`, PROMIGAS `#2b5ca8`), ruta resaltada con **flujo
        animado** en el sentido origen → destino, selección por clic o teclado,
        y desapilado automático de nombres con líneas guía.
      - **Recorte cuadrado** sobre la zona con red (512x512 en vez de
        668x910) y **localizador** arriba a la derecha con el país completo y
        un marco señalando la zona mostrada. Ambos se calculan solos.
      - Verificado en navegador: 34 puntos, todos dentro del croquis, **cero
        etiquetas encimadas**, nada fuera del recorte, ningún punto tapado por
        el localizador, 0 errores de consola. La animación de flujo corre
        (13 animaciones a 0,9 s) y se apaga con `prefers-reduced-motion`.
- [x] **Paleta de la interfaz rediseñada** (D14) según la captura del usuario:
      azul marino + blanco + grises, con verde y azul de acento.
- [x] **Tema claro fijo** (corrección posterior del mismo día): se eliminó el
      bloque `@media (prefers-color-scheme: dark)` y se añadió
      `color-scheme: light` en `:root`, que además fuerza los controles nativos
      a verse claros. Verificado emulando un sistema en modo oscuro: la página
      se mantiene clara.
- [x] **Colores del mapa y trazado curvo** según la lámina oficial del SNT
      (segunda foto del usuario): TGI `#e2231a`, PROMIGAS `#1c4f9c`, relleno
      `#c3c9dd`, departamentos en blanco, localizador en café `#8a6f55`. Los 32
      tramos se dibujan como curvas cúbicas (desviación derivada de un hash del
      nombre del tramo, para que el dibujo sea estable). Verificado: 0 curvas
      fuera del recorte, las 32 siguen tocando exactamente sus dos puntos.
- [x] Revalidación cruzada Excel ↔ web tras todos los cambios, 6 escenarios,
      resultados idénticos:

      | Escenario | Tipo | Redes | Total COP | Total USD |
      |---|---|---|---|---|
      | Jobo → Ballenas_prom | directa | PROMIGAS | 10.939,97 | 2,7350 |
      | Medellín → Cali | directa | TGI | 18.211,35 | 4,5528 |
      | Medellín → Cali (imp. 6%) | directa | TGI | 19.272,21 | 4,8181 |
      | Barranca → Cartagena | combinada | TGI+PROMIGAS | 12.383,78 | 3,0959 |
      | Medellín → Jobo | combinada | TGI+PROMIGAS | 26.850,07 | 6,7125 |
      | Cali → Barranquilla | combinada | TGI+PROMIGAS | 24.503,57 | 6,1259 |

      (todos con %CF = 85/15 y TRM = 4000.)

- [x] **Contexto geográfico en el mapa** (D13): Panamá, Venezuela, el lago de
      Maracaibo y los cuatro bloques marinos, como en la lámina. Los países van
      sin nombre; el lago y los bloques llevan el suyo (`GUA OFF-1 / TAYRONA`,
      `COL 3`, `COL 5`, `PURPLE ANGEL / FUERTE SUR`, `Lago de Maracaibo`).
      Los bloques tienen el borde en escalera, no son rectángulos, y el lago no
      lleva color propio: se rellena como el mar. El lago y los bloques se
      aproximaron a ojo (no existen en Natural Earth ni en ningún dataset
      público) y viven en `tools/generar_croquis.py`.
- [x] **El PNG respeta si el detalle por transportador está plegado** (D28):
      1136x1020 px plegado, 1136x1332 px desplegado.
- [x] **Tabla legible en el teléfono sin cambiar su estructura** (D29): menos
      margen y letra más pequeña, espacio duro tras el símbolo de moneda, el
      símbolo oculto por debajo de 430 px, y la fila `Total` igualada al resto.
      Verificado a 375 px: 0 px de desplazamiento, 0 cifras partidas y 0
      desbordadas de 62.
- [x] **Tramos sin tarifa fuera de la tabla** (D28): los 5 del valle de Aburrá
      y Gualanday-Montañuelo ya no se listan (siguen en la ruta y el mapa), con
      un aviso de cuántos se omitieron. Ojo: en la hoja `TRAMOS` llevan
      **0,00001**, no cero, así que el criterio es "lo que se mostraría".
- [x] **Descarga de la tabla en PNG** (D28): el botón de imprimir pasó a ser de
      descarga, con nombre `ORIGEN-DESTINO_CF%-CV%_TRM.png`. La imagen se dibuja
      a mano en un canvas (sin dependencias externas) desde una copia de los
      datos, así que sale completa aunque el detalle esté plegado.
      Verificado: `Medellin-Jobo_0-100_3144.28.png`, PNG de 1158x1384 px.
- [x] **Se consiguió por fin la fuente del sitio original** (D27): su
      `cargos_data.js` se sirve por GitHub Pages aunque el repositorio siga
      dando 404. Cierra el punto abierto de `docs/PROBLEMAS_Y_SOLUCIONES.md` P5.
- [x] **Tarifas de TGI alineadas con el sitio de referencia** (D27): 16 tramos
      + la estampilla. PROMIGAS ya coincidía al decimal en ambas fuentes; lo
      que había era que todo el bloque TGI del Excel era una vigencia ~7%
      mayor, no un error de la estampilla.
      Verificado: en una ruta enteramente sobre tramos alineados
      (Barranca→Cali) nuestro motor da **exactamente** el mismo número que la
      fórmula del sitio (diferencia 0), y los 5 escenarios siguen cuadrando
      web ↔ Excel. Respaldo previo en
      `docs/CALCULADORA_TARIFAS_2026_respaldo_v3_tgi_excel2026.xlsx`.
- [x] **TRM del día automática** (D26) desde Datos Abiertos Colombia, editable.
- [x] **Sin halo detrás de los nombres de los puntos** (D25): el contorno del
      color de la tierra se veía como un recuadro cuando el nombre caía sobre
      el mar.
- [x] **La tabla se ve igual en móvil que en ordenador** (D24): se retiró el
      apilado en tarjetas. Verificado a 375 px: misma tabla de seis columnas,
      encabezado visible, 0 px de desplazamiento lateral.
- [x] **Nota del %CF, formatos de tabla y rótulos geográficos** (D24): botón de
      información junto a "Cargo Fijo / Cargo Variable"; el **%CF por defecto
      pasó a 0/100** (sin etiqueta) y se quitó "(estandar)" del 85/15, alineado
      también en el Excel; la tabla usa 1 decimal en COP y 2 en USD, bajó una
      talla, los encabezados van en negro y negrita, y la fila USD en azul
      marino y negrita; la tabla ya **no pide desplazamiento lateral en ningún
      ancho**; 12 nombres de punto pasaron a la izquierda; y se agregaron
      `MAR CARIBE`, `OCEANO PACIFICO`, `Panama` y `Venezuela`.
      Verificado: 0 px de desplazamiento lateral en escritorio y a 375 px, los
      rótulos nuevos no chocan con ningún nombre de punto, y los 5 escenarios
      coinciden con el Excel con el nuevo arranque
      (Jobo→Ballenas_prom $12.931,89 · Medellín→Cali $24.983,79 ·
      Barranca→Cartagena $16.107,18 · Medellín→Jobo $34.505,07 ·
      Cali→Barranquilla $34.892,68).
- [x] **Zoom sobre la ruta** (D23): dos botones bajo el localizador, con tres
      pasos de acercamiento interpolados hacia la caja de la ruta. Verificado:
      Cartagena→Sincelejo llega a x4,7 y Medellín→Jobo a x1,5 (esa ruta ya
      ocupa casi todo el mapa). El recuadro del localizador sigue el encuadre.
- [x] **Los nombres de los puntos son clicables** (D23), no solo el círculo.
- [x] **Tabla apilada en el teléfono** (D23): a ≤700 px cada renglón es una
      tarjeta con el nombre de la columna delante de cada dato. Verificado a
      375 px: 0 px de desplazamiento horizontal.
- [x] **Ajustes de color y tamaño** (D23): verde de PROMIGAS más vivo,
      localizador del mismo azul que la tierra del mapa grande, borde del
      recuadro a 1 px, y puntos 30% más pequeños.
- [x] **Trazado tipo carretera** (D21): los ductos siguen curvas suaves y
      largas entre estación y estación (21 de 32 con una sola curva, el resto
      con una ese), con desvíos que **alternan de lado**, y cualquier punto que
      caiga en el mar se devuelve hacia la recta.
      Verificado: **0 tramos fuera de tierra** (antes 2) y los 32 siguen
      tocando exactamente sus puntos.
- [x] **Corregidos los dos tramos costeros de PROMIGAS** (D21), que tenían sus
      waypoints mar adentro. Se trazó un corredor por tierra comprobado punto
      por punto contra el croquis.
- [x] **Localizador**: país en azul apagado y recuadro de zona enfocada con
      borde negro y relleno azul al 22%.
- [x] **`tools/servidor_local.py`** (D22): servidor de desarrollo sin caché.
      `python -m http.server` dejaba servir CSS y JS viejos, y eso hizo dar por
      fallidos dos cambios que ya estaban correctos.
- [x] **Colores del mapa revisados** (D20): PROMIGAS pasó a **verde**, la ruta
      calculada se pinta **toda de un mismo azul** aunque cruce los dos
      transportadores (antes salía mitad roja y mitad azul), el origen quedó
      **blanco** y el destino **negro**, y el localizador pasó de café a **azul
      oscuro** y ahora dibuja los 32 límites departamentales. El parpadeo se
      hizo más notorio (opacidad 0,95 y `scale(3.6)`, ciclo de 1,4 s).
      Verificado en los 5 escenarios: un único color de ruta en todos.
- [x] **La ruta ya no se recorta** (D19): se muestra completa y continúa en las
      líneas siguientes. Con la más larga (Medellín → Jobo, 328 caracteres)
      ocupa 5 líneas en escritorio y 8 en móvil, sin desbordar.
- [x] La columna `Total tramo (COP)` se renombró a `T. tramo (COP)`.
- [x] **Cabecera del resultado en una sola línea** (D19): el mensaje de "elige
      una ruta", la línea de ruta y el botón de detalle subieron junto al título
      "Resultado"; el botón de imprimir quedó solo con el icono. La cabecera
      bajó a 36 px sin ruta y 42 px con ruta. La ruta se recorta con puntos
      suspensivos y el recorrido completo queda en el tooltip.
- [x] **Corregido un desbordamiento en pantallas angostas** (D19): el mapa no
      encogía y la página desbordaba 1413 px. Era el `min-width: auto` de los
      ítems de grid/flex. Verificado a 375 px: 0 px de desbordamiento.
- [x] **Segunda pasada de interfaz** (D18): cabecera compacta (44 px, subtítulo
      en línea); imprimir movido al encabezado de "Resultado"; **eliminado el
      botón "Calcular tarifa"** (todo recalcula al vuelo, incluso al escribir en
      TRM y fomento); totales compactos al pie del panel de opciones; bloque
      "Cargos de TGI" plegable y plegado por defecto, con 3% y **6%** ya
      puestos; su nota pasó a una ventana flotante abierta desde el `ⓘ`; el
      aviso de ruta combinada quedó debajo del mapa; y el detalle de la tarifa
      se despliega en su sitio en vez de flotar.
- [x] **Totales por concepto en la tabla** (D18): con los dos transportadores
      aparecen `T. Estampilla`, `T. Cuota de fomento` y `T. Impuesto`, y el
      detalle por transportador se pliega detrás de un renglón que lo despliega.
      Con un solo transportador no aparecen.
- [x] **Corregida la animación que no se movía** (D18): dependía de
      `prefers-reduced-motion`, y en Windows basta con apagar "mostrar
      animaciones" para que el navegador la reporte. Se quitó esa condición de
      las animaciones del mapa. Verificado: con la preferencia activa en el
      navegador, el flujo (13), los pings (4) y los latidos (2) corren igual.
- [x] **El impuesto TGI por defecto pasó de 0% a 6%**, en la web y en el Excel.
      Verificado: los 5 escenarios coinciden entre los dos motores
      (Jobo→Ballenas_prom $10.939,97 · Medellín→Cali $19.272,21 ·
      Barranca→Cartagena $12.789,12 · Medellín→Jobo $27.776,88 ·
      Cali→Barranquilla $25.691,78).
- [x] **Bloques marinos eliminados** (D13) a petición del usuario. El recorte
      automático aprovechó el espacio liberado: el mapa subió y se corrió a la
      izquierda, pasando de 606 a **512 unidades de lado**. La caja de
      referencias se mudó a la esquina inferior **derecha**, porque la
      izquierda dejó de estar libre. Verificado: no tapa nada.
- [x] **Arranque sin ruta y animaciones** (D17): los desplegables empiezan
      vacíos; el mapa salió de `#results` para poder clicarse sin selección
      previa; la ruta se dibuja tramo a tramo (260 ms cada uno, 70 ms de
      desfase), las rayitas del flujo aparecen cuando su tramo terminó de
      dibujarse, y origen y destino llevan un ping de radar de dos anillos más
      un latido. Todo respeta `prefers-reduced-motion`.
      Verificado con la preferencia desactivada: 9 tramos dibujados en cascada,
      13 flujos, 4 pings y 2 latidos.
- [x] **Corregido**: `requestAnimationFrame` no corre en pestañas de segundo
      plano, así que el mapa podía quedarse sin desapilar ni recortar. Ahora el
      ajuste se programa por rAF **y** por temporizador de respaldo.
- [x] **Página reorganizada** (D16): títulos sin numeración; el mapa se movió
      dentro del panel de resultado, debajo de la línea `Ruta:`; la ayuda y la
      leyenda pasaron a una caja plegable anclada en la esquina inferior
      izquierda del mapa; y la tabla de detalle pasó a una ventana flotante
      arrastrable, oculta por defecto, que se abre con un botón junto a la ruta
      y se cierra con `Escape`.
      Verificado: la caja no tapa ningún punto, tramo, bloque, rótulo ni el
      localizador; ambos plegables abren y cierran; la ventana se arrastra sin
      salirse de la pantalla.
- [x] **Rótulos de los bloques colocados uno a uno** (D13), con la disposición
      y los textos que dio el usuario: `COL 5` / `PURPLE ANGEL` / `FUERTE SUR`
      con sus tres pozos en el bloque occidental, `COL 3` + `CUMBIA 1` en el
      central, `GUA OFF-1` / `TAYRONA` + dos pozos en el nororiental, y la
      pieza pequeña frente a Cartagena sin rótulo. Dos tamaños: títulos de
      bloque a 5,5 px en azul y mayúscula; nombres de pozo a 4,4 px en negro y
      minúscula.
      Verificado: los 14 rótulos quedan 100% dentro del encuadre, ninguno se
      pisa con otro ni con los nombres de la red, y ninguno queda tapado por el
      localizador. Los rótulos del bloque `COL 5` se centraron sobre el eje del
      bloque: anclados a su borde derecho se metían sobre la costa de Colombia.
      Verificado: ninguno de los 14 rótulos toca tierra firme.
- [x] **Trazado de los ductos con waypoints** (D13): 21 de los 32 tramos siguen
      puntos de paso leídos de la lámina (`TRAZADOS` en `js/ubicaciones.js`),
      suavizados con una spline de Catmull-Rom. Verificado: los 32 trazos
      tocan exactamente sus dos puntos y ninguno se sale del recorte.
- [x] **Tabla de resultados reestructurada** (D15) con la estructura exacta que
      dio el usuario: una sola tabla con columna `Total tramo`, sin el sufijo
      "pond.", bloques por transportador y fila final en USD. Verificado que
      cada columna suma lo que tiene encima.

### Sesión del 2026-08-26 (cargos por transportador)

- [x] **Modelo tarifario cambiado a cargos por transportador** en los dos
      entregables: cada transportador liquida su estampilla, su cuota de
      fomento y su impuesto local sobre su propia base. TGI editable;
      PROMIGAS y PROMIORIENTE fijos en 3% fomento / 6% impuesto.
      Ver `docs/DECISIONES.md` D8.
- [x] Web: `js/graph.js` (constante `CONFIG_TRANSPORTADOR` + `porTransportador`
      en el resultado), `js/app.js` (tabla de desglose por transportador),
      `index.html` (los selectores de impuesto y fomento quedaron dentro de un
      bloque rotulado "Cargos de TGI · editable", con nota explícita de que
      PROMIGAS y PROMIORIENTE son automáticos), `css/style.css` (estilos del
      bloque, etiquetas editable/automatico y tabla nueva).
- [x] Excel: hojas `CALCULADORA` y `Calculo` reescritas por
      `tools/actualizar_excel.py`. Respaldo del modelo anterior en
      `docs/CALCULADORA_TARIFAS_2026_respaldo_v1.xlsx`.
- [x] `js/data.js` regenerado desde la hoja `TRAMOS` con precisión completa
      mediante `tools/sincronizar_datos.py` (ver `docs/DECISIONES.md` D9).
- [x] **Validación cruzada**: 4 escenarios recalculados en Excel real (vía
      COM en PowerShell, porque LibreOffice no está instalado en esta máquina)
      y comparados contra el motor JS. Diferencia máxima < 1e-11 COP:

      | Escenario | Base | Fomento | Impuesto | Total COP | Total USD |
      |---|---|---|---|---|---|
      | Jobo → Ballenas_prom (PROMIGAS) | 10.036,67 | 301,10 | 602,20 | 10.939,97 | 2,7350 |
      | Medellín → Cali (TGI, imp. 0%) | 17.680,92 | 530,43 | 0,00 | 18.211,35 | 4,5528 |
      | Medellín → Cali (TGI, imp. 6%) | 17.680,92 | 530,43 | 1.060,86 | 19.272,21 | 4,8181 |
      | Barrancabermeja → Bucaramanga (PROMIORIENTE) | 4.500,27 | 135,01 | 270,02 | 4.905,29 | 1,2263 |

      (todos con %CF = 85/15 y TRM = 4000; Barranca → Cartagena sigue dando
      correctamente "no están en la misma red" en ambos entregables).
- [x] Confirmado con el usuario: los tramos de **PROMIORIENTE se mantienen**
      en el cálculo. ⚠️ **Revertido el 2026-08-27**: el usuario pidió
      eliminarlos por completo (D12).
- [x] El Excel `CALCULADORA_TARIFAS_2026.xlsx` ya está en `docs/` dentro del
      repositorio (lo copió el usuario) — cierra ese `PENDIENTE DE CONFIRMAR`.
- [x] Confirmado: **no existe repositorio git** en la carpeta (no hay `.git/`).
- [x] **Rutas combinadas entre redes distintas** (`docs/DECISIONES.md` D10):
      Origen y Destino en redes distintas ya no dan error — se suman las dos
      rutas hasta el punto de entrada de cada red (`Ballenas_tgi`,
      `Ballenas_prom`, `Barrancabermeja`) y se cobran ambas estampillas,
      ambas cuotas de fomento y ambos impuestos. Implementado en web y Excel.
- [x] **Mapa visual del SNT** (`docs/DECISIONES.md` D11): `js/mapa.js`,
      diagrama SVG de las tres redes con layout de árbol calculado desde los
      datos (sin coordenadas a mano), leyenda, ruta resaltada, puntos de
      entrada marcados en las rutas combinadas, y selección de Origen/Destino
      con clic o teclado. Verificado en navegador: 37 nodos, 34 tramos, sin
      superposiciones.
- [x] Validación de las 3 rutas combinadas nuevas (Excel vs. web, coinciden):

      | Ruta combinada | TGI | PROMIGAS / PROMIORIENTE | Total COP | Total USD |
      |---|---|---|---|---|
      | Barranca → Cartagena | 6.958,40 | 5.425,38 (PROMIGAS) | 12.383,78 | 3,0959 |
      | Medellín → Jobo | 15.910,10 | 10.939,97 (PROMIGAS) | 26.850,07 | 6,7125 |
      | Cali → Bucaramanga | 20.397,52 | 4.905,29 (PROMIORIENTE) | 25.302,81 | 6,3257 |

### Sesiones anteriores

- [x] Excel simplificado `CALCULADORA_TARIFAS_2026.xlsx` construido con 4
      hojas (`CALCULADORA`, `Calculo`, `TRAMOS`, `listas`), según la
      especificación exacta del usuario. Entregado por chat.
- [x] Fórmulas del Excel **validadas** recalculando con LibreOffice headless
      en 3 escenarios (ver `docs/PROBLEMAS_Y_SOLUCIONES.md` y
      `docs/PROXIMOS_PASOS.md` para el detalle de los casos de prueba).
- [x] Réplica web estática (HTML/CSS/JS) construida:
      `index.html`, `css/style.css`, `js/data.js`, `js/graph.js`, `js/app.js`,
      `README.md`.
- [x] Motor de cálculo de la réplica web (`js/graph.js`) probado con
      Playwright/Chromium headless: 3 escenarios, resultados **idénticos**
      a los del Excel (comparación numérica exacta).
- [x] Capturas de pantalla revisadas en modo claro y oscuro (layout responsive
      con panel de formulario a la izquierda y resultados a la derecha).
- [x] Archivos de la réplica web **escritos y confirmados** en la carpeta
      local del usuario `C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS`
      (confirmado con `device_list_dir` tras el `device_commit_files`):
      ```
      C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS\
      ├── index.html
      ├── README.md
      ├── css\style.css
      └── js\
          ├── app.js
          ├── data.js
          └── graph.js
      ```
- [x] Manejo correcto de rutas inválidas (origen/destino en redes distintas,
      u origen = destino) en ambos entregables.
- [x] Algoritmo de ruteo (BFS + XOR de caminos desde raíz) verificado sobre
      un caso de ruta que atraviesa una bifurcación (Medellín↔Cali, unión en
      el nodo "Sebastopol") sin necesidad de un algoritmo explícito de
      ancestro común.

## EN DESARROLLO

Nada en construcción activa en este momento. La última acción de la
conversación anterior fue la generación de esta documentación de migración
(este mismo conjunto de archivos). No hay código a medio escribir.

## PENDIENTE

- [ ] **Tabla de sensibilidad por %CF** (barrido de resultados variando el
      % de cargo fijo/variable) — el sitio original la tenía, la réplica no.
- [ ] `PENDIENTE DE CONFIRMAR`: si el **flujo animado** del mapa es el efecto
      que el usuario esperaba. Pidió "el mismo efecto de movimiento del
      repositorio que te mandé", pero el código de ese repositorio nunca se
      pudo inspeccionar (404, ver `docs/PROBLEMAS_Y_SOLUCIONES.md` P5), así que
      es una reconstrucción, no una copia.
- [ ] `PENDIENTE DE CONFIRMAR`: las **coordenadas** de `js/ubicaciones.js` son
      aproximadas (ubicadas por municipio/campo y por el mapa oficial). Si el
      usuario tiene las reales del operador, reemplazarlas ahí.
- [ ] `PENDIENTE DE CONFIRMAR`: caso degenerado `Ballenas_tgi` →
      `Ballenas_prom` (los dos extremos son puntos de entrada). Hoy da
      **0,00 COP** sin estampillas, porque ninguna red aporta tramos. ¿Debería
      cobrar igual las dos estampillas?
- [ ] **Tabla "base de datos regulada por ruta"** (todas las rutas de la red
      con su costo COP/USD, no solo la seleccionada) — el sitio original la
      tenía, la réplica no.
- [ ] Las dos redes siguen siendo **grafos disjuntos** (TGI 26 nodos,
      PROMIGAS 8, sin nodos compartidos). Eso ya **no** impide
      calcular rutas entre ellas: D10 las resuelve sumando las dos rutas hasta
      el punto de entrada de cada red. Queda como observación abierta si
      además existe un tramo físico de interconexión que debiera estar en la
      hoja `TRAMOS` — si se agregara, **verificar antes que cada red siga
      siendo un árbol sin ciclos** (ver `docs/DECISIONES.md` D5).
- [ ] Verificar contra la resolución CREG vigente los siguientes supuestos
      (ver `docs/DECISIONES.md` D6 y D8):
      - Cuota de fomento 3% e impuesto 6% fijos para PROMIGAS
        (los dio el usuario, no se leyó la resolución).
      - Impuesto local TGI: opciones 0% / 2% / 6%.
      - Combos estándar de %CF: 100/0, 85/15 (estándar), 70/30, 50/50,
        30/70, 15/85, 0/100.
      - Si dentro de cada transportador el fomento y el impuesto se suman de
        forma aditiva sobre su base (como se implementó) o si alguno se
        calcula en cascada sobre el otro.
- [ ] Inicializar repositorio git en `C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS`
      (`git init`, primer commit) — **verificado el 2026-08-26: no existe
      `.git/`**. El usuario pidió resolver primero los supuestos regulatorios
      antes de hacer commits.
- [ ] Publicar el sitio en GitHub Pages (subir a un repo remoto y activar
      Pages) — documentado en `README.md` como instrucción, pero no ejecutado.
- [ ] Ubicar y comparar contra el código fuente real del sitio original
      (`github.com/comercialgaskr/Calculadora-de-Tarifas` devolvió 404 y no
      se encontró por búsqueda web) — si el usuario consigue el link/código
      correcto, habría que revalidar toda la lógica de cálculo contra él.
- [ ] Decidir si `docs/CALCULADORA_TARIFAS_2026_respaldo_v1.xlsx` (respaldo
      del modelo anterior) se conserva o se borra al hacer el primer commit.

## BLOQUEADO

Nada bloqueado actualmente. No hay impedimentos técnicos abiertos ni
decisiones pendientes que impidan seguir trabajando — los puntos de la
sección PENDIENTE son trabajo por hacer, no bloqueos.

## Último punto exacto

**Sesión del 2026-08-27**, en dos instrucciones del usuario:
1. Mapa rehecho sobre el croquis de Colombia con los colores del mapa oficial
   y flujo animado, descartando PROMIORIENTE y los demás transportadores
   (D12, D13).
2. Rediseño de los colores de toda la página (D14).

Ambas implementadas y revalidadas contra el Excel. Sigue sin haber repositorio
git. Lo que sigue está en `docs/PROXIMOS_PASOS.md`.

### Sesión del 2026-08-26, en tres instrucciones sucesivas del usuario:
1. Cargos por transportador, TGI editable y PROMIGAS/PROMIORIENTE
   automáticos (D8) — hecho en web y Excel.
2. Rutas entre redes distintas resueltas sumando las dos rutas hasta el
   punto de entrada de cada red (D10) — hecho en web y Excel.
3. Mapa del SNT (D11) — hecho.

Todo validado cruzando el Excel (recalculado en Excel real vía COM) contra el
motor JS.

# Gym Tracker — cambios de esta versión (SW v108)

Este documento explica **qué se cambió, por qué y qué NO pude comprobar**. Todo se probó en un
Chromium real (clics, toques y arrastres reales; pruebas automáticas de arrastre, duplicar, navegación, texto grande y
modo sin conexión, todas sin fallos en la última pasada), pero con una nube simulada: no tuve acceso
a tu proyecto de Supabase ni a una API key de Anthropic.

---

# 🆕 v108 — sobre la v107

**Pasos tuyos al publicarla:** sube **TODOS** los archivos en **un solo commit** (la app rechaza versiones mezcladas). Si aún no lo hiciste con la v107, ejecuta también
**`supabase_ranking.sql`** en Supabase (se puede repetir sin problema).

## 1. ☰ Sidebar izquierdo de vuelta (solo lo que pediste)
- Botón **☰** arriba a la izquierda (o deslizar desde el borde izquierdo, o Escape / tocar fuera / «atrás» para cerrarlo). Contiene **solo**:
  - **Rutina activa** (el selector, que sale de la pantalla principal). Al elegir otra rutina el panel se cierra y ves sus días en la pantalla principal.
  - **Entrenamiento:** Mis rutinas (editor) · Importar rutina con IA · Notas de progresión · Mensajes y frases · Sonido del temporizador.
  - **Texto grande** (interruptor).
- **Ajustes** conserva: cuenta, temas, series en verde, datos/backup y aplicación (instalar, guía, actualizar, versión). **Ya no** tiene el bloque Entrenamiento ni Texto grande.
- El avatar 👤 pasó a la derecha de la barra superior (junto a ⚙️ y ⏱️) para dejar sitio al ☰.
- **«Atrás»:** las pantallas abiertas desde el sidebar (editor, importar IA, notas, mensajes, sonido) vuelven al **menú principal**; las que se abren desde Ajustes (guía, perfil) siguen volviendo a Ajustes.
- Detalle visual: la barra superior hace sitio al título reduciendo un poco su tamaño; con **texto grande** y pantallas de ≈360 px el título puede mostrarse recortado con «…».

## 2. 🍽️ Alimentos: de 140 a 152
Añadidos (por 100 g, USDA, con FDC y las 4 cifras leídas en la fuente; todos dentro de ±5 % del cálculo 4-9-4 (aceite y cola incluidos) salvo el ron, explicado abajo):
plátano verde crudo / hervido / frito · pan cubano · frijoles blancos cocidos · chuleta de cerdo a la parrilla y frita en sartén · bistec de res (sirloin a la plancha) · aceite de girasol ·
refresco de cola · refresco de limón-lima · ron.
- **Para que tengas claro (honestidad):**
  - **Pan cubano** sale de la base de encuestas del USDA (FNDDS), no de SR Legacy como el resto; es una referencia genérica, no una receta concreta.
  - **Chuleta y bistec:** el USDA da el valor por porción comestible, **sin hueso**; si pesas la chuleta con hueso, descuenta el hueso. Son cortes con grasa incluida; el «bistec» cubano real (palomilla, etc.) puede variar.
  - **Ron:** sus 231 kcal son casi todas del alcohol (33,4 g × 7 kcal); por eso proteína, grasa y carbohidratos aparecen en 0.
  - **Aceite de girasol:** la ficha usada es «linoleico (<60 %)»; el aporte calórico es el mismo en todas las variantes (884 kcal).
- **Siguen sin estar:** yuca cocida (la única ficha cocida es genérica, sin método de cocción y con 3 g de grasa frente a 0,28 g de la cruda, lo que sugiere grasa añadida; no la usé) y los
  **platos compuestos** (congrí, moros, picadillo…: al buscarlos solo aparecieron productos de marca). Para esos, usa «Mis alimentos» con tu propia receta (o suma los ingredientes sueltos).

## 3. Pruebas de esta versión
- Sidebar: abrir/cerrar (☰, overlay, Escape, «atrás», deslizar con toque real), selector con 2 rutinas, texto grande, las 5 pantallas y su ←/«atrás», Ajustes sin lo movido, sin errores de consola (27 + 6 comprobaciones).
- Repetidas y adaptadas: Ajustes/Perfil/cuenta/navegación (23 comprobaciones), hoja de cuenta con Escape, acceso sin cuenta, ranking, temas, ciclo ondulante, modo sin conexión; buscador de alimentos (19, con 10 legumbres).
- **No pude comprobar:** el aspecto en tu móvil real y la caché de GitHub Pages.

---

# 🆕 v107 — sobre la v106

**Pasos tuyos al publicarla (2):**
1. Sube **TODOS** los archivos de la carpeta en **un solo commit** (la app rechaza versiones mezcladas y se queda con la anterior).
2. En Supabase → SQL Editor, ejecuta **`supabase_ranking.sql`** (aunque ya hubieras ejecutado el anterior: se puede repetir sin problema). Añade 2 columnas
   (`metrica`, `ejercicios`). Sin este paso el ranking avisa «falta crear o actualizar la tabla» y todo lo demás funciona igual.

## 1. 🏅 Ranking nuevo: mide PROGRESO, no asistencia
**Problema:** antes eran 10 puntos por sesión + volumen acumulado. Quien paraba por lesión, trabajo o viaje se quedaba atrás para siempre.
**Ahora:** cada ejercicio compara tu **1RM estimado** (fórmula de Epley, mejor serie «normal»; sin bajadas ni serie viuda; máx. 12 reps) de **tu primera sesión**
con el **mejor** que has hecho. La mejora de cada ejercicio va de 0 a +100 %; los puntos son la **mejora media × 10** (p. ej. +12,4 % = 124 puntos).
- **No cuenta cuántas veces entrenas ni cuánto llevas sin hacerlo**: tu mejor marca no baja si paras; solo sube cuando mejoras. Las sesiones de deload no cuentan.
- Entras en la lista cuando tienes **3 ejercicios con peso hechos al menos 3 veces** (antes, la pantalla dice «Calibrando…» y cuántos te faltan).
- Niveles por mejora media: Aprendiz +5 %, Constante +10 %, Intermedio +20 %, Avanzado +30 %, Élite +45 %, Leyenda +60 %.
- La pantalla tiene «Ver cómo sale (por ejercicio)» para que compruebes tu cálculo, y «¿Cómo se calcula?».
- En la nube se guarda `metrica = 2`; las filas antiguas (`metrica = 1`) dejan de verse y cada usuario pasa a la nueva al abrir la versión nueva.
- **Límites honestos:** (a) al principio se progresa más rápido, así que los recién llegados suben deprisa (por eso hay filtro por nivel);
  (b) el punto de partida es tu primera sesión: si alguien registra un peso muy bajo al empezar, sale inflado (lo limita el tope de +100 % por ejercicio);
  (c) se calcula en el móvil, así que se puede falsear: es un ranking «entre amigos», no una competición con premios.
- **Alternativas que no implementé** (dímelo si prefieres otra): fuerza relativa al peso corporal (compara niveles absolutos, favorece a los avanzados),
  media por semana activa, o temporadas mensuales (vuelve a penalizar al que falta).

## 2. 🎨 Interfaz reorganizada (estilo apps profesionales)
- *(Superado en v108: el sidebar ☰ volvió con rutina + Entrenamiento + texto grande.)* **Se eliminó el menú lateral ☰.** Arriba a la izquierda hay un **avatar** (la inicial de tu correo, o 👤 sin cuenta) que abre una **hoja de cuenta**
  (Ajustes · Perfil y seguridad · Cerrar sesión / Iniciar sesión). Arriba a la derecha: **⚙️ Ajustes** y ⏱️ temporizador.
- **Nueva pantalla ⚙️ Ajustes**, en grupos: Cuenta · Apariencia (**galería de temas con muestra de cada uno**, interruptores de texto grande y series en verde) ·
  Entrenamiento (rutinas, importar con IA, notas de progresión, mensajes, sonido) · Datos (backup) · Aplicación (instalar, guía, actualizar, **versión que está corriendo**).
- **La rutina activa** pasó al menú principal (selector bajo la barra superior).
- **Perfil** rediseñado: tarjeta con avatar, sincronización, **«Cambiar contraseña» plegable** y «Cerrar sesión» al final.
- **Botón atrás** (físico y ←): las pantallas abiertas desde Ajustes (rutinas, guía, notas, mensajes, sonido, importar IA, perfil) vuelven a **Ajustes**; Ajustes vuelve al menú.
- Detalles: la hoja se cierra con Escape o tocando fuera y devuelve el foco al avatar; la fecha del diario ya no sale «17 De Noviembre».

## 3. 🔍 Búsqueda de alimentos mejorada
Categorías como **botones** con contador (según lo que escribes) y 🕘 **Recientes** (de tu diario de 30 días) · fichas con kcal grandes, categoría y macros ·
**palabras resaltadas** · **ordenar** (más proteína, proteína por kcal, menos/más calorías, A–Z) · «Mostrar más» · Enter elige el primero ·
**gramos rápidos** (50–250) y **vista previa** de lo que aportan antes de añadir · si no aparece: «Quitar filtros» o «➕ Añadir «lo escrito» a Mis alimentos».
Sigue sin perder el foco al escribir, ignora tildes y mayúsculas y funciona sin conexión.

## 4. 💪 Tu rutina (documento `rutina_hipertrofia_DEFINITIVA_v6`)
- Nuevos métodos de progresión: **`ondulante`** (ciclo de 4 semanas: 1 = mínimo de reps, 2 = punto medio, 3 = máximo, 4 = Deload; la semana 4 hecha en Deload sube el peso:
  +incremento, o la mitad si alguna semana fue «difícil») y **`doblefallo`** (doble progresión + última serie al fallo técnico).
- Plantilla nueva **«Hipertrofia Upper/Lower · 4 días (ejercicios libres)»** con las anclas en ondulante, el resto en doble+fallo, tempos, notas de técnica,
  calentamientos y Deload activado. Incrementos por ejercicio (`incremento`) respetados.
- **Decisiones mías (corrígeme):** el ciclo avanza **por sesión de ese ejercicio**, no por calendario · «difícil» = alguna serie por debajo del objetivo en las semanas 1–3 ·
  un Deload adelantado no cambia el ciclo · si se entrena la semana 4 sin Deload, el ciclo reinicia **sin subir peso** · las fases del Nordic curl las cambias tú
  (método «ninguna») · sentadilla frontal con incremento +2,5 kg, tal como pone el documento · los 3 ejercicios que añadiste (sin clasificar en el documento) usan doble progresión estándar.
- **Alimentos: de 103 a 140**, todos con número FDC del USDA y con las 4 cifras verificadas (misma metodología que en v106). Siguen sin estar (no pude verificarlos):
  plátano verde frito/hervido, yuca cocida, pan cubano, frijoles blancos, aceite de girasol, chuleta de cerdo, bistec de res, refrescos, ron y platos compuestos
  (congrí, moros, picadillo…): se pueden guardar ya como «Mis alimentos».

## 5. Otras mejoras y arreglos
- **Actualizar la app:** a veces el navegador abortaba la recarga justo al activarse la versión nueva y la app seguía con la vieja hasta la siguiente apertura. Ahora se reintenta una vez
  (probado 5 de 5 veces; antes fallaba en 2 de 3).
- Las pantallas se ocultan con una regla general (`section[id^="pantalla-"]`), así que una pantalla nueva ya no se queda «debajo» de otra.
- Textos de ayuda que mencionaban el ☰ actualizados (Nutrición, rutina sin días).

## 6. Pruebas hechas (Chromium real, 390×844) y lo que NO pude comprobar
- Navegación: abrir Ajustes y cada pantalla, atrás físico y ← (incluido el editor con sus niveles internos), hoja de cuenta (Escape, tocar fuera, foco), perfil con y sin cuenta.
- Temas, interruptores, 11 temas con contraste, ciclo ondulante y doble+fallo de extremo a extremo, ranking (7 casos: **10 sesiones = 3 sesiones = parón de 100 días**, deload,
  peso corporal, bajadas, tope, datos basura), buscador (19 comprobaciones), modo sin conexión, actualización v106 → v107 con tus datos intactos.
- **No pude comprobar:** el ranking contra tu Supabase real (hay que ejecutar el SQL), el comportamiento en tu móvil/PWA instalada ni la caché de GitHub Pages.

---

# 🔧 v106 — sobre la v105

**Al subirla a GitHub Pages, sube TODOS los archivos de la carpeta (también `sonidos/` si la quieres), no solo algunos.** La app
ahora lo comprueba por sí sola (ver "Protección contra versiones mezcladas").

## Qué hay de nuevo
1. **🔍 Buscador de alimentos** (Nutrición): escribes y la lista se filtra al momento (sin tildes, mayúsculas ni orden de palabras:
   «pollo muslo» o «MUSLO pollo»), con filtro por categoría y contador. Tocas un alimento, pones los gramos y «Añadir». Muestra
   kcal y macros por 100 g de cada resultado. Funciona sin conexión.
2. **🍽️ Base de alimentos ampliada de 19 a 103**, con categorías nuevas (*Frutos secos y semillas*, *Grasas, dulces y bebidas*) y
   muchas formas de preparación (crudo/hervido/asado/frito/enlatado…). Cada línea de `alimentos.js` lleva el número **FDC** del USDA
   para poder comprobarla. **Cada valor se leyó en la fuente con sus 4 cifras (kcal, proteína, grasa, carbohidratos)**; los que no pude
   verificar NO están (la lista está en la cabecera de `alimentos.js`). Se comprobó la regla 4-9-4 (kcal ≈ 4·P + 9·G + 4·C): solo
   la soya y la miel se desvían ~9 % (fibra / tipo de azúcar, es normal en el USDA).
   - Aviso de honestidad: no tuve acceso directo al USDA (red bloqueada). Leí fichas del USDA a través de dos sitios que las
     reproducen (getfoodfacts.com y myfooddata.com) y solo acepté un alimento cuando kcal/proteína/grasa coincidían entre fuentes
     y los carbohidratos venían impresos. Un puñado de nombres en español (p. ej. «Huevo revuelto») se asignó por coincidencia exacta
     de las cifras con la ficha USDA de ese nombre; si ves un valor raro, dímelo y lo contrasto.
   - La guayaba mezcla proteína/grasa de la ficha «Guavas, common, raw» con los carbohidratos de la tabla resumen del mismo alimento.
3. **Sidebar reorganizado**: arriba Tema y Rutina activa; debajo 4 grupos plegables (✏️ Mis rutinas, 🎛️ Personalizar, 📖 Ayuda,
   💾 Datos y app) que recuerdan cuáles dejaste abiertos. Historial, Stats, Progreso, Medidas, Nutrición y Ranking pasaron al menú
   principal (rejilla de 6 botones), porque estaban duplicados en el sidebar.
4. **Mensajes de series mínimas y frases**: alternan sin repetir (ya en v105+); ver `frases.js`.
5. **Sonidos**: los 8 sonidos nuevos del temporizador **se generan por código** (no son mp3, por eso no estaban en el zip). A petición tuya,
   he exportado esos mismos 8 a la carpeta `sonidos/` (`01-campana.mp3` … `08-suave.mp3`) por si quieres tenerlos como archivos o
   usarlos como «audio propio». La app NO los necesita para funcionar.

## Protección contra «la app no abre»
- Si en 8 s la app no arrancó, la pantalla de carga muestra un panel: **Reintentar**, **Limpiar caché de la app y reintentar** (no borra tus
  datos) y **Descargar copia de mis datos** (mismo formato que «Exportar backup»). También dice qué archivo falta o si hay archivos de
  versiones mezcladas.
- **Protección contra versiones mezcladas**: cada archivo termina con la marca `gt-build:v106` y el service worker, al instalarse, comprueba
  que TODOS la tengan; si no, cancela la instalación y se queda con la versión anterior que sí funciona. **Para cada versión futura
  hay que cambiar la marca en todos los .js, en style.css y en index.html a la vez que `CACHE_VERSION` de sw.js.**
- Un paso de arranque que falle (dato raro) ya no tumba la app entera: se registra y el resto sigue.

## Pruebas hechas
Pruebas automáticas en Chromium: smoke, 20+ pruebas anteriores, fuzz con datos raros, actualización real v105 → v106 (con el aviso
«Nueva versión disponible», datos conservados, caché vieja borrada), modo sin conexión, panel de recuperación (con un archivo
borrado a propósito), rechazo de una mezcla de versiones (con una marca distinta a propósito) y botones del panel.

## Pendiente
- **Progresión de tu rutina actual**: espero tu documento para volcarla como método de progresión por defecto.
- Más alimentos (lista en la cabecera de `alimentos.js`) cuando pueda verificarlos; mientras, se pueden añadir como «Mis alimentos».
- Más frases motivacionales verificadas.

---

# ⭐ v105 — las 14 mejoras de Cristian + ranking (mejora 15)

Nuevos archivos: `musculos.js`, `frases.js`, `metodos.js`, `alimentos.js`, `nutricion.js`, `ranking.js` y `supabase_ranking.sql` (este último **no es de la app**: es para ejecutar una vez en Supabase). Todos los `.js` están en la caché offline (SW **v105**).
Probado en Chromium real (390×844): arranque sin errores, 11 temas, día/resumen/estadísticas, editor, copiar días, alternancia, métodos, nutrición, sonidos, mensajes, recordatorio, ranking (con nube simulada) y apertura sin conexión. **No pude probar contra tu Supabase real** (ver mejora 15).

## Las mejoras, una a una

| # | Qué hace | Dónde |
|---|---|---|
| 1 | **Copiar días de otra rutina** (varios a la vez) con sus pesos, descansos e incrementos. Si el nombre ya existe, se renombra «… (copia)». | Editar rutinas → rutina → 📥 Copiar días de otra rutina |
| 2 | **Casillas de reps cumplidas con el color del tema** (en el gris dejan de ser verdes). Si prefieres el verde de siempre: casilla en la barra lateral. | Barra lateral |
| 3 | **Borrar solo los récords**: botón 🗑️ (todos) y ✕ (uno). Pone una fecha de corte; **el historial y las gráficas no se tocan**; los récords se vuelven a formar con lo que entrenes después. | Estadísticas |
| 4 | **8 sonidos nuevos** para el temporizador (campana, gong, digital, despertador, alerta, xilófono, arcade, suave) con ▶ para escucharlos. Siguen el beep y tu audio propio. Se generan por código (no pesan). | Sonido temporizador |
| 5 | **Mensaje cada vez que no llegas al mínimo de reps**: global (puedes escribir varios y sale uno al azar), por ejercicio, o el de por defecto; se puede desactivar. Aviso al dejar de escribir 0,9 s. | Mensajes y frases; ejercicio → opciones avanzadas |
| 6 | **Calculadora de calorías y macros** (empezada, como pediste): tus datos → gasto (Mifflin-St Jeor × actividad) → metas según objetivo, o metas a mano; diario por días; alimentos propios. Guía explicada en la app. | Nutrición |
| 7 | **Frases estoicas** (43 + las tuyas) con autor, al azar, arriba del resumen al finalizar. | Resumen / Mensajes y frases |
| 8 | **Nota del ejercicio** a la derecha, bajo el músculo (distinta de «Ver técnica»), editable tocándola. | Pantalla del día |
| 9 | **Métodos de progresión**: doble, lineal, escalera (8→9→10…), triple (reps→series→peso), ninguna. Uno por rutina y otro distinto por ejercicio; la app decide sola al finalizar y avisa «próxima sesión». | Editor |
| 10 | **Métodos de intensidad** por ejercicio, automáticos: rest-pause, myo-reps, drop set, widowmaker, 10×10 (GVT). La app añade las series, descansos cortos y placeholders; las series extra no cuentan para subir de peso ni para volumen/1RM. + **Guía** con ~30 métodos más (autorregulación RIR/RPE, % del 1RM, ondas, densidad, cluster, superseries, pre-agotamiento, excéntricas, parciales, forzadas, HIT, EMOM, periodizaciones lineal/inversa/DUP/bloques/conjugada…). | Editor; Guía y Conceptos |
| 11 | **Alternar ejercicios** en un día: pones el mismo «grupo de alternancia» a dos o más ejercicios y la app muestra el que no hiciste la última vez (se puede cambiar a mano). | Editor → opciones avanzadas |
| 12 | **Calentamiento opcional**: los ejercicios existentes pasan a **sin** calentamiento; casilla «Calentamiento» por ejercicio en el editor. | Editor → opciones avanzadas |
| 13 | **Antebrazo** como grupo + **subzonas** por músculo (cabeza larga del tríceps, pectoral superior, dorsal, etc.). | Editor; badge en el día |
| 14 | **Recordatorio de medidas**: «mídete cada N semanas». Cuando toca, aparece un aviso en el menú con *Medirme ahora / En 3 días / Saltar*. | Medidas corporales |
| 15 | **Ranking global y nivel** (ver abajo). | Barra lateral → 🏅 |

## Cosas que interpreté (corrígeme si no era eso)
- **«Viudas negras» → Widowmaker** (serie final de 20+ reps con peso ligero). **«Deadfits»: no sé qué método es** y no lo inventé. Lo más cercano que conozco es *dead-stop* (parada completa), que está en la guía. Si me dices cómo se hace, lo añado.
- **«Microseries»**: en la app son rest-pause/myo-reps (mini-series, automáticas); las **series en racimo (cluster)** están solo explicadas en la guía.
- **2**: lo entendí como que las casillas usen el color de acento del tema (el gris mostraba verde). Verde clásico queda como opción.
- **5**: «un mensaje cada vez» = cada serie que queda por debajo del mínimo.
- **8**: la nota es **tuya y editable**; si lo que quería Cristian era una nota fija escrita en la rutina, también se puede (campo «Nota» en opciones avanzadas).
- **11**: «alternar por cuál se hizo último» lo resolví con un nombre de grupo común.
- **14**: la app **solo avisa al abrirla** (no hay notificaciones push en segundo plano; una PWA no puede garantizarlo sin servidor).

## Lo que NO pude comprobar / límites honestos
- **Alimentos**: solo hay **19** (todos verificados contra USDA SR Legacy). Faltan aceite, pasta, malanga, frijoles colorados, garbanzos, chícharos, papaya, guayaba, piña y platos compuestos (congrí, moros, picadillo…): **no pude verificar sus valores y no los inventé**. Añádelos en «Mis alimentos» (la lista crece contigo) y dime cuáles quieres que ponga primero. Los valores varían con la variedad y la cocción.
- **Frases**: son adaptaciones libres al español de Marco Aurelio, Séneca y Epicteto; la interfaz las marca «(adaptación)». La de Séneca Ep. 104 la completé desde el latín conocido porque el texto verificado venía cortado. De Epicteto cito solo «Enquiridión» (la numeración cambia entre ediciones).
- **Evidencia de las subzonas**: la hipertrofia «regional» tiene evidencia limitada; son una etiqueta de organización, no una garantía.
- La nutrición usa referencias generales (superávit 10–20 %, déficit 0,5–1 % del peso por semana, proteína 1,6–2,2 g/kg); son estimaciones de partida, no una pauta médica ni dietética individual.

## Mejora 15 — Ranking global (¡hace falta un paso tuyo!)
- Es **opcional** y necesita cuenta en la nube. Subes **solo**: apodo, puntos, nivel, nº de sesiones y volumen. Nunca rutinas, historial, medidas ni correo. Puedes salir cuando quieras (se borra tu fila).
- **Puntos** = 10 por sesión (sin contar deload) + 1 por cada 1000 kg de volumen. **Niveles** (invención mía, ajustables en `ranking.js`): Novato 0 · Aprendiz 100 · Constante 300 · Intermedio 700 · Avanzado 1500 · Élite 3000 · Leyenda 6000. Hay filtro por nivel. *Otra interpretación posible*: nivel = principiante/intermedio/avanzado declarado por cada uno; dímelo si lo prefieres así.
- **Carga automática**: se actualiza al abrir la app, al volver la conexión y al terminar un entrenamiento. **Sin internet se ve la última descarga guardada** con su fecha («📴 Sin conexión · Última actualización…»).
- **Para activarlo** ejecuta una vez `supabase_ranking.sql` en Supabase → SQL Editor. Crea la tabla `ranking` con seguridad por filas: todos los usuarios con sesión **leen**, cada uno solo **escribe/borra su propia fila**. Mientras no exista la tabla, la pantalla avisa y el resto de la app funciona igual.
- **Límite**: los puntos se calculan en el móvil de cada uno; alguien con conocimientos podría falsearlos. Es un ranking de confianza entre amigos, no una competición con premios. Mostraré hasta 100 usuarios.
- Probado con una **nube simulada**: subida, escape de apodos con HTML, orden y modo sin conexión. **No lo he probado contra tu Supabase real.**

## Otros cambios técnicos
- Sincronización y backup incluyen las claves nuevas; al fusionar, los récords borrados **no reaparecen** (gana la fecha de corte más reciente).
- Las estadísticas y el volumen ya no cuentan bajadas ni serie viuda (usan otro peso).
- Los ejercicios pueden llevar `tipos` por serie en el historial; editar una sesión antigua los conserva.
- Durante el deload no se aplican los métodos de intensidad (series al 60 %, pesos al 70 % como antes).
- El gráfico de progreso de un ejercicio sigue mostrando su «récord» desde todo el historial (el borrado de récords afecta a la lista de récords y a los avisos de récord nuevo).

---

## Novedades de la v99/v100 (sobre la v98)

> La caché del service worker es ahora **v105** (las versiones anteriores ya se habían entregado con menos arreglos; subir el número es lo que hace que los móviles se actualicen).

### El fallo de tu captura: nombre del ejercicio en vertical al pulsar "Última sesión"
**Causa**: la guía de la última sesión se insertaba *dentro* de la cabecera del ejercicio, que es una fila flexible
(título + etiquetas). La guía, al ser un bloque ancho, aplastaba el título hasta dejarlo con ancho 0 y las letras caían
una debajo de otra. Reproducido antes (título de 0 px de ancho) y verificado después (147 px, en horizontal).
**Arreglo**: la guía va ahora *debajo* de toda la cabecera, a ancho completo.

### Arrastrar para reordenar (nuevo, lo pediste)
- Días (en *Editar rutinas → rutina*) y ejercicios (dentro de un día) tienen un asa **⋮⋮** a la izquierda: se mantiene pulsada y se arrastra. Las flechas ⬆️⬇️ desaparecen.
- Mientras arrastras, el elemento sigue al dedo, los demás se apartan y la lista **se desplaza sola** cerca de los bordes de la pantalla. Soltar confirma; si lo devuelves a su sitio no cambia nada; un toque suelto no hace nada.
- **Si tenías un ejercicio abierto para editar** (con cambios sin guardar), el formulario se pliega mientras arrastras y, al soltar, sigue abierto **junto al ejercicio que moviste, con lo que habías escrito**. Lo escrito en "Añadir ejercicio" también se conserva.
- **Teclado**: con el asa enfocada, las flechas ↑/↓ mueven un puesto (y el foco se queda en el asa); Escape cancela un arrastre. El asa tiene etiqueta para lectores de pantalla.
- Es seguro porque pesos, notas e historial se guardan por **nombre**, no por posición. El menú del día refleja el nuevo orden.
- Código nuevo: `ordenar.js` (añadido a la caché del service worker).

### Duplicar un día (nuevo, lo pediste)
- Botón **📑** en cada día del editor: crea una copia justo debajo con el nombre «… (copia)», «… (copia 2)», etc., con los mismos ejercicios, notas, tempos, descansos y ajustes de timer/cronómetro.
- **La copia empieza con los mismos pesos de trabajo, descansos e incrementos que tiene ahora el original** (si habías subido el press banca a 85 kg, la copia también arranca en 85).
- **No copia el historial** (la copia parte "sin sesiones", y su progresión es independiente), ni las notas de progresión del día original. Lo hice así a propósito para que la copia sea un día nuevo; si prefieres que copie también esas notas, dímelo.
- Como todo se guarda por nombre de día, **ya no se permiten dos días con el mismo nombre** (sin distinguir mayúsculas) al crear, renombrar o importar: se avisa, o en la importación se renombran («Día (2)»).

### Modo texto grande (nuevo, lo pediste)
- Activar: botón **Aa** en la cabecera del entrenamiento (un toque, ideal entre series) o casilla *🔠 Texto grande* en la barra lateral.
- Las letras crecen un 30 % y botones, casillas de series y campos un 20 % (las casillas de series pasan de 46 a 55 px de alto en móviles de 360 px). Se recuerda al cerrar la app y se aplica antes de pintar, sin parpadeo.
- **Es una preferencia de ese dispositivo**: no se sincroniza con la nube (el móvil y el ordenador pueden tener cada uno la suya). Sí viaja dentro de un backup manual, como el tema.
- Revisé 19 pantallas y ventanas en modo normal y grande a 320, 360 y 390 px: sin scroll horizontal. Con texto grande un título largo ocupa más líneas y el pie del ejercicio puede pasar a dos líneas; es lo esperado.
- Las ventanas emergentes ahora se desplazan por dentro si el contenido es más alto que la pantalla (con texto grande y pantalla pequeña el botón de confirmar podía quedar fuera).

### Mejoras extra de la última revisión
- **Día "Siguiente" en el menú**: el día que sigue al último que entrenaste (en la rutina activa) lleva una etiqueta y un borde de color. Es solo una pista: puedes entrenar el que quieras. No aparece si aún no hay sesiones de esa rutina.
- **Contador "Series registradas 7 / 24"** con barra de progreso al principio del entrenamiento (se pone verde al completar todas). Cuenta las casillas con algún número, también un 0.
- **Músculos en la Rutina Base**: tu rutina base no traía ningún músculo asignado, así que la estadística "Series por músculo" salía toda como "Sin músculo asignado". Asigné solo los inequívocos (p. ej. Press banca → pectoral, Sentadilla trasera → cuádriceps, Roll-out → core). **Dejé sin asignar** los ambiguos: Press jabalina, Fondos en paralelas, Encogimientos, Peso muerto convencional, Curl invertido, Desplantes con barra, Peso muerto unilateral y Clean (los eliges tú en el editor). Se aplica **una sola vez** al abrir la app y **nunca pisa** un músculo que ya hubieras puesto; si luego lo vacías, no se vuelve a rellenar. (Esta es la elección mía más discutible: si no te convencen alguna de las asignaciones, cámbiala en *Editar rutinas*.)
- **Gráfica de progreso**: tenía una altura fija menor que la barra más alta + su número + su fecha, así que los números salían cortados por arriba y las barras quedaban pegadas al borde. Ahora la altura se ajusta.
- **Teclado decimal** (`inputmode="decimal"`) en los campos de peso e incremento del entrenamiento, útil sobre todo en iPhone.
- **Menú**: los tres botones de abajo (Historial, Stats, Medidas) quedaban distintos entre sí (unos partían la línea, otros no); ahora los tres llevan el icono arriba y el texto debajo.

### Otros fallos encontrados en la revisión y corregidos
- **Se perdían las series escritas** al tocar **"Ver detalle →"** en el entrenamiento (acababas en el menú) o al abrir Historial/Medidas/etc. desde la barra lateral y volver con ← o con "atrás". Ahora se retoma el entrenamiento tal como lo dejaste. Lo mismo al **editar la rutina** con un entrenamiento abierto (se conservan las repeticiones por nombre de ejercicio si la rutina activa no cambió).
- **La guía "Última sesión" desaparecía** al restaurar un entrenamiento tras recargar o al cambiar entre 1 y 2 personas; ahora se mantiene.
- El botón de **"última sesión" del menú** contaba sesiones de otras rutinas; ahora solo las de la rutina activa (las antiguas sin rutina asignada cuentan para todas).
- **Menú: "Hoy / Ayer / Hace N días" desactualizado**: al terminar una sesión (o borrar una del historial) y volver al menú, los botones de los días seguían mostrando el dato antiguo (p. ej. "Sin sesiones") hasta recargar la app. Ahora se actualizan al volver al menú. (Venía de la v98; lo encontré en la última pasada de revisión.)
- **Botón 🧮 de discos**: caía a otra línea (heredaba `display:block`, ancho 100 % y margen); ahora va junto a «Peso (kg)».
- **Progresión**: un ejercicio con `repsMax = 0` contaba como "completado" y podía subir peso; ahora no.
- **Terminar y cerrar la app**: tras finalizar una sesión, el estado guardado seguía apuntando al día ya terminado y, al cerrar la app en el resumen, podía reabrirse un día vacío; ahora se guarda que estás fuera del día (lo deduje leyendo el código; no tiene prueba propia).
- **Exportar CSV/JSON de rutina**: en algunos navegadores la descarga podía cancelarse al liberar el archivo demasiado pronto (no lo pude reproducir en Chromium); ahora se retrasa un segundo y el enlace se añade a la página.
- **Notas de progresión** (texto grande, 320 px): una línea larga de "series · peso · descanso" desbordaba; ahora se parte.
- **iPhone con barra de estado translúcida**: el contenido quedaba bajo la barra; se añade el margen de seguridad superior.

### Funciones nuevas de la última ronda (v104)
Eran las ideas que habían quedado pendientes:
- **⏱ Descanso automático (opcional)**: en ☰ → Audio hay un interruptor nuevo, **desactivado por defecto**. Activado, al escribir las reps de una serie arranca solo el temporizador de ese ejercicio. No arranca tras la última serie, ni al corregir una serie ya anotada, ni en modo 2 personas; se para tocando el botón ⏱ como siempre. Es un ajuste de este dispositivo (no se sincroniza; sí viaja en los backups).
- **✏️ Corregir una sesión del historial**: en el detalle de una sesión, botón "Corregir esta sesión" para cambiar pesos, reps y notas (límites: reps 0–999, peso 0–9999). Solo corrige el registro: **no cambia los pesos de progresión de tus rutinas**. La sesión queda marcada como editada y, si se sincroniza con otro dispositivo que aún tiene la versión antigua, gana la corregida.
- **✏️ Corregir una medida corporal**: botón ✏️ junto a cada medida; sube sus valores al formulario y "Guardar corrección" la sustituye conservando su fecha.

### Segunda revisión independiente (v103)
Otro revisor leyó las zonas que faltaban (importar con IA, medidas, deload, HIT, service worker, audio). Verifiqué cada hallazgo antes de cambiar nada:
- **Importar o borrar una rutina con una sesión en curso** vaciaba las series y dejaba ejercicios de una rutina guardados en otra. Ahora la sesión sigue con SU rutina (las reps escritas se conservan) y la nueva queda guardada sin activarse hasta que termines. Si lo que se borró es la rutina de la sesión, se cierra la sesión con un aviso. (Probado.)
- **Cronómetro HIT**: seguía contando al salir al menú sin finalizar y podía guardarse en otro día; al reabrir la app sumaba todo el tiempo cerrada (un "HIT de 20 h"). Ahora se reinicia al salir al menú y, al restaurar, el tiempo añadido tiene tope de 3 h. (Probado lo primero.)
- **Importar con IA**: tiempo máximo de 90 s (antes con mala conexión se quedaba "Procesando…" para siempre), errores de red en español, y `max_tokens` de 4000 a 8000; si aun así se corta, avisa de que la rutina es demasiado larga en vez de dar "JSON inválido". No pude probar la API real.
- **Deload**: si la semana de deload caducaba (o se activaba) a mitad de sesión, el criterio se evaluaba al finalizar y los pesos al 70 % podían quedar como peso base. Ahora cuenta cómo se **cargó** la sesión. Los pesos de deload se redondean a múltiplos de 0,5 kg (antes salían 15,75 kg). (Probado: caduca a mitad de sesión → sesión marcada deload y config intacta.)
- **Aviso "Nueva versión"**: si elegías "Luego" no volvía a salir nunca (el SW seguía en espera), y una PWA instalada podía tardar horas en buscar versión nueva. Ahora el aviso reaparece al abrir, la app busca versión nueva al volver a primer plano (máx. cada 30 min) y, si estás en plena sesión, pregunta al volver al menú en vez de interrumpirte. **No pude probar este flujo de actualización en un móvil real.**
- **Etiqueta "Al fallo"**: todo peso 0 salía como "Al fallo" (dominadas, plantillas sin peso…). Ahora: "Al fallo" solo si lo era (las sesiones nuevas lo guardan), "Sin peso" si no. Las sesiones antiguas con peso 0 mostrarán "Sin peso".
- **Medidas corporales**: rangos razonables al guardar (peso 20–400 kg, altura 100–250 cm, perímetros…) para evitar un "750" por "75,0" que rompía la gráfica y el IMC.
- **Audio personalizado**: máximo 30 s (un MP3 de 5 MB puede durar 40 min y agotar la memoria al decodificarlo), y si falla guardarlo se usa igualmente en esa sesión.
- **Notas de progresión**: con el almacenamiento lleno ya no lanzan una excepción en cada tecla (un solo aviso).
- **Caché**: las comprobaciones de conexión (`?ts=…`) ya no se guardan en la caché.

**Hallazgos que NO cambié** (hay más de una interpretación):
- Con peso 0 (dominadas, fondos…), completar todas las reps sube el peso a **+1 kg** en la primera sesión. Puede ser deseable (pasar a lastre) o molesto (dejar de ser peso corporal). No lo cambié sin saber qué prefieres; si quieres que el peso corporal no progrese solo, es un cambio pequeño.
- Cambiar al modo "2 personas" cancela los temporizadores de ejercicio en marcha (la pantalla se reconstruye). Es consecuencia del diseño.
- (Ya resuelto en la v104: editar medidas y sesiones.)
- Las notas de progresión van por nombre de día: renombrar un día las deja huérfanas (no verificado qué hace el editor).

### Ronda de revisión independiente (v102)
Un segundo revisor leyó el código buscando errores de lógica; verifiqué cada hallazgo antes de tocar nada. Arreglado:
- **Series negativas o con decimales en el editor** (p. ej. `-1` o `2.5`) guardaban el ejercicio y **ese día dejaba de abrir** (probado). Ahora el editor valida series (entero 1–30), reps (enteros), peso (0–9999) y descanso (0–3600 s), y la app además sanea lo que ya estuviera guardado.
- **Finalizar con el almacenamiento lleno**: antes se borraba el auto-guardado y se subía el peso de progresión *antes* de saber si la sesión se guardaba; al reintentar, el peso subía dos veces. Ahora primero se guarda la sesión y solo entonces se aplica la progresión y se limpia el auto-guardado (probado: no sube el peso, no se pierde lo escrito, y al reintentar sube una sola vez). "0 series" ya no cuenta como serie completada.
- **Temporizador global**: con uno pausado, pulsar ▶️ en otro de la lista reanudaba el viejo en vez de empezar el elegido. Los minutos/segundos negativos o enormes al crear un timer se limitan. El fin del temporizador global ahora también **vibra** (si tienes la vibración activada), como ya hacían los de cada ejercicio.
- **Temporizadores por ejercicio**: se guardan al iniciarlos/pararlos, así que sobreviven a recargar la app justo después.
- **Reps y pesos** se limitan a rangos razonables (reps 0–999, peso 0–9999): un "100" por "10" ya no dispara una progresión falsa ni un volumen absurdo.
- **"Sesión interrumpida"**: solo se ofrece si es del mismo día y rutina que abriste (antes podía mezclar pesos de otro día), y no se crea auto-guardado si aún no escribiste ninguna repetición. Una sesión abierta hace más de 12 h no cuenta como "24 h de entrenamiento".
- **Pantalla activa**: ya no se acumulan bloqueos al volver a la app.
- **Sincronización**: si la nube tiene una fila antigua sin marca de sincronización y este dispositivo tampoco la tiene, ahora se trata como conflicto (fusionar) en vez de sobrescribir. «Traer de la nube» avisa si tienes cambios sin subir (porque la nube manda en pesos/rutinas/ajustes). Restaurar un backup muestra cuántas sesiones tienes ahora frente a las del backup y avisa si perderías sesiones recientes o si se subirá a la nube.
- **Estadísticas**: sesiones con fecha inválida ya no producen "NaN". **Nuevo**: «Semanas seguidas» y «Sesiones esta semana» (con 3–5 entrenos semanales la racha de días consecutivos casi nunca pasa de 5; la semanal refleja mejor la constancia y no se rompe a mitad de semana).

**Hallazgos que NO cambié** (decisión tuya o de diseño):
- Rutinas/ejercicios extra borrados pueden reaparecer tras fusionar con otro dispositivo (faltan "lápidas" como las del historial). Es un cambio de diseño en la sincronización; no lo toqué sin poder probarlo con Supabase real.
- Restaurar un backup *reemplaza* el historial (así funciona "restaurar"); ahora lo avisa mejor, pero no lo fusiona.
- Con la pantalla bloqueada el navegador puede congelar la app y el aviso de fin de descanso llega tarde: no tiene arreglo completo en una PWA (ver pregunta de app nativa).

### Aviso "¡Descanso terminado!" del temporizador (v101)
Lo probé con un detector de audio y encontré fallos reales:
- **Cerrarlo con el botón "atrás" del móvil lo ocultaba pero la alarma seguía sonando en bucle** hasta tocar el reloj de otro sitio. Ahora cualquier forma de cerrarlo (botón, "atrás", Escape o tocar fuera) **para la alarma y deja el temporizador en "Listo"**.
- **Escape y tocar fuera no hacían nada**; ahora cierran el aviso.
- **Nuevo botón "➕ 30 s más"**: un descanso extra de 30 s sin volver a configurar el timer.
- Al iniciar un temporizador, el tiempo se ve **de inmediato** (antes seguía en "Listo 0:00" durante el primer segundo).
- El título del aviso se escala con el modo texto grande. Comprobado a 320 px con texto grande: los dos botones caben.
- Esto es el temporizador global (🕐 de la cabecera). Los botones ⏱ de cada ejercicio no abren aviso: cambian a "🔔 ¡Toca para parar!" y suenan hasta que los tocas; eso no lo cambié.

### Última ronda: accesibilidad y datos dañados (v100)
- **La app ya no se queda inutilizable si hay datos corruptos** en el almacenamiento del navegador. Antes, un historial con una entrada rota (`null`, un número…) o una configuración con JSON dañado hacían fallar el arranque y la app se quedaba en "Cargando…". Ahora: las entradas del historial que no son sesiones se apartan en una clave `historial_descartados` (últimas 50; no se sincroniza, sí viaja en los backups) y el resto sigue funcionando; `config`, `timers` y el estado guardado se leen de forma segura. Es una red de seguridad: no sé de ningún caso real tuyo, lo detectó la prueba de datos corruptos.
- **Rutina sin días**: el menú muestra un aviso que explica cómo añadirlos (antes quedaba vacío sin explicación).
- **Almacenamiento bloqueado** (cookies/datos del sitio bloqueados o modo privado estricto): se muestra un mensaje claro en vez de "Cargando…" indefinido. En ese caso la app no puede guardar nada, así que lo único posible es avisar.
- **Accesibilidad**: etiquetas para campos que no tenían (los asocia automáticamente con su texto), nombres para botones/campos de iconos, roles de diálogo (`dialog`/`alertdialog`) en las ventanas emergentes, y las barras laterales cerradas ya no se pueden alcanzar con la tecla Tab.

### Qué NO pude comprobar
- **El botón "atrás" real y el arrastre con el dedo en un móvil real**: probé toques reales simulados (Chromium, eventos táctiles de bajo nivel) y ratón, pero no un Android/iPhone físico. Si en algún móvil el arrastre se sintiera brusco o el asa costara de pillar, dímelo y lo ajusto (tamaño del asa, umbral de arranque).
- iOS/Safari no probado. Supabase y Anthropic reales siguen sin probar.
- Una prueba automática de arrastre de ejercicios falló una vez cuando la lanzé justo después de otra tanda y luego pasó 7 de 7 veces seguidas; lo atribuyo a carga de la máquina de pruebas, pero no pude demostrarlo. Si notas que el arrastre a veces "no coge", avísame.
- Los avisos que quedan de mi auditoría automática son falsos positivos: etiquetas de gráfica de 13 px con texto grande (diseño), el deslizador de volumen (es un control de rango) y una nota pequeña.

**Para publicar**: sube **todos** los archivos (incluido el nuevo `ordenar.js`) a la vez; el service worker ya es v104 y la app avisará de la actualización.

---

## Novedades de la v98 (sobre la v97)

### Botón "atrás", salir de ventanas y paneles (reescrito `nav.js`)
Medí el comportamiento anterior con una matriz de pruebas y encontré estos fallos reales, ya corregidos:
- **Barra lateral y panel del temporizador**: "atrás" no los cerraba (salía de la app o cambiaba de pantalla con el panel abierto). Ahora cada panel o diálogo que se abre añade su entrada de historial y se cierra con "atrás", con el botón ✕, tocando fuera, con Escape o con el gesto de borde (todo queda sincronizado).
- **Diálogos** (confirmar, aviso, pedir texto, descanso, tempo, temporizador): lo mismo; además ya no se acumulan entradas de historial al abrir y cerrar cosas en cadena (antes "atrás" necesitaba varias pulsaciones).
- **Estadísticas → "Ver gráficas de progreso"**: "atrás" y "←" volvían al menú saltándose Estadísticas. Ahora vuelven a Estadísticas.
- **Editor de rutinas**: "atrás" salía del editor entero aunque estuvieras en un día o una rutina. Ahora sube un nivel cada vez (día → rutina → lista → menú); los botones "← Volver" internos usan el mismo camino. Crear desde una plantilla sustituye el nivel "plantillas" por la rutina creada.
- **Salir de un día con repeticiones**: "atrás" pregunta si salir; si dices **No** sigues en el día y "atrás" sigue funcionando (antes se perdía la entrada). 
- **Importar con IA**: al terminar volvía al menú sin limpiar el historial de navegación; ahora usa el mismo camino que "←".
- **Cerrar sesión / entrar** (`mostrarMenu`): ahora también limpia las entradas de historial (cambio pequeño; no tiene prueba propia).
- Comprobado con 73 pruebas de navegación (clics reales, "atrás" del navegador, botones ←, recarga de página, estabilidad de `history.length`).

### Reordenar días en el editor (nuevo, lo pediste)
En *Editar rutinas → rutina*, cada día tiene ⬆️/⬇️ como los ejercicios (no aparecen si solo hay un día). Es seguro porque pesos, notas, ajustes e historial se guardan por **nombre de día**, no por posición; lo comprobé (el peso de un día sigue ahí tras moverlo, cada día conserva sus ejercicios y su configuración de temporizador/cronómetro, y el menú muestra el nuevo orden). Mover un día no cambia nada de tu historial.

### Pantalla y visualización (auditoría automática de desbordes y tamaños a 320, 360, 390, 768 px y horizontal; contraste en los 11 temas a 390 px)
- **Scroll horizontal a 320 px** (móviles pequeños) en: pantalla del día (las etiquetas de tempo/calentar/músculo empujaban el título), *Importar con IA* (el ejemplo de formato ensanchaba toda la página), *Guía de tempo* y el editor de rutinas (5 botones por rutina se salían). Corregido: las etiquetas pasan a otra línea y los botones bajan de línea si no caben.
- **Botón 🗑️ de ejercicio en el editor se veía azul** (como "Editar") por una clase que no existía; ahora es rojo como los demás de borrar.
- **"Ver detalle →"** en la pantalla del día parecía un botón gris; ahora es un enlace.
- **Objetivos táctiles**: los botones medían 24–35 px de alto (←, 👁️, 🗑️, ✏️, ⬆️⬇️, pestañas de progreso…). Ahora todos los botones y campos miden al menos 36–38 px, y las etiquetas de tempo/calentar tienen un área de toque invisible mayor sin cambiar su aspecto.
- **Contraste de texto (WCAG 4.5:1)**: en los temas Claro, Morado, Gris y Azul el color de acento, de peligro, de éxito/aviso o el texto secundario usado como *texto* no llegaba (2.3–4.3:1). Ahora el texto usa una variante calculada automáticamente (solo se aclara u oscurece lo necesario; los botones y barras conservan el color original y los temas que ya cumplían no cambian). Si no te gusta cómo queda algún tema dímelo y lo ajusto.
- Etiquetas de la gráfica de progreso de 9 px → 10 px (siguen siendo pequeñas; es el límite para que quepan las barras).

### Qué NO pude comprobar
- **El botón "atrás" real del sistema Android/iOS**: mis pruebas llaman a `history.back()` en Chromium de escritorio. Chrome puede ignorar entradas de historial creadas sin que toques la pantalla (protección anti-"trampa de atrás"); en mi diseño todas se crean tras un toque tuyo, pero no lo pude verificar en un móvil. Si algún día "atrás" saliera de la app en vez de cerrar un panel, dímelo.
- **Tras recargar la página dentro de una pantalla** queda una entrada de historial antigua que no se puede borrar: la primera pulsación de "atrás" desde el menú no hace nada visible y la segunda sale. Es una limitación del navegador (solo pasa tras recargar, no al uso normal).
- Capturas revisadas a mano solo en parte (Chromium); iOS/Safari no probado. Supabase y Anthropic reales siguen sin probar.

---

## Novedades de la v97 (sobre la v96 anterior)

**Errores nuevos encontrados y corregidos**
- **Récords falsos por ejercicios no hechos.** Si en una sesión dejabas un ejercicio sin tocar, se guardaba igualmente con su peso (ya subido por la progresión) y podía saltar un *"¡NUEVO RÉCORD!"* que no existía; además contaba en *Récords de peso*, en las gráficas y en la guía de "última vez". Ahora solo se guardan los ejercicios con al menos una serie con repeticiones (si no hiciste ninguno y confirmas finalizar, se guarda la lista completa, como antes), y récords, gráficas y la guía de última sesión **ignoran también las entradas antiguas** sin repeticiones. Esas entradas viejas siguen en tu historial (no las borro); solo dejan de contar.
- **Nombres de ejercicio repetidos en un mismo día.** Compartían peso guardado e historial. El editor ya no deja crearlos ni renombrarlos así, y al importar una rutina se renombran (`Press`, `Press (2)`…).
- **Restaurar un backup** ya no deja que la siguiente fusión con la nube vuelva a eliminar sesiones o medidas que habías borrado antes: las restauradas dejan de contar como "borradas".

**Mejoras**
- **Lápidas también para medidas**: borrar una medida en un móvil ya no reaparece al fusionar con otro (antes era una limitación conocida).
- **Series por músculo (últimos 7 días)** en *Estadísticas*, con comparación con la semana previa. Usa el campo *músculo* de tus ejercicios (los que no lo tienen salen como "Sin músculo asignado"); no cuenta deloads ni series sin repeticiones. El rango de 10–20 series/semana que se muestra es una referencia orientativa habitual, no una norma.
- **Calendario de asistencia** de las últimas 12 semanas.
- **Calculadora de discos** (botón 🧮 junto al peso de cada ejercicio): qué poner en cada lado de la barra con el mínimo de discos; barra y discos configurables y recordados en el dispositivo. Si el peso no se alcanza exactamente con tus discos, te dice cuál es el más cercano por debajo.
- **Gráfica de peso corporal** en *Medidas*.
- **Recordatorio de copia de seguridad**: si no usas cuenta y llevas ≥ 5 sesiones sin ninguna copia (o más de 30 días desde la última), la app te lo recuerda al abrir; "Luego" lo pospone 7 días. No molesta si tienes cuenta en la nube.
- **Accesibilidad**: las insignias de tempo y calentamiento se pueden activar con teclado (Enter/Espacio).

**Qué NO cambia**: no se borra ni se reescribe tu historial al actualizar (los datos antiguos sin repeticiones solo se ignoran en récords y gráficas); todo lo anterior sigue funcionando igual que en la v96.

---

## 0. Antes de publicar (importante)

1. **Sube todos los archivos** de esta carpeta (hay archivos nuevos: `nav.js`, `audioStore.js`,
   `plantillas.js`, iconos nuevos). Si falta uno, la instalación del Service Worker falla a propósito
   y el móvil se queda con la versión anterior (no se rompe nada).
2. **Cada vez que despliegues cambios, sube la versión en `sw.js`** (`CACHE_VERSION` y `CACHE_NAME`,
   ahora `v98`). Antes los archivos se actualizaban solos y por separado (se podían mezclar versiones
   de archivos distintos); ahora se actualizan **todos juntos** y la app pregunta *"Nueva versión
   disponible. ¿Actualizar?"*. Si no cambias el número, los móviles no se enteran.
3. **Rota tu API key de Anthropic.** La versión anterior sincronizaba *todo* el `localStorage` con la
   nube, incluida la API key y el token de sesión. La nueva versión ya no los sube, y la próxima
   subida reemplaza lo que había en la nube, pero lo prudente es crear una key nueva y borrar la vieja.
4. **Revisa la seguridad de tu tabla `usuarios` en Supabase** (no pude verlo). La clave `anon` es
   pública por diseño; lo único que protege los datos es RLS. En *Supabase → Authentication → Policies*
   debe existir algo equivalente a:
   ```sql
   alter table public.usuarios enable row level security;
   create policy "solo mi fila" on public.usuarios
     for all using (auth.uid() = id) with check (auth.uid() = id);
   ```
   (Si ya tienes políticas, no las dupliques: comprueba que hagan lo mismo.)

---

## 1. Errores corregidos (con su causa)

| Problema | Qué pasaba | Arreglo |
|---|---|---|
| **Pérdida de datos al sincronizar** | Al abrir la app se subía todo a la nube; si otro dispositivo tenía datos más nuevos, se **sobrescribían** | Solo se sube si hay cambios (`gym_dirty`). Antes de subir se compara `_syncedAt`; si la nube cambió, **no se pisa**: avisa y ofrece *Fusionar y subir* |
| "Bajar de la nube" borraba lo local | Reemplazaba | Ahora **fusiona**: historial y medidas se unen; rutinas/pesos/ajustes mandan los de la nube |
| Sesiones borradas que reaparecían | Con fusión, lo borrado en un móvil volvía desde el otro | "Lápidas" (`historialBorrados`) para sesiones borradas |
| Secretos en nube y backups | API key, tokens y audio viajaban en sync y en el `.json` de backup | Lista permitida de claves para sync y lista de exclusión para backup (v2) |
| XSS | Nombres de ejercicios/rutinas/email se insertaban como HTML | `escapeHtml` en toda inserción; los toasts usan `textContent` |
| Ejercicios con apóstrofe (`Farmer's walk`) | El `onchange` inline se rompía y no guardaba el peso | Ya no se pasa el nombre por el atributo |
| Botón ✕ del editor | No cancelaba la edición | Corregido (`cancelarEdicionEjercicio`) |
| Pantalla "vieja" tras editar | Cambiar tempo/notas en el editor no se veía al abrir el día | El hash de render incluye tempo, notas, músculo, incremento… |
| Botón "atrás" del móvil | El historial del navegador crecía en cada pantalla; "atrás" no salía de la app | Módulo `nav.js`: una entrada por pantalla secundaria, se limpian al volver al menú; recargar no apila entradas |
| Reabrir a mitad de sesión | Perdía hora de inicio, notas, y el temporizador global reiniciaba con valor viejo; el HIT no sumaba el tiempo cerrado | Se restauran inicio, notas, reps (por nombre), temporizador (recalculado desde la hora final, o en pausa) y HIT |
| Menú tapando la pantalla restaurada | `auth.js` mostraba el menú después de restaurar | El menú inicial no tapa una pantalla ya restaurada |
| Rachas y "hace N días" | Cálculo con milisegundos: el **cambio de hora de Cuba (domingo 1 nov 2026, es decir, mañana respecto a hoy 31 oct)** da un día de 25 h y errores de ±1 | `numDia()` cuenta días de calendario (probado con `TZ=America/Havana`) |
| Contraste en temas | Texto `#fff` fijo sobre botones de colores claros (ilegible en algunos temas) | Variables `--on-accent/success/danger/warning` calculadas por contraste (mínimo medido 4.95:1) |
| Pesos entre rutinas | Dos rutinas con un mismo ejercicio/día compartían peso | Clave por rutina `<id>::<día>_<ejercicio>` (la rutina base conserva la clave antigua; hay lectura de claves antiguas como respaldo) |
| Editor ↔ pesos guardados | Cambiar el peso en el editor no tenía efecto si ya había peso guardado; renombrar perdía pesos | El editor actualiza peso y descanso al cambiarlos; al renombrar un ejercicio o un día migra peso, descanso e incremento |
| Doble toque en *Finalizar* | Podía guardar la sesión dos veces | Guardia `_finalizando` |
| PR falsos tras *deload* | Las semanas de descarga contaban como récord/progreso | Sesiones marcadas `deload`, excluidas de PR y gráficas |
| CSV | Celdas que empiezan por `=`,`+`,`-`,`@` se ejecutaban en Excel | Se neutralizan |
| Sin conexión → "Actualizar app" | Borraba la caché y la app **no volvía a abrir** | Comprueba la conexión y que la descarga funcione **antes** de borrar nada |
| Importar con IA | Modelo retirado, cabecera de navegador ausente, parser frágil (`"No llegar al fallo"` se tomaba como *al fallo*; descansos mal leídos) | `claude-sonnet-5-5`, cabecera `anthropic-dangerous-direct-browser-access`, parser anclado y con negaciones, JSON robusto |
| API key | Se guardaba siempre en `localStorage` | Por defecto solo en `sessionStorage`; casilla *Recordar* + botón *Borrar* |
| Sonido personalizado | Un MP3 de 5 MB en base64 no cabía en `localStorage` (~5 M de caracteres) y se subía a la nube | Se guarda en **IndexedDB** (`audioStore.js`), con migración automática del antiguo |
| Lecturas de `localStorage` | `JSON.parse` sin protección: un dato corrupto rompía la pantalla | Lectura segura (`leerHistorial`, `leerHistorialCrudo`, `leerMedidas`, `leerRutinas`) |
| Arranque lento | Supabase se cargaba desde CDN de forma estática: sin internet, la app entera podía no arrancar | Carga **perezosa** (`getSupabase()`): solo cuando usas la nube. Splash de error a los 20 s (antes 60 s) |
| Notificaciones | Pedía permiso al abrir la app | Se pide al primer temporizador; con comprobación `typeof Notification` |

## 2. Funciones nuevas

- **Plantillas de rutina** (Editor → *Desde plantilla*): cuerpo completo 3 días, torso/pierna 4 días, empuje/tirón/pierna. Pesos a 0. Son estructuras habituales y genéricas, no una prescripción personalizada.
- **Calentamiento sugerido** (botón 🔥 en cada ejercicio con peso ≥ 20 kg): ~50 % × 8, ~70 % × 5, ~85 % × 3, redondeado a 2,5 kg (1 kg si ≤ 15). Es una guía orientativa habitual, **no un dato científico exacto**.
- **Gráfica de 1RM estimado (Epley) y de volumen** además de la de peso, sin contar deloads.
- **IMC** (OMS) y variación de peso respecto al registro anterior en *Medidas*, con validación de valores. El IMC es orientativo: no distingue músculo de grasa.
- **Imprimir / guardar PDF de la rutina** (🖨️ en el editor).
- **Accesos directos** al mantener pulsado el icono (Android/Chrome; iOS no admite este tipo de accesos): Historial, Estadísticas, Medidas, Temporizador. Probé la lógica con `?accion=…` en el navegador; no en un móvil real.
- **Iconos "maskable"** separados (el icono actual llega casi a los bordes y podía recortarse con la máscara circular de Android) y icono de 180 px para iOS.
- Incrementos por defecto según carga (≤15 kg → 1; ≤40 → 2; resto → 2,5), formato de volumen en kg/t, cierre de ventanas con *Escape*.

## 3. Archivos

Modificados: `app.js`, `auth.js`, `cloud.js`, `userState.js`, `ui.js`, `themes.js`, `style.css`,
`rutinaUsuario.js`, `editorRutinas.js`, `aiImport.js`, `selectorRutinas.js`, `sw.js`, `index.html`, `manifest.json`.
Nuevos: `nav.js`, `audioStore.js`, `plantillas.js`, `icons/icon-180.png`, `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`, este `CAMBIOS.md`.

## 4. Pruebas realizadas

Chromium (Playwright), móvil 390×844, Supabase simulado: carga sin errores; sin subida al abrir; solo claves
permitidas en la subida; conflicto sin sobrescribir + aviso; fusión; apóstrofe; cancelar en el editor; render
tras editar; historial del navegador estable; restauración a mitad de sesión (reps, notas, inicio, temporizador);
backup sin secretos; parser; IMC; calentamiento; plantillas; impresión; accesos directos; lápidas; contraste de
todos los temas; audio en IndexedDB y migración; Service Worker (precaché, abrir **sin conexión**, acceso directo
sin conexión, "Actualizar" sin red no borra nada, flujo de actualización entre versiones con aviso y recarga); cambio de
hora de Cuba; recorrido por todas las pantallas sin errores.

## 5. Lo que NO pude comprobar (dilo claro)

- **Supabase real**: RLS y el comportamiento exacto de `upsert`/`select` contra tu proyecto (usé una simulación).
- **Anthropic API real**: no hay key aquí; el nombre del modelo y la cabecera están según la documentación de Anthropic, sin llamada de prueba.
- **iOS/Safari y Android reales**: probé en Chromium. Wake Lock, vibración, notificaciones y audio en segundo plano dependen del sistema.
- **`supabase-js` en local (vendor)**: no tenía acceso a npm/jsDelivr desde mi entorno. Si quieres que la nube funcione **sin depender del CDN**:
  1. En una carpeta aparte: `npm i @supabase/supabase-js esbuild`
  2. Crea `entry.js` con `export { createClient } from '@supabase/supabase-js';`
  3. `npx esbuild entry.js --bundle --format=esm --minify --outfile=vendor/supabase.js`
  4. Copia `vendor/supabase.js` a la app, pon `USAR_VENDOR = true` en `cloud.js` y añade `BASE + "vendor/supabase.js"` a `APP_OPCIONALES` en `sw.js` (y sube la versión).
  (Pasos estándar, pero **no los he ejecutado**.) Sin esto la nube necesita conexión, lo cual es razonable; el resto de la app funciona offline.
- Las dependencias internas del CDN de Supabase se guardan en caché solo después de usarlas con conexión una vez; no pude verificarlo.

## 6. Limitaciones conocidas

- Si dos móviles editan **la misma rutina**, en la fusión gana la versión de la nube al bajar y la local al subir (no se mezclan ejercicios a nivel fino).
- En el menú principal, el botón "atrás" del sistema sale de la app (comportamiento normal de una PWA); dentro de una pantalla vuelve al menú.
- El 1RM por Epley es una estimación; fiable sobre todo entre 1 y 10 reps.
- Si usabas la app sin cuenta, la primera vez verás la pantalla de acceso; elige *Usar sin cuenta* y se recordará.

## 7. Ideas que no implementé (por si las quieres)

- Fotos de progreso (IndexedDB) y comparador antes/después.
- Series con RPE/RIR y progresión automática basada en ellas.
- Fusión por ejercicio de rutinas editadas en dos móviles a la vez.
- Exportar a Google Sheets/CSV por rango de fechas y recordatorio de medidas mensual.
- Tests automáticos en el repositorio (los míos están fuera; puedo prepararlos para GitHub Actions).

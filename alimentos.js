// alimentos.js — Base de alimentos (valores por 100 g)
//
// Fuente de TODOS los valores de esta lista: USDA FoodData Central, versión "SR Legacy", consultada a través de
// tools.myfooddata.com y getfoodfacts.com (páginas que reproducen los datos del USDA; cada línea lleva su número FDC para
// comprobarla). Se descartaron valores de páginas que mezclaban otras bases.
// k = kcal · p = proteína (g) · g = grasa total (g) · c = carbohidratos (g)
//
// IMPORTANTE: los valores dependen del estado del alimento (crudo / cocido) y varían con la variedad y la forma
// de cocinar. Los alimentos "crudos" se pesan crudos. Esta es una base de PARTIDA: puedes añadir tus propios
// alimentos (o corregir uno copiándolo como propio) en la pantalla de Nutrición.
//
// Siguen SIN estar: yuca cocida (SR Legacy solo trae la cruda; la única ficha cocida es una entrada genérica de encuestas,
// "cassava, cooked", sin método de cocción y con 3 g de grasa —la cruda tiene 0,28 g—, lo que sugiere grasa añadida; no se pudo
// comprobar y por eso no se usa), refrescos que no sean cola o limón-lima, y platos compuestos (congrí, moros, picadillo, ropa
// vieja…: al buscarlos solo aparecieron productos de marca, sin ficha genérica del USDA). Se pueden añadir ya como "alimentos propios".
//
// Pan cubano: su ficha (FDC 2707604) es de la base de encuestas alimentarias del USDA (FNDDS), no de SR Legacy; se incluye porque
// cumple 4-9-4 (272 kcal) y no hay otra fuente oficial, pero es una referencia, no una receta concreta.
// Chuleta y bistec: el USDA da el valor por porción comestible (sin hueso); si pesas la chuleta con hueso, descuenta el hueso.
// Ron: sus 231 kcal salen casi todas del alcohol (33,4 g × 7 kcal), que no cuenta como proteína, grasa ni carbohidrato, por eso
// las tres cifras valen 0.
//
// Nota: la guayaba mezcla proteína/grasa de la ficha "Guavas, common, raw" con los carbohidratos de la tabla resumen
// del mismo alimento; en frutas/verduras cocidas y crudas las kcal del USDA quedan por debajo de 4-9-4 porque la fibra
// cuenta como carbohidrato pero aporta pocas kcal; la cerveza lleva además 3,9 g de alcohol (7 kcal/g). Soya y miel difieren un ~9 % del cálculo 4-9-4 (por fibra / tipo de azúcar), como en el USDA.

export const ALIMENTOS = [
  { id: 'arroz_cocido',     nombre: 'Arroz blanco cocido',               cat: 'Cereales y viandas', k: 130, p: 2.7,  g: 0.28, c: 28.2 },
  { id: 'frijol_negro',     nombre: 'Frijoles negros cocidos (sin sal)', cat: 'Legumbres',          k: 132, p: 8.9,  g: 0.54, c: 23.7 },
  { id: 'yuca_cruda',       nombre: 'Yuca cruda',                        cat: 'Cereales y viandas', k: 160, p: 1.4,  g: 0.28, c: 38.1 },
  { id: 'boniato_crudo',    nombre: 'Boniato crudo',                     cat: 'Cereales y viandas', k: 86,  p: 1.6,  g: 0.05, c: 20.1 },
  { id: 'papa_cruda',       nombre: 'Papa cruda (con piel)',             cat: 'Cereales y viandas', k: 77,  p: 2.1,  g: 0.09, c: 17.5 },
  { id: 'platano_macho',    nombre: 'Plátano macho crudo',               cat: 'Cereales y viandas', k: 122, p: 1.3,  g: 0.35, c: 31.9 },
  { id: 'calabaza_cruda',   nombre: 'Calabaza cruda',                    cat: 'Cereales y viandas', k: 26,  p: 1.0,  g: 0.1,  c: 6.5 },
  { id: 'pan_trigo',        nombre: 'Pan de trigo (referencia USDA)',    cat: 'Cereales y viandas', k: 274, p: 10.7, g: 4.5,  c: 47.5 },
  { id: 'huevo_crudo',      nombre: 'Huevo entero crudo',                cat: 'Proteínas',          k: 143, p: 12.6, g: 9.5,  c: 0.72 },
  { id: 'pollo_pechuga',    nombre: 'Pechuga de pollo asada (sin piel)', cat: 'Proteínas',          k: 165, p: 31,   g: 3.6,  c: 0 },
  { id: 'cerdo_lomo',       nombre: 'Lomo de cerdo asado (magro y grasa)', cat: 'Proteínas',        k: 248, p: 27.1, g: 14.7, c: 0 },
  { id: 'res_molida',       nombre: 'Carne de res molida 85/15 cruda',   cat: 'Proteínas',          k: 215, p: 18.6, g: 15,   c: 0 },
  { id: 'leche_entera',     nombre: 'Leche entera',                      cat: 'Lácteos',            k: 61,  p: 3.2,  g: 3.3,  c: 4.8 },
  { id: 'banana',           nombre: 'Plátano fruta (banana)',            cat: 'Frutas y vegetales', k: 89,  p: 1.1,  g: 0.33, c: 22.8 },
  { id: 'mango',            nombre: 'Mango',                             cat: 'Frutas y vegetales', k: 60,  p: 0.82, g: 0.38, c: 15 },
  { id: 'naranja',          nombre: 'Naranja',                           cat: 'Frutas y vegetales', k: 47,  p: 0.94, g: 0.12, c: 11.8 },
  { id: 'aguacate',         nombre: 'Aguacate',                          cat: 'Frutas y vegetales', k: 160, p: 2.0,  g: 14.7, c: 8.5 },
  { id: 'tomate',           nombre: 'Tomate',                            cat: 'Frutas y vegetales', k: 18,  p: 0.88, g: 0.2,  c: 3.9 },
  { id: 'azucar',           nombre: 'Azúcar blanca',                     cat: 'Grasas, dulces y bebidas', k: 387, p: 0,    g: 0,    c: 100 },

  // ── Añadidos en v106 (cada valor leído en la fuente, con sus 4 cifras; el número FDC es el identificador USDA) ──
  { id: 'pollo_muslo_asado', nombre: 'Muslo de pollo asado (solo carne, sin piel)', cat: 'Proteínas', k: 179, p: 24.8, g: 8.2, c: 0 }, // FDC 172388
  { id: 'pollo_muslo_crudo', nombre: 'Muslo de pollo crudo (solo carne, sin piel)', cat: 'Proteínas', k: 121, p: 19.7, g: 4.1, c: 0 }, // FDC 173627
  { id: 'pollo_ala_cruda', nombre: 'Alitas de pollo crudas (con piel)', cat: 'Proteínas', k: 191, p: 17.5, g: 12.9, c: 0 }, // FDC 172390
  { id: 'huevo_hervido', nombre: 'Huevo entero hervido (duro)', cat: 'Proteínas', k: 155, p: 12.6, g: 10.6, c: 1.1 }, // FDC 173424
  { id: 'huevo_frito', nombre: 'Huevo entero frito', cat: 'Proteínas', k: 196, p: 13.6, g: 14.8, c: 0.83 }, // FDC 173423
  { id: 'yema_cruda', nombre: 'Yema de huevo cruda', cat: 'Proteínas', k: 322, p: 15.9, g: 26.5, c: 3.6 }, // FDC 172184
  { id: 'pavo_pechuga_cruda', nombre: 'Pechuga de pavo cruda (sin piel)', cat: 'Proteínas', k: 114, p: 23.3, g: 2.3, c: 0 }, // FDC 174515
  { id: 'pavo_pechuga_asada', nombre: 'Pechuga de pavo asada (sin piel)', cat: 'Proteínas', k: 136, p: 29.5, g: 2, c: 0 }, // FDC 174516
  { id: 'tocino_crudo', nombre: 'Tocino curado crudo', cat: 'Proteínas', k: 393, p: 13.7, g: 37.1, c: 0 }, // FDC 168277
  { id: 'tocino_frito', nombre: 'Tocino frito en sartén', cat: 'Proteínas', k: 468, p: 33.9, g: 35.1, c: 1.7 }, // FDC 168322
  { id: 'res_molida_80_plancha', nombre: 'Carne molida 80/20 cocida a la plancha (hamburguesa)', cat: 'Proteínas', k: 270, p: 25.8, g: 17.8, c: 0 }, // FDC 171797
  { id: 'res_molida_85_plancha', nombre: 'Carne molida 85/15 cocida a la plancha (hamburguesa)', cat: 'Proteínas', k: 250, p: 25.9, g: 15.4, c: 0 }, // FDC 174032
  { id: 'res_molida_90_plancha', nombre: 'Carne molida 90/10 cocida a la plancha (hamburguesa)', cat: 'Proteínas', k: 217, p: 26.1, g: 11.8, c: 0 }, // FDC 174031
  { id: 'salmon_cocido', nombre: 'Salmón del Atlántico cocido (calor seco)', cat: 'Proteínas', k: 206, p: 22.1, g: 12.4, c: 0 }, // FDC 175168
  { id: 'pargo_cocido', nombre: 'Pargo cocido (calor seco)', cat: 'Proteínas', k: 128, p: 26.3, g: 1.7, c: 0 }, // FDC 173699
  { id: 'mozzarella', nombre: 'Queso mozzarella (leche entera)', cat: 'Lácteos', k: 299, p: 22.2, g: 22.1, c: 2.4 }, // FDC 170845
  { id: 'mantequilla', nombre: 'Mantequilla con sal', cat: 'Lácteos', k: 717, p: 0.9, g: 81.1, c: 0.06 }, // FDC 173410
  { id: 'garbanzo_cocido', nombre: 'Garbanzos cocidos (sin sal)', cat: 'Legumbres', k: 164, p: 8.9, g: 2.6, c: 27.4 }, // FDC 173757
  { id: 'frijol_rojo_cocido', nombre: 'Frijoles colorados (rojos) cocidos (sin sal)', cat: 'Legumbres', k: 127, p: 8.7, g: 0.5, c: 22.8 }, // FDC 175194
  { id: 'chicharo_cocido', nombre: 'Chícharos secos partidos cocidos (sin sal)', cat: 'Legumbres', k: 118, p: 8.3, g: 0.4, c: 21.1 }, // FDC 172429
  { id: 'soya_cocida', nombre: 'Soya (soja) cocida (sin sal)', cat: 'Legumbres', k: 172, p: 18.2, g: 9, c: 8.36 }, // FDC 174271
  { id: 'pasta_cocida', nombre: 'Pasta cocida (sin sal)', cat: 'Cereales y viandas', k: 158, p: 5.8, g: 0.93, c: 30.9 }, // FDC 169737
  { id: 'arroz_integral_cocido', nombre: 'Arroz integral cocido', cat: 'Cereales y viandas', k: 123, p: 2.7, g: 1, c: 25.6 }, // FDC 169704
  { id: 'avena_cruda', nombre: 'Avena en hojuelas (cruda, seca)', cat: 'Cereales y viandas', k: 379, p: 13.2, g: 6.5, c: 67.7 }, // FDC 173904
  { id: 'harina_trigo_integral', nombre: 'Harina de trigo integral', cat: 'Cereales y viandas', k: 340, p: 13.2, g: 2.5, c: 72 }, // FDC 168893
  { id: 'papa_hervida', nombre: 'Papa hervida sin piel (sin sal)', cat: 'Cereales y viandas', k: 86, p: 1.7, g: 0.1, c: 20 }, // FDC 170440
  { id: 'papa_asada', nombre: 'Papa asada con piel (sin sal)', cat: 'Cereales y viandas', k: 93, p: 2.5, g: 0.13, c: 21.2 }, // FDC 170093
  { id: 'platano_maduro_frito', nombre: 'Plátano macho maduro frito', cat: 'Cereales y viandas', k: 236, p: 1.4, g: 7.5, c: 40.8 }, // FDC 168200
  { id: 'malanga_cruda', nombre: 'Malanga (taro) cruda', cat: 'Cereales y viandas', k: 112, p: 1.5, g: 0.2, c: 26.5 }, // FDC 169308
  { id: 'name_crudo', nombre: 'Ñame (yam) crudo', cat: 'Cereales y viandas', k: 118, p: 1.5, g: 0.2, c: 27.9 }, // FDC 170071
  { id: 'papaya', nombre: 'Papaya (fruta bomba) cruda', cat: 'Frutas y vegetales', k: 43, p: 0.5, g: 0.3, c: 10.8 }, // FDC 169926
  { id: 'sandia', nombre: 'Sandía cruda', cat: 'Frutas y vegetales', k: 30, p: 0.6, g: 0.2, c: 7.55 }, // FDC 167765
  { id: 'mandarina', nombre: 'Mandarina cruda', cat: 'Frutas y vegetales', k: 53, p: 0.8, g: 0.3, c: 13.3 }, // FDC 169105
  { id: 'fresa', nombre: 'Fresa cruda', cat: 'Frutas y vegetales', k: 32, p: 0.7, g: 0.3, c: 7.68 }, // FDC 167762
  { id: 'guanabana', nombre: 'Guanábana cruda', cat: 'Frutas y vegetales', k: 66, p: 1, g: 0.3, c: 16.8 }, // FDC 167761
  { id: 'coco_crudo', nombre: 'Coco (pulpa cruda)', cat: 'Frutas y vegetales', k: 354, p: 3.3, g: 33.5, c: 15.2 }, // FDC 170169
  { id: 'jugo_naranja', nombre: 'Jugo de naranja natural', cat: 'Frutas y vegetales', k: 45, p: 0.7, g: 0.2, c: 10.4 }, // FDC 169098
  { id: 'jaca', nombre: 'Jaca (yaca) cruda', cat: 'Frutas y vegetales', k: 95, p: 1.7, g: 0.6, c: 23.3 }, // FDC 174687
  { id: 'guayaba', nombre: 'Guayaba cruda', cat: 'Frutas y vegetales', k: 68, p: 2.6, g: 1, c: 14.3 }, // FDC 173044
  { id: 'zanahoria', nombre: 'Zanahoria cruda', cat: 'Frutas y vegetales', k: 41, p: 0.9, g: 0.2, c: 9.58 }, // FDC 170393
  { id: 'cebolla', nombre: 'Cebolla cruda', cat: 'Frutas y vegetales', k: 40, p: 1.1, g: 0.1, c: 9.34 }, // FDC 170000
  { id: 'col', nombre: 'Col (repollo) cruda', cat: 'Frutas y vegetales', k: 25, p: 1.3, g: 0.1, c: 5.8 }, // FDC 169975
  { id: 'lechuga_romana', nombre: 'Lechuga romana cruda', cat: 'Frutas y vegetales', k: 17, p: 1.2, g: 0.3, c: 3.29 }, // FDC 169247
  { id: 'quimbombo', nombre: 'Quimbombó (okra) crudo', cat: 'Frutas y vegetales', k: 33, p: 1.9, g: 0.2, c: 7.45 }, // FDC 169260
  { id: 'vainitas', nombre: 'Vainitas (habichuelas verdes) crudas', cat: 'Frutas y vegetales', k: 31, p: 1.8, g: 0.2, c: 6.97 }, // FDC 169961
  { id: 'berenjena', nombre: 'Berenjena cruda', cat: 'Frutas y vegetales', k: 25, p: 1, g: 0.2, c: 5.88 }, // FDC 169228
  { id: 'espinaca', nombre: 'Espinaca cruda', cat: 'Frutas y vegetales', k: 23, p: 2.9, g: 0.4, c: 3.63 }, // FDC 168462
  { id: 'remolacha', nombre: 'Remolacha cruda', cat: 'Frutas y vegetales', k: 43, p: 1.6, g: 0.2, c: 9.56 }, // FDC 169145
  { id: 'chayote', nombre: 'Chayote crudo', cat: 'Frutas y vegetales', k: 19, p: 0.8, g: 0.1, c: 4.51 }, // FDC 170402
  { id: 'ajo', nombre: 'Ajo crudo', cat: 'Frutas y vegetales', k: 149, p: 6.4, g: 0.5, c: 33.1 }, // FDC 169230
  { id: 'almendras', nombre: 'Almendras', cat: 'Frutos secos y semillas', k: 579, p: 21.2, g: 49.9, c: 21.6 }, // FDC 170567
  { id: 'miel', nombre: 'Miel de abeja', cat: 'Grasas, dulces y bebidas', k: 304, p: 0.3, g: 0, c: 82.4 }, // FDC 169640
  { id: 'manteca_cerdo', nombre: 'Manteca de cerdo', cat: 'Grasas, dulces y bebidas', k: 902, p: 0, g: 100, c: 0 }, // FDC 171401
  { id: 'pollo_muslo_piel_asado', nombre: 'Muslo de pollo asado (con piel)', cat: 'Proteínas', k: 232, p: 23.3, g: 14.7, c: 0 }, // FDC 173625
  { id: 'pollo_ala_frita', nombre: 'Alitas de pollo fritas (con piel, enharinadas)', cat: 'Proteínas', k: 321, p: 26.1, g: 22.2, c: 2.4 }, // FDC 173629
  { id: 'higado_pollo_crudo', nombre: 'Hígado de pollo crudo', cat: 'Proteínas', k: 119, p: 16.9, g: 4.8, c: 0.73 }, // FDC 171060
  { id: 'huevo_revuelto', nombre: 'Huevo entero revuelto', cat: 'Proteínas', k: 149, p: 10, g: 11, c: 1.6 }, // FDC 172187
  { id: 'jamon_cocido', nombre: 'Jamón cocido en lonchas (≈11 % de grasa)', cat: 'Proteínas', k: 164, p: 16.6, g: 8.8, c: 3.6 }, // FDC 173864
  { id: 'res_molida_90_cruda', nombre: 'Carne molida 90/10 cruda', cat: 'Proteínas', k: 176, p: 20, g: 10, c: 0 }, // FDC 174030
  { id: 'cerdo_lomo_asado_grasa', nombre: 'Lomo de cerdo asado (carne con grasa)', cat: 'Proteínas', k: 248, p: 27.1, g: 14.7, c: 0 }, // FDC 167821
  { id: 'tilapia_cocida', nombre: 'Tilapia cocida (calor seco)', cat: 'Proteínas', k: 128, p: 26.2, g: 2.7, c: 0 }, // FDC 175177
  { id: 'salmon_crudo', nombre: 'Salmón del Atlántico crudo', cat: 'Proteínas', k: 208, p: 20.4, g: 13.4, c: 0 }, // FDC 175167
  { id: 'salmon_lata', nombre: 'Salmón rosado enlatado (escurrido)', cat: 'Proteínas', k: 138, p: 23.1, g: 5, c: 0 }, // FDC 175175
  { id: 'sardina_lata_aceite', nombre: 'Sardinas enlatadas en aceite (con espinas, escurridas)', cat: 'Proteínas', k: 208, p: 24.6, g: 11.5, c: 0 }, // FDC 175139
  { id: 'camaron_crudo', nombre: 'Camarón crudo', cat: 'Proteínas', k: 85, p: 20.1, g: 0.51, c: 0 }, // FDC 175179
  { id: 'camaron_cocido', nombre: 'Camarón cocido', cat: 'Proteínas', k: 99, p: 24, g: 0.28, c: 0.2 }, // FDC 175180
  { id: 'pargo_crudo', nombre: 'Pargo crudo', cat: 'Proteínas', k: 100, p: 20.5, g: 1.3, c: 0 }, // FDC 173698
  { id: 'bacalao_cocido', nombre: 'Bacalao del Atlántico cocido (calor seco)', cat: 'Proteínas', k: 105, p: 22.8, g: 0.86, c: 0 }, // FDC 171956
  { id: 'leche_1pc', nombre: 'Leche 1 % de grasa', cat: 'Lácteos', k: 42, p: 3.4, g: 0.97, c: 5 }, // FDC 173441
  { id: 'mozzarella_semi', nombre: 'Queso mozzarella (semidescremado)', cat: 'Lácteos', k: 254, p: 24.3, g: 15.9, c: 2.8 }, // FDC 170847
  { id: 'queso_fresco', nombre: 'Queso fresco (tipo queso blanco)', cat: 'Lácteos', k: 299, p: 18.1, g: 23.8, c: 3 }, // FDC 172223
  { id: 'arroz_crudo', nombre: 'Arroz blanco crudo', cat: 'Cereales y viandas', k: 365, p: 7.1, g: 0.66, c: 80 }, // FDC 168877
  { id: 'boniato_asado', nombre: 'Boniato asado con piel (sin sal)', cat: 'Cereales y viandas', k: 90, p: 2, g: 0.15, c: 20.7 }, // FDC 168483
  { id: 'pina', nombre: 'Piña cruda', cat: 'Frutas y vegetales', k: 50, p: 0.54, g: 0.12, c: 13.1 }, // FDC 169124
  { id: 'calabaza_cocida', nombre: 'Calabaza hervida (escurrida)', cat: 'Frutas y vegetales', k: 20, p: 0.72, g: 0.07, c: 4.9 }, // FDC 168449
  { id: 'zanahoria_cocida', nombre: 'Zanahoria hervida (escurrida)', cat: 'Frutas y vegetales', k: 35, p: 0.76, g: 0.18, c: 8.2 }, // FDC 170394
  { id: 'vainitas_cocidas', nombre: 'Vainitas hervidas (escurridas)', cat: 'Frutas y vegetales', k: 35, p: 1.9, g: 0.28, c: 7.9 }, // FDC 169141
  { id: 'quimbombo_cocido', nombre: 'Quimbombó hervido (escurrido)', cat: 'Frutas y vegetales', k: 22, p: 1.9, g: 0.21, c: 4.5 }, // FDC 169261
  { id: 'brocoli_cocido', nombre: 'Brócoli hervido (escurrido)', cat: 'Frutas y vegetales', k: 35, p: 2.4, g: 0.41, c: 7.2 }, // FDC 169967
  { id: 'remolacha_cocida', nombre: 'Remolacha hervida (escurrida)', cat: 'Frutas y vegetales', k: 44, p: 1.7, g: 0.18, c: 10 }, // FDC 169146
  { id: 'cebolla_cocida', nombre: 'Cebolla hervida (escurrida)', cat: 'Frutas y vegetales', k: 44, p: 1.4, g: 0.19, c: 10.2 }, // FDC 170001
  { id: 'berenjena_cocida', nombre: 'Berenjena hervida (escurrida)', cat: 'Frutas y vegetales', k: 35, p: 0.83, g: 0.23, c: 8.7 }, // FDC 169229
  { id: 'mani_crudo', nombre: 'Maní (cacahuate) crudo', cat: 'Frutos secos y semillas', k: 567, p: 25.8, g: 49.2, c: 16.1 }, // FDC 172430
  { id: 'mantequilla_mani', nombre: 'Mantequilla de maní con trozos (con sal)', cat: 'Frutos secos y semillas', k: 589, p: 24.1, g: 49.9, c: 21.6 }, // FDC 174265
  { id: 'atun_blanco_agua', nombre: 'Atún blanco enlatado en agua (escurrido)', cat: 'Proteínas', k: 128, p: 23.6, g: 2.97, c: 0 }, // FDC 175158
  { id: 'atun_claro_aceite', nombre: 'Atún claro enlatado en aceite (escurrido)', cat: 'Proteínas', k: 198, p: 29.1, g: 8.21, c: 0 }, // FDC 173708
  { id: 'atun_fresco_crudo', nombre: 'Atún fresco (aleta amarilla) crudo', cat: 'Proteínas', k: 109, p: 24.4, g: 0.49, c: 0 }, // FDC 175159
  { id: 'tilapia_cruda', nombre: 'Tilapia cruda', cat: 'Proteínas', k: 96, p: 20.1, g: 1.7, c: 0 }, // FDC 175176
  { id: 'bacalao_crudo', nombre: 'Bacalao del Atlántico crudo', cat: 'Proteínas', k: 82, p: 17.8, g: 0.67, c: 0 }, // FDC 171955
  { id: 'bacalao_seco', nombre: 'Bacalao seco y salado', cat: 'Proteínas', k: 290, p: 62.8, g: 2.37, c: 0 }, // FDC 174190
  { id: 'cerdo_solomillo_crudo', nombre: 'Solomillo de cerdo crudo (solo magro)', cat: 'Proteínas', k: 109, p: 20.9, g: 2.17, c: 0 }, // FDC 168249
  { id: 'alitas_asadas', nombre: 'Alitas de pollo asadas (con piel)', cat: 'Proteínas', k: 254, p: 23.8, g: 16.9, c: 0 }, // FDC 173630
  { id: 'higado_pollo_cocido', nombre: 'Hígado de pollo hervido', cat: 'Proteínas', k: 167, p: 24.5, g: 6.51, c: 0.87 }, // FDC 171061
  { id: 'sardinas_tomate', nombre: 'Sardinas enlatadas en tomate (con espinas, escurridas)', cat: 'Proteínas', k: 185, p: 20.9, g: 10.4, c: 0.54 }, // FDC 175140
  { id: 'tofu_firme', nombre: 'Tofu firme (con sulfato de calcio)', cat: 'Proteínas', k: 144, p: 17.3, g: 8.72, c: 2.78 }, // FDC 172475
  { id: 'boniato_hervido', nombre: 'Boniato hervido sin piel', cat: 'Cereales y viandas', k: 76, p: 1.37, g: 0.14, c: 17.7 }, // FDC 168484
  { id: 'name_cocido', nombre: 'Ñame (yam) cocido (hervido o asado, sin sal)', cat: 'Cereales y viandas', k: 116, p: 1.49, g: 0.14, c: 27.5 }, // FDC 170072
  { id: 'malanga_cocida', nombre: 'Malanga (taro) cocida (sin sal)', cat: 'Cereales y viandas', k: 142, p: 0.52, g: 0.11, c: 34.6 }, // FDC 168486
  { id: 'pasta_seca', nombre: 'Pasta seca (cruda)', cat: 'Cereales y viandas', k: 371, p: 13, g: 1.51, c: 74.7 }, // FDC 169736
  { id: 'lenteja_cocida', nombre: 'Lentejas cocidas (sin sal)', cat: 'Legumbres', k: 116, p: 9.02, g: 0.38, c: 20.1 }, // FDC 172421
  { id: 'frijol_pinto_cocido', nombre: 'Frijoles pintos cocidos (sin sal)', cat: 'Legumbres', k: 143, p: 9.01, g: 0.65, c: 26.2 }, // FDC 175200
  { id: 'frijol_negro_crudo', nombre: 'Frijoles negros crudos (secos)', cat: 'Legumbres', k: 341, p: 21.6, g: 1.42, c: 62.4 }, // FDC 173734
  { id: 'garbanzo_crudo', nombre: 'Garbanzos crudos (secos)', cat: 'Legumbres', k: 378, p: 20.5, g: 6.04, c: 63 }, // FDC 173756
  { id: 'leche_descremada', nombre: 'Leche descremada (con calcio)', cat: 'Lácteos', k: 35, p: 3.4, g: 0.18, c: 4.85 }, // FDC 169868
  { id: 'yogur_natural', nombre: 'Yogur natural de leche entera', cat: 'Lácteos', k: 61, p: 3.47, g: 3.25, c: 4.66 }, // FDC 171284
  { id: 'requeson_cremoso', nombre: 'Requesón (cottage) cremoso', cat: 'Lácteos', k: 98, p: 11.1, g: 4.3, c: 3.38 }, // FDC 172179
  { id: 'requeson_2pc', nombre: 'Requesón (cottage) bajo en grasa 2 %', cat: 'Lácteos', k: 81, p: 10.4, g: 2.27, c: 4.76 }, // FDC 172182
  { id: 'toronja', nombre: 'Toronja rosada cruda', cat: 'Frutas y vegetales', k: 42, p: 0.77, g: 0.14, c: 10.7 }, // FDC 174673
  { id: 'limon', nombre: 'Limón sin cáscara crudo', cat: 'Frutas y vegetales', k: 29, p: 1.1, g: 0.3, c: 9.32 }, // FDC 167746
  { id: 'melon_cantalupo', nombre: 'Melón cantalupo crudo', cat: 'Frutas y vegetales', k: 34, p: 0.84, g: 0.19, c: 8.16 }, // FDC 169092
  { id: 'melon_verde', nombre: 'Melón verde (honeydew) crudo', cat: 'Frutas y vegetales', k: 36, p: 0.54, g: 0.14, c: 9.09 }, // FDC 169911
  { id: 'pepino', nombre: 'Pepino con cáscara crudo', cat: 'Frutas y vegetales', k: 15, p: 0.65, g: 0.11, c: 3.63 }, // FDC 168409
  { id: 'chayote_cocido', nombre: 'Chayote hervido (escurrido)', cat: 'Frutas y vegetales', k: 24, p: 0.62, g: 0.48, c: 5.09 }, // FDC 170403
  { id: 'col_cocida', nombre: 'Col (repollo) hervida (escurrida)', cat: 'Frutas y vegetales', k: 23, p: 1.27, g: 0.06, c: 5.51 }, // FDC 169976
  { id: 'espinaca_cocida', nombre: 'Espinaca hervida (escurrida)', cat: 'Frutas y vegetales', k: 23, p: 2.97, g: 0.26, c: 3.75 }, // FDC 168463
  { id: 'nueces', nombre: 'Nueces (inglesas)', cat: 'Frutos secos y semillas', k: 654, p: 15.2, g: 65.2, c: 13.7 }, // FDC 170187
  { id: 'aceite_oliva', nombre: 'Aceite de oliva', cat: 'Grasas, dulces y bebidas', k: 884, p: 0, g: 100, c: 0 }, // FDC 171413
  { id: 'aceite_soya', nombre: 'Aceite de soya', cat: 'Grasas, dulces y bebidas', k: 884, p: 0, g: 100, c: 0 }, // FDC 171411
  { id: 'mayonesa', nombre: 'Mayonesa regular', cat: 'Grasas, dulces y bebidas', k: 680, p: 0.96, g: 74.8, c: 0.57 }, // FDC 171009
  { id: 'cafe_negro', nombre: 'Café negro preparado (sin azúcar)', cat: 'Grasas, dulces y bebidas', k: 1, p: 0.12, g: 0.02, c: 0 }, // FDC 171890
  { id: 'cerveza', nombre: 'Cerveza regular', cat: 'Grasas, dulces y bebidas', k: 43, p: 0.46, g: 0, c: 3.55 }, // FDC 168746

  // ── Añadidos en v108 (misma fuente; verificados con sus 4 cifras en getfoodfacts.com) ──
  { id: 'platano_verde_crudo', nombre: 'Plátano verde crudo', cat: 'Cereales y viandas', k: 152, p: 1.25, g: 0.07, c: 36.7 }, // FDC 168215
  { id: 'platano_verde_hervido', nombre: 'Plátano verde hervido', cat: 'Cereales y viandas', k: 121, p: 1.09, g: 0.08, c: 29.1 }, // FDC 168216
  { id: 'platano_verde_frito', nombre: 'Plátano verde frito (tostones)', cat: 'Cereales y viandas', k: 309, p: 1.5, g: 11.8, c: 49.2 }, // FDC 168199
  { id: 'pan_cubano', nombre: 'Pan cubano (referencia FNDDS)', cat: 'Cereales y viandas', k: 272, p: 10.8, g: 2.42, c: 51.9 }, // FDC 2707604 (FNDDS)
  { id: 'frijol_blanco_cocido', nombre: 'Frijoles blancos cocidos (sin sal)', cat: 'Legumbres', k: 139, p: 9.73, g: 0.35, c: 25.1 }, // FDC 175203
  { id: 'cerdo_chuleta_plancha', nombre: 'Chuleta de cerdo (centro del lomo) asada a la parrilla, magro y grasa, sin hueso', cat: 'Proteínas', k: 209, p: 25.6, g: 11.1, c: 0 }, // FDC 167827
  { id: 'cerdo_chuleta_frita', nombre: 'Chuleta de cerdo (centro del lomo) frita en sartén, magro y grasa, sin hueso', cat: 'Proteínas', k: 238, p: 27.6, g: 13.3, c: 0 }, // FDC 168292
  { id: 'res_bistec_solomillo', nombre: 'Bistec de res (lomo alto / sirloin) a la plancha, magro y grasa', cat: 'Proteínas', k: 212, p: 29.3, g: 9.67, c: 0 }, // FDC 169457
  { id: 'aceite_girasol', nombre: 'Aceite de girasol', cat: 'Grasas, dulces y bebidas', k: 884, p: 0, g: 100, c: 0 }, // FDC 171017
  { id: 'refresco_cola', nombre: 'Refresco de cola regular', cat: 'Grasas, dulces y bebidas', k: 42, p: 0, g: 0.25, c: 10.4 }, // FDC 174852
  { id: 'refresco_limon', nombre: 'Refresco de limón-lima (sin cafeína)', cat: 'Grasas, dulces y bebidas', k: 41, p: 0.09, g: 0, c: 10.4 }, // FDC 173205
  { id: 'ron_80', nombre: 'Ron (80 proof, 40 % alcohol)', cat: 'Grasas, dulces y bebidas', k: 231, p: 0, g: 0, c: 0 }, // FDC 174817
];

export const FUENTE_ALIMENTOS = 'USDA FoodData Central (SR Legacy), por 100 g';
// gt-build:v108

// alimentos.js — Base de alimentos (valores por 100 g)
//
// Fuente de TODOS los valores de esta lista: USDA FoodData Central, versión "SR Legacy", consultada a través de
// tools.myfooddata.com (página con los datos del USDA). Se descartaron valores de páginas que mezclaban otras bases.
// k = kcal · p = proteína (g) · g = grasa total (g) · c = carbohidratos (g)
//
// IMPORTANTE: los valores dependen del estado del alimento (crudo / cocido) y varían con la variedad y la forma
// de cocinar. Los alimentos "crudos" se pesan crudos. Esta es una base de PARTIDA: puedes añadir tus propios
// alimentos (o corregir uno copiándolo como propio) en la pantalla de Nutrición.
//
// Alimentos cubanos habituales que todavía NO están (no se pudo verificar su valor): aceite, pasta, malanga, frijoles
// colorados, garbanzos, chícharos, papaya, guayaba, piña y platos compuestos (congrí, moros, picadillo…). Se añaden
// como "alimentos propios" o en una próxima versión.

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
  { id: 'azucar',           nombre: 'Azúcar blanca',                     cat: 'Otros',              k: 387, p: 0,    g: 0,    c: 100 }
];

export const FUENTE_ALIMENTOS = 'USDA FoodData Central (SR Legacy), por 100 g';

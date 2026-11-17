// plantillas.js — Rutinas de partida para quien no quiere empezar de cero.
//
// Son estructuras habituales y genéricas (no una prescripción personalizada).
// Todos los pesos empiezan en 0: se ponen en la pantalla del día al hacer la primera sesión.
// Las series/repeticiones son un punto de partida razonable; ajústalas a tu nivel.

const e = (nombre, series, repsMin, repsMax, musculo, descanso) => ({
  nombre, peso: 0, series, repsMin, repsMax, descanso, tempo: '', notas: '', alFallo: false, musculo
});
const dia = (nombre, ejercicios) => ({ nombre, tieneTimer: true, tieneCronometro: false, ejercicios });

// Ejercicio completo (tempo, método de progresión, incremento y notas de técnica)
const x = (nombre, series, repsMin, repsMax, musculo, descanso, tempo, metodo, notas = '', extra = {}) => ({
  nombre, peso: 0, series, repsMin, repsMax, descanso, tempo, notas, alFallo: false, musculo,
  ...(metodo ? { metodoProg: { id: metodo } } : {}), ...extra
});
const CAL_UPPER = 'Calentamiento Upper: rotaciones de hombro 2×15 · press banca con barra vacía 2×15 · remo con peso muy ligero 2×15';
const CAL_LOWER = 'Calentamiento Lower: sentadilla corporal profunda 2×15 · peso muerto con barra vacía 2×10 · rotación de cadera en el suelo 10 por pierna';
const NORDIC = 'FASES (las cambias tú): 1 (sem 1-4) 3×5, baja 4-5 s · 2 (sem 4-8) 3×6, baja 6-8 s · 3 (sem 8-12) 3×6-8, casi al suelo controlado · 4 (sem 12+) 3×6-10, baja 4 s y sube sin manos. Pies bien sujetos; no saltes de fase.';
const SIN_CLASIFICAR = 'Añadido a la rutina: sin clasificar como ancla/secundario/accesorio. Usa doble progresión estándar.';

export const PLANTILLAS = {
  fullbody3: {
    titulo: 'Cuerpo completo · 3 días/semana',
    descripcion: 'Tres sesiones que trabajan todo el cuerpo. Buena opción para empezar o con poco tiempo.',
    rutina: {
      nombre: 'Cuerpo completo 3 días',
      dias: [
        dia('Día A – Cuerpo completo', [
          e('Sentadilla', 3, 6, 8, 'cuadricep', 150),
          e('Press banca', 3, 6, 8, 'pectoral', 150),
          e('Remo con barra', 3, 8, 10, 'espalda', 120),
          e('Press militar con mancuernas', 2, 8, 12, 'hombro', 90),
          e('Abdominales en polea', 3, 12, 15, 'core', 60)
        ]),
        dia('Día B – Cuerpo completo', [
          e('Peso muerto rumano', 3, 8, 10, 'isquio', 120),
          e('Press inclinado con mancuernas', 3, 8, 10, 'pectoral', 120),
          e('Jalón al pecho', 3, 8, 10, 'espalda', 120),
          e('Zancadas', 2, 10, 12, 'cuadricep', 90),
          e('Curl de bíceps', 2, 10, 12, 'bicep', 60),
          e('Elevación de gemelos', 3, 12, 15, 'gemelo', 60)
        ]),
        dia('Día C – Cuerpo completo', [
          e('Prensa de piernas', 3, 8, 12, 'cuadricep', 120),
          e('Press de hombro en máquina', 3, 8, 10, 'hombro', 90),
          e('Remo en polea baja', 3, 8, 12, 'espalda', 90),
          e('Fondos en paralelas asistidos', 2, 8, 12, 'tricep', 90),
          e('Curl femoral', 3, 10, 12, 'isquio', 60)
        ])
      ]
    }
  },

  torsopierna4: {
    titulo: 'Torso / Pierna · 4 días/semana',
    descripcion: 'Dos días de torso y dos de pierna, alternando. Más volumen por grupo muscular.',
    rutina: {
      nombre: 'Torso / Pierna 4 días',
      dias: [
        dia('Día 1 – Torso A', [
          e('Press banca', 4, 5, 8, 'pectoral', 150),
          e('Remo con barra', 4, 6, 8, 'espalda', 150),
          e('Press militar', 3, 6, 10, 'hombro', 120),
          e('Jalón al pecho', 3, 8, 12, 'espalda', 90),
          e('Curl de bíceps', 2, 10, 12, 'bicep', 60),
          e('Extensión de tríceps en polea', 2, 10, 12, 'tricep', 60)
        ]),
        dia('Día 2 – Pierna A', [
          e('Sentadilla', 4, 5, 8, 'cuadricep', 180),
          e('Peso muerto rumano', 3, 8, 10, 'isquio', 150),
          e('Prensa de piernas', 3, 10, 12, 'cuadricep', 120),
          e('Curl femoral', 3, 10, 12, 'isquio', 60),
          e('Elevación de gemelos', 4, 10, 15, 'gemelo', 60)
        ]),
        dia('Día 3 – Torso B', [
          e('Press inclinado con mancuernas', 4, 8, 10, 'pectoral', 120),
          e('Remo en polea baja', 4, 8, 10, 'espalda', 120),
          e('Elevaciones laterales', 3, 12, 15, 'hombro', 60),
          e('Dominadas o jalón agarre neutro', 3, 6, 10, 'espalda', 120),
          e('Curl martillo', 2, 10, 12, 'bicep', 60),
          e('Press francés', 2, 10, 12, 'tricep', 60)
        ]),
        dia('Día 4 – Pierna B', [
          e('Peso muerto', 3, 4, 6, 'isquio', 180),
          e('Sentadilla búlgara', 3, 8, 10, 'cuadricep', 120),
          e('Extensión de cuádriceps', 3, 12, 15, 'cuadricep', 60),
          e('Empuje de cadera (hip thrust)', 3, 8, 12, 'gluteo', 90),
          e('Elevación de gemelos sentado', 4, 12, 15, 'gemelo', 60)
        ])
      ]
    }
  },

  ppl3: {
    titulo: 'Empuje / Tirón / Pierna · 3 días',
    descripcion: 'Clásico push-pull-legs en una sola vuelta por semana. Fácil de seguir y de ampliar a 6 días.',
    rutina: {
      nombre: 'Empuje / Tirón / Pierna',
      dias: [
        dia('Día 1 – Empuje', [
          e('Press banca', 4, 6, 8, 'pectoral', 150),
          e('Press militar con mancuernas', 3, 8, 10, 'hombro', 120),
          e('Press inclinado con mancuernas', 3, 8, 12, 'pectoral', 90),
          e('Elevaciones laterales', 3, 12, 15, 'hombro', 60),
          e('Extensión de tríceps en polea', 3, 10, 12, 'tricep', 60)
        ]),
        dia('Día 2 – Tirón', [
          e('Dominadas o jalón al pecho', 4, 6, 10, 'espalda', 120),
          e('Remo con barra', 3, 6, 8, 'espalda', 150),
          e('Remo en polea baja', 3, 10, 12, 'espalda', 90),
          e('Face pull', 3, 12, 15, 'hombro', 60),
          e('Curl de bíceps', 3, 10, 12, 'bicep', 60)
        ]),
        dia('Día 3 – Pierna', [
          e('Sentadilla', 4, 5, 8, 'cuadricep', 180),
          e('Peso muerto rumano', 3, 8, 10, 'isquio', 150),
          e('Prensa de piernas', 3, 10, 12, 'cuadricep', 120),
          e('Curl femoral', 3, 10, 12, 'isquio', 60),
          e('Elevación de gemelos', 4, 10, 15, 'gemelo', 60),
          e('Abdominales en polea', 3, 12, 15, 'core', 60)
        ])
      ]
    }
  },

  hipertrofia4: {
    titulo: 'Hipertrofia Upper/Lower · 4 días (ejercicios libres)',
    descripcion: 'Lunes/Martes/Jueves/Viernes con barras, mancuernas y poleas. Anclas con ciclo ondulante de 4 semanas (la semana 4 es el Deload); compuestos secundarios y accesorios con doble progresión y último set al fallo técnico. Deload activado.',
    rutina: {
      nombre: 'Hipertrofia Upper/Lower 4 días',
      tieneDeload: true,
      metodoProg: 'doblefallo',
      dias: [
        dia('Lunes – Upper A', [
          x('Press banca con barra', 4, 6, 8, 'pectoral', 180, '2-1-1', 'ondulante', 'ANCLA. Escápulas retraídas y deprimidas, glúteos en el banco. Baja en 2 s, toca el pecho bajo y pausa 1 s sin rebotar. Codos a 45-75° del torso.', { incremento: 2.5, notasEj: CAL_UPPER }),
          x('Dominadas pronadas con lastre', 4, 6, 8, 'espalda', 180, '2-0-1', 'ondulante', 'ANCLA. Agarre prono algo más ancho que el hombro, brazos extendidos abajo. Deprime las escápulas, codos hacia los bolsillos, mentón sobre la barra, baja en 2 s sin balanceo.', { incremento: 2.5 }),
          x('Press inclinado con mancuernas', 3, 10, 12, 'pectoral', 90, '2-1-1', 'doblefallo', 'Banco a 30° (no más de 45°). Escápulas retraídas. Baja en 2 s con pausa de 1 s abajo; las mancuernas no chocan arriba.'),
          x('Remo en polea baja', 3, 12, 15, 'espalda', 90, '2-0-2', 'doblefallo', 'Torso a 80-90° y espalda neutra fija. Tira hacia el abdomen bajo y aprieta las escápulas 2 s; extiende los brazos del todo al volver.'),
          x('Elevaciones laterales', 3, 12, 15, 'hombro', 60, '2-0-1', 'doblefallo', 'Codo ligeramente flexionado, torso estático, hasta la altura del hombro. Baja en 2 s. Último set al fallo técnico: cuando los trapecios suben, terminó.'),
          x('Face pulls en polea', 3, 15, 20, 'hombro', 60, '2-0-2', 'doblefallo', 'Cuerda alta. Tira hacia la cara separando las manos (rotación externa) con los codos a la altura de los hombros o más. Pausa 2 s.'),
          x('Curl de bíceps con barra', 3, 10, 12, 'bicep', 60, '2-0-1', 'doblefallo', 'Codos fijos a los costados, torso estático. Sube pasando ligeramente la vertical y baja en 2 s hasta extensión completa.'),
          x('Tríceps francés con mancuernas', 3, 12, 15, 'tricep', 60, '2-0-1', 'doblefallo', 'Codos fijos apuntando al techo. Fallo técnico: cuando los codos se abren o los hombros ayudan.'),
          x('Curl de bíceps con mancuerna atrás', 3, 10, 12, 'bicep', 0, '', 'doble', SIN_CLASIFICAR)
        ]),
        dia('Martes – Lower A', [
          x('Sentadilla con barra', 4, 8, 10, 'cuadricep', 180, '2-0-1', 'ondulante', 'ANCLA. Rodillas hacia afuera, torso erecto. Baja en 2 s hasta muslos paralelos o más sin que la espalda baja redondee; talones en el suelo.', { incremento: 5, notasEj: CAL_LOWER }),
          x('Sentadilla búlgara con mancuernas', 3, 10, 12, 'cuadricep', 120, '2-0-1', 'doblefallo', 'Pie trasero en el banco y pie delantero lo bastante lejos para que la rodilla no pase la punta. Baja en 2 s y empuja con el talón. Todas las series de una pierna antes de cambiar (60 s entre piernas).'),
          x('Peso muerto rumano con barra', 3, 10, 12, 'isquio', 120, '2-0-1', 'doblefallo', 'Rodillas ligeramente flexionadas, caderas hacia atrás, barra pegada al cuerpo. Baja en 2 s hasta el máximo estiramiento sin redondear la espalda.'),
          x('Nordic curl por fases', 3, 5, 10, 'isquio', 120, '4-0-1', 'ninguna', NORDIC),
          x('Zancadas caminando con mancuernas', 3, 12, 12, 'cuadricep', 90, '2-0-1', 'doblefallo', 'Reps por pierna. Paso largo, baja en 2 s hasta casi tocar el suelo con la rodilla trasera, torso vertical; alterna las piernas en cada paso.'),
          x('Elevación de talones de pie', 4, 15, 20, 'gemelo', 60, '2-2-1', 'doblefallo', 'Pausa de 2 s arriba (rango completo).'),
          x('Ab wheel rollout de rodillas', 3, 10, 12, 'core', 60, '2-0-2', 'doblefallo', 'Rueda en 2 s con los brazos extendidos sin que la cadera caiga; vuelve en 2 s con el core. Último set al fallo técnico: cuando la cadera cae.'),
          x('Jalón abdominal en polea', 3, 15, 20, 'core', 60, '2-0-1', 'doblefallo', 'Flexiona la columna (pecho hacia las rodillas), no solo la cadera. Baja en 2 s.')
        ]),
        dia('Jueves – Upper B', [
          x('Remo con barra inclinado', 4, 8, 10, 'espalda', 180, '2-0-1', 'ondulante', 'ANCLA, PRIMER ejercicio. Torso a unos 45° fijo y espalda neutra. Tira al ombligo, aprieta las escápulas 1 s y baja en 2 s hasta extensión completa.', { incremento: 2.5, notasEj: CAL_UPPER }),
          x('Dominadas supinas con lastre', 3, 8, 10, 'espalda', 120, '2-0-1', 'doblefallo', 'Agarre supino al ancho de hombros. Deprime las escápulas primero, codos pegados al cuerpo, pecho hacia la barra; baja en 2 s.'),
          x('Meadows row', 3, 10, 12, 'espalda', 90, '2-0-1', 'doblefallo', 'Barra en una esquina (landmine). Jala hacia la cadera con el codo alto y aprieta 1 s; baja en 2 s. Todas las series de un lado antes de cambiar.'),
          x('Press militar con barra', 4, 8, 10, 'hombro', 180, '2-0-1', 'ondulante', 'ANCLA. Barra en las clavículas, sube en línea vertical y extiende los codos arriba; baja en 2 s. Core activo, sin arquear la espalda baja.', { incremento: 2.5 }),
          x('Press inclinado con barra', 3, 10, 12, 'pectoral', 90, '2-1-1', 'doblefallo', 'Banco a 30°. La barra baja en 2 s hasta el pecho superior / clavículas, pausa 1 s; codos a 45-75°.'),
          x('Elevaciones laterales', 3, 15, 20, 'hombro', 60, '2-0-1', 'doblefallo', 'Codo ligeramente flexionado, torso estático, hasta la altura del hombro. Baja en 2 s. Último set al fallo técnico.'),
          x('Face pulls en polea', 3, 15, 20, 'hombro', 60, '2-0-2', 'doblefallo', 'Cuerda alta. Tira hacia la cara separando las manos (rotación externa) con los codos a la altura de los hombros o más. Pausa 2 s.'),
          x('Curl martillo con mancuernas', 3, 12, 15, 'bicep', 60, '2-0-1', 'doblefallo', 'Agarre neutro sin girar la muñeca, codos fijos. Baja en 2 s hasta extensión completa.'),
          x('Extensión de tríceps en polea con cuerda', 3, 12, 15, 'tricep', 60, '2-0-1', 'doblefallo'),
          x('Dips con peso', 4, 8, 10, 'tricep', 0, '', 'doble', SIN_CLASIFICAR),
          x('Extensión de tríceps sobre la cabeza en banco unilateral con mancuernas', 3, 10, 12, 'tricep', 0, '', 'doble', SIN_CLASIFICAR)
        ]),
        dia('Viernes – Lower B', [
          x('Sentadilla frontal con barra', 3, 6, 8, 'cuadricep', 180, '2-0-1', 'ondulante', 'ANCLA, PRIMERO (erector fresco). Barra en las clavículas, codos altos, torso vertical. Rodillas hacia afuera y adelante; baja hasta paralelo o más.', { incremento: 2.5, notasEj: CAL_LOWER }),
          x('Peso muerto convencional', 4, 5, 6, 'isquio', 210, '2-0-1', 'ondulante', 'ANCLA, rango de fuerza. Barra sobre el mediopié, espalda neutra y pecho arriba. Empuja el suelo con la barra pegada a las piernas; caderas y hombros suben a la vez. Baja en 2 s.', { incremento: 5 }),
          x('Nordic curl por fases', 3, 5, 10, 'isquio', 120, '4-0-1', 'ninguna', NORDIC),
          x('Zancadas inversas con mancuernas', 3, 12, 12, 'gluteo', 90, '2-0-1', 'doblefallo', 'Reps por pierna. Paso largo hacia ATRÁS, torso vertical, empuja con el talón de la pierna delantera. Alterna las piernas en cada repetición.'),
          x('Elevación de talones sentado', 3, 15, 20, 'gemelo', 60, '2-2-1', 'doblefallo', 'Pausa de 2 s arriba (rango completo).'),
          x('Ab wheel rollout de pie', 3, 6, 8, 'core', 60, '2-0-2', 'doblefallo', 'Solo cuando hagas 3×10 de rodillas con técnica perfecta. Si la cadera cae, reduce el rango. Último set al fallo técnico.'),
          x('Elevación de piernas en barra', 3, 12, 15, 'core', 60, '2-0-1', 'doblefallo', 'Retroversión pélvica activa antes de subir. Sube en 2 s, baja en 2 s sin balanceo.')
        ])
      ]
    }
  }
};
// gt-build:v108

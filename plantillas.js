// plantillas.js — Rutinas de partida para quien no quiere empezar de cero.
//
// Son estructuras habituales y genéricas (no una prescripción personalizada).
// Todos los pesos empiezan en 0: se ponen en la pantalla del día al hacer la primera sesión.
// Las series/repeticiones son un punto de partida razonable; ajústalas a tu nivel.

const e = (nombre, series, repsMin, repsMax, musculo, descanso) => ({
  nombre, peso: 0, series, repsMin, repsMax, descanso, tempo: '', notas: '', alFallo: false, musculo
});
const dia = (nombre, ejercicios) => ({ nombre, tieneTimer: true, tieneCronometro: false, ejercicios });

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
  }
};

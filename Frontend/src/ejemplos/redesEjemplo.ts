
import type { NodoBayes, RedBayes } from '../tipos/red';

// Fila de una tabla CPT
type FilaEjemplo = {
    condiciones: Record<string, string>;
    valores: number[];
};

// Informacion de cada ejemplo
export type EjemploRed = {
    id: string;
    titulo: string;
    descripcion: string;
    consulta: string;
    evidencias: Record<string, string>;
    red: RedBayes;
};

// Crear nodos y tablas CPT
function crearNodo(
    id: string,
    nombre: string,
    estados: string[],
    padres: string[],
    x: number,
    y: number,
    filas: FilaEjemplo[]
): NodoBayes {

    return {
        id,
        nombre,
        estados,
        padres,
        posicion: { x, y },

        tabla: filas.map(fila => ({
            condiciones: fila.condiciones,
            probabilidades: Object.fromEntries(
                estados.map((estado, indice) => [
                    estado,
                    fila.valores[indice]
                ])
            )
        }))
    };
}

// Catalogo de ejemplos adicionales
export const redesEjemplo: EjemploRed[] = [

    // EJEMPLO 1: LLUVIA Y ASPERSOR
    {
        id: 'lluvia',
        titulo: 'Lluvia y aspersor',
        descripcion:
            'Determina si llovio a partir de ' +
            'la observacion del cesped mojado.',

        consulta: 'A',
        evidencias: { C: 'Si' },

        red: {
            nombre: 'Lluvia, aspersor y cesped mojado',
            formato: 1,

            nodos: [
                crearNodo(
                    'A', 'Lluvia',
                    ['Si', 'No'], [],
                    100, 100,
                    [
                        {
                            condiciones: {},
                            valores: [0.30, 0.70]
                        }
                    ]
                ),

                crearNodo(
                    'B', 'Aspersor',
                    ['Si', 'No'], [],
                    100, 320,
                    [
                        {
                            condiciones: {},
                            valores: [0.40, 0.60]
                        }
                    ]
                ),

                crearNodo(
                    'C', 'Cesped mojado',
                    ['Si', 'No'], ['A', 'B'],
                    470, 210,
                    [
                        {
                            condiciones: { A: 'Si', B: 'Si' },
                            valores: [0.99, 0.01]
                        },
                        {
                            condiciones: { A: 'Si', B: 'No' },
                            valores: [0.90, 0.10]
                        },
                        {
                            condiciones: { A: 'No', B: 'Si' },
                            valores: [0.80, 0.20]
                        },
                        {
                            condiciones: { A: 'No', B: 'No' },
                            valores: [0.01, 0.99]
                        }
                    ]
                )
            ]
        }
    },

    // EJEMPLO 2: DIAGNOSTICO DE GRIPE
    {
        id: 'gripe',
        titulo: 'Diagnostico de gripe',
        descripcion:
            'Estima la probabilidad de gripe ' +
            'al observar fiebre y tos.',

        consulta: 'G',
        evidencias: { F: 'Si', T: 'Si' },

        red: {
            nombre: 'Gripe, fiebre y tos',
            formato: 1,

            nodos: [
                crearNodo(
                    'G', 'Gripe',
                    ['Si', 'No'], [],
                    100, 200,
                    [
                        {
                            condiciones: {},
                            valores: [0.15, 0.85]
                        }
                    ]
                ),

                crearNodo(
                    'F', 'Fiebre',
                    ['Si', 'No'], ['G'],
                    450, 90,
                    [
                        {
                            condiciones: { G: 'Si' },
                            valores: [0.85, 0.15]
                        },
                        {
                            condiciones: { G: 'No' },
                            valores: [0.10, 0.90]
                        }
                    ]
                ),

                crearNodo(
                    'T', 'Tos',
                    ['Si', 'No'], ['G'],
                    450, 310,
                    [
                        {
                            condiciones: { G: 'Si' },
                            valores: [0.75, 0.25]
                        },
                        {
                            condiciones: { G: 'No' },
                            valores: [0.20, 0.80]
                        }
                    ]
                )
            ]
        }
    },

    // EJEMPLO 3: FALLAS DE SERVIDOR
    {
        id: 'servidor',
        titulo: 'Fallas de un servidor',
        descripcion:
            'Analiza una caida del servicio ' +
            'a partir de una alerta del sistema.',

        consulta: 'C',
        evidencias: { A: 'Si' },

        red: {
            nombre: 'Diagnostico de fallas del servidor',
            formato: 1,

            nodos: [
                crearNodo(
                    'S', 'Sobrecarga',
                    ['Si', 'No'], [],
                    80, 80,
                    [
                        {
                            condiciones: {},
                            valores: [0.12, 0.88]
                        }
                    ]
                ),

                crearNodo(
                    'R', 'Falla de red',
                    ['Si', 'No'], [],
                    80, 320,
                    [
                        {
                            condiciones: {},
                            valores: [0.08, 0.92]
                        }
                    ]
                ),

                crearNodo(
                    'C', 'Servicio caido',
                    ['Si', 'No'], ['S', 'R'],
                    390, 190,
                    [
                        {
                            condiciones: { S: 'Si', R: 'Si' },
                            valores: [0.99, 0.01]
                        },
                        {
                            condiciones: { S: 'Si', R: 'No' },
                            valores: [0.85, 0.15]
                        },
                        {
                            condiciones: { S: 'No', R: 'Si' },
                            valores: [0.90, 0.10]
                        },
                        {
                            condiciones: { S: 'No', R: 'No' },
                            valores: [0.02, 0.98]
                        }
                    ]
                ),

                crearNodo(
                    'A', 'Alerta',
                    ['Si', 'No'], ['C'],
                    700, 190,
                    [
                        {
                            condiciones: { C: 'Si' },
                            valores: [0.95, 0.05]
                        },
                        {
                            condiciones: { C: 'No' },
                            valores: [0.05, 0.95]
                        }
                    ]
                )
            ]
        }
    },

    // EJEMPLO 4: RENDIMIENTO ACADEMICO
    {
        id: 'academico',
        titulo: 'Rendimiento academico',
        descripcion:
            'Relaciona el nivel de estudio y ' +
            'el descanso con aprobar y obtener beca.',

        consulta: 'A',
        evidencias: { E: 'Alto', D: 'Si' },

        red: {
            nombre: 'Rendimiento academico y becas',
            formato: 1,

            nodos: [
                crearNodo(
                    'E', 'Estudio',
                    ['Bajo', 'Medio', 'Alto'], [],
                    80, 80,
                    [
                        {
                            condiciones: {},
                            valores: [0.20, 0.50, 0.30]
                        }
                    ]
                ),

                crearNodo(
                    'D', 'Descanso adecuado',
                    ['Si', 'No'], [],
                    80, 320,
                    [
                        {
                            condiciones: {},
                            valores: [0.70, 0.30]
                        }
                    ]
                ),

                crearNodo(
                    'A', 'Aprueba',
                    ['Si', 'No'], ['E', 'D'],
                    390, 190,
                    [
                        {
                            condiciones: { E: 'Bajo', D: 'Si' },
                            valores: [0.30, 0.70]
                        },
                        {
                            condiciones: { E: 'Bajo', D: 'No' },
                            valores: [0.10, 0.90]
                        },
                        {
                            condiciones: { E: 'Medio', D: 'Si' },
                            valores: [0.70, 0.30]
                        },
                        {
                            condiciones: { E: 'Medio', D: 'No' },
                            valores: [0.45, 0.55]
                        },
                        {
                            condiciones: { E: 'Alto', D: 'Si' },
                            valores: [0.95, 0.05]
                        },
                        {
                            condiciones: { E: 'Alto', D: 'No' },
                            valores: [0.80, 0.20]
                        }
                    ]
                ),

                crearNodo(
                    'B', 'Beca',
                    ['Si', 'No'], ['A'],
                    700, 190,
                    [
                        {
                            condiciones: { A: 'Si' },
                            valores: [0.60, 0.40]
                        },
                        {
                            condiciones: { A: 'No' },
                            valores: [0.05, 0.95]
                        }
                    ]
                )
            ]
        }
    },

    // EJEMPLO 5: CLASIFICACION DE SPAM
    {
        id: 'spam',
        titulo: 'Clasificacion de correo spam',
        descripcion:
            'Estima si un correo es spam segun ' +
            'el remitente y la presencia de enlaces.',

        consulta: 'S',
        evidencias: {
            R: 'Sospechoso',
            E: 'Si'
        },

        red: {
            nombre: 'Clasificacion de correo spam',
            formato: 1,

            nodos: [
                crearNodo(
                    'R', 'Remitente',
                    ['Sospechoso', 'Confiable'], [],
                    60, 190,
                    [
                        {
                            condiciones: {},
                            valores: [0.30, 0.70]
                        }
                    ]
                ),

                crearNodo(
                    'E', 'Contiene enlace',
                    ['Si', 'No'], ['R'],
                    340, 70,
                    [
                        {
                            condiciones: { R: 'Sospechoso' },
                            valores: [0.80, 0.20]
                        },
                        {
                            condiciones: { R: 'Confiable' },
                            valores: [0.10, 0.90]
                        }
                    ]
                ),

                crearNodo(
                    'S', 'Spam',
                    ['Si', 'No'], ['R', 'E'],
                    610, 190,
                    [
                        {
                            condiciones: {
                                R: 'Sospechoso',
                                E: 'Si'
                            },
                            valores: [0.98, 0.02]
                        },
                        {
                            condiciones: {
                                R: 'Sospechoso',
                                E: 'No'
                            },
                            valores: [0.70, 0.30]
                        },
                        {
                            condiciones: {
                                R: 'Confiable',
                                E: 'Si'
                            },
                            valores: [0.60, 0.40]
                        },
                        {
                            condiciones: {
                                R: 'Confiable',
                                E: 'No'
                            },
                            valores: [0.02, 0.98]
                        }
                    ]
                ),

                crearNodo(
                    'B', 'Bloqueado',
                    ['Si', 'No'], ['S'],
                    880, 190,
                    [
                        {
                            condiciones: { S: 'Si' },
                            valores: [0.95, 0.05]
                        },
                        {
                            condiciones: { S: 'No' },
                            valores: [0.05, 0.95]
                        }
                    ]
                )
            ]
        }
    }
];

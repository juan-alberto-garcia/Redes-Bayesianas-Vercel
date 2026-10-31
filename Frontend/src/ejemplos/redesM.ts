
import type { NodoBayes } from '../tipos/red';
import type { EjemploRed } from './redesEjemplo';


// Ejemplo oficial con resultado de referencia
export type EjemploMaestro = EjemploRed & {
    ejercicio: number;
    pagina: number;
    estadoConsulta: string;
    resultadoEsperado: number;
};


// Crear nodo binario con estados 1 y 0
function crearNodo(
    id: string,
    nombre: string,
    padres: string[],
    x: number,
    y: number,
    probabilidadesUno: number[]
): NodoBayes {

    // Crear todas las combinaciones de padres
    // Ejemplo con dos padres: 11, 10, 01, 00
    const combinaciones = padres.reduce<
        Record<string, string>[]
    >(
        (anteriores, idPadre) =>
            anteriores.flatMap(condiciones =>
                ['1', '0'].map(estado => ({
                    ...condiciones,
                    [idPadre]: estado
                }))
            ),
        [{}]
    );

    if (
        combinaciones.length !==
        probabilidadesUno.length
    ) {
        throw new Error(
            `La CPT del nodo ${id} esta incompleta.`
        );
    }

    const tabla = combinaciones.map(
        (condiciones, indice) => {

            const probabilidad =
                probabilidadesUno[indice];

            if (
                !Number.isFinite(probabilidad) ||
                probabilidad < 0 ||
                probabilidad > 1
            ) {
                throw new Error(
                    `Probabilidad invalida en ${id}.`
                );
            }

            return {
                condiciones,

                probabilidades: {
                    '1': probabilidad,
                    '0': 1 - probabilidad
                }
            };
        }
    );

    return {
        id,
        nombre,
        estados: ['1', '0'],
        padres,
        posicion: { x, y },
        tabla
    };
}


// Catalogo oficial del maestro
export const redesMaestro: EjemploMaestro[] = [

    // ==========================================
    // EJERCICIO 1: PHISHING
    // 3 NODOS
    // ==========================================
    {
        id: 'maestro-ejercicio-1',
        titulo: 'Ejercicio 1 - Ciberseguridad',

        descripcion:
            'Un correo de phishing permite robar ' +
            'credenciales y provocar un acceso ' +
            'no autorizado al sistema.',

        ejercicio: 1,
        pagina: 4,

        consulta: 'P',
        evidencias: { A: '1' },

        estadoConsulta: '1',
        resultadoEsperado: 0.8374,

        red: {
            nombre: 'Ejercicio 1 - Phishing y acceso',
            formato: 1,

            nodos: [
                crearNodo(
                    'P', 'Phishing',
                    [], 60, 170,
                    [0.30]
                ),

                crearNodo(
                    'C', 'Credenciales robadas',
                    ['P'], 360, 170,
                    [0.40, 0.02]
                ),

                crearNodo(
                    'A', 'Acceso no autorizado',
                    ['C'], 690, 170,
                    [0.70, 0.01]
                )
            ]
        }
    },

    // ==========================================
    // EJERCICIO 2: MUNDIAL DE FUTBOL
    // 4 NODOS
    // ==========================================
    {
        id: 'maestro-ejercicio-2',
        titulo: 'Ejercicio 2 - Mundial de Futbol',

        descripcion:
            'La lesion de un jugador estrella ' +
            'afecta la forma del equipo. Ganar ' +
            'depende de la forma y del rival.',

        ejercicio: 2,
        pagina: 8,

        consulta: 'G',
        evidencias: { R: '1' },

        estadoConsulta: '1',
        resultadoEsperado: 0.4380,

        red: {
            nombre: 'Ejercicio 2 - Mundial de Futbol',
            formato: 1,

            nodos: [
                crearNodo(
                    'L', 'Lesion estrella',
                    [], 70, 90,
                    [0.20]
                ),

                crearNodo(
                    'R', 'Rival fuerte',
                    [], 370, 90,
                    [0.50]
                ),

                crearNodo(
                    'F', 'Buena forma',
                    ['L'], 70, 310,
                    [0.40, 0.75]
                ),

                // Orden de padres: F, R
                crearNodo(
                    'G', 'Gana partido',
                    ['F', 'R'], 420, 310,
                    [0.55, 0.85, 0.20, 0.50]
                )
            ]
        }
    },

    // ==========================================
    // EJERCICIO 3: VENTA DE VIDEOJUEGOS
    // 5 NODOS
    // ==========================================
    {
        id: 'maestro-ejercicio-3',
        titulo: 'Ejercicio 3 - Videojuegos',

        descripcion:
            'Las ventas de videojuegos dependen ' +
            'del descuento, las resenas y un trailer ' +
            'viral. Las ventas influyen en el Top 10.',

        ejercicio: 3,
        pagina: 14,

        consulta: 'R',
        evidencias: { K: '1' },

        estadoConsulta: '1',
        resultadoEsperado: 0.5616,

        red: {
            nombre: 'Ejercicio 3 - Venta de videojuegos',
            formato: 1,

            nodos: [
                crearNodo(
                    'D', 'Descuento',
                    [], 40, 60,
                    [0.30]
                ),

                crearNodo(
                    'R', 'Resenas buenas',
                    [], 340, 60,
                    [0.40]
                ),

                crearNodo(
                    'T', 'Trailer viral',
                    [], 640, 60,
                    [0.25]
                ),

                // Orden: D,R,T
                // Combinaciones: 111,110,101,100,011,010,001,000
                crearNodo(
                    'V', 'Ventas altas',
                    ['D', 'R', 'T'],
                    350, 260,
                    [
                        0.95,
                        0.80,
                        0.70,
                        0.35,
                        0.85,
                        0.55,
                        0.45,
                        0.10
                    ]
                ),

                crearNodo(
                    'K', 'Top 10',
                    ['V'], 350, 460,
                    [0.90, 0.15]
                )
            ]
        }
    },

    // ==========================================
    // EJERCICIO 5: RANSOMWARE
    // 6 NODOS
    // ==========================================
    {
        id: 'maestro-ejercicio-5',
        titulo: 'Ejercicio 5 - Ransomware',

        descripcion:
            'La infeccion por ransomware depende ' +
            'de phishing y parches atrasados. ' +
            'Se observan cifrado, trafico C2 ' +
            'y perdida de datos.',

        ejercicio: 5,
        pagina: 28,

        consulta: 'I',

        evidencias: {
            T: '1',
            L: '1'
        },

        estadoConsulta: '1',
        resultadoEsperado: 0.9898,

        red: {
            nombre: 'Ejercicio 5 - Ransomware',
            formato: 1,

            nodos: [
                crearNodo(
                    'P', 'Abre phishing',
                    [], 70, 60,
                    [0.30]
                ),

                crearNodo(
                    'V', 'Parches atrasados',
                    [], 410, 60,
                    [0.40]
                ),

                // Orden: P,V
                crearNodo(
                    'I', 'Infeccion ransomware',
                    ['P', 'V'], 250, 220,
                    [0.85, 0.50, 0.30, 0.02]
                ),

                crearNodo(
                    'C', 'Archivos cifrados',
                    ['I'], 60, 390,
                    [0.80, 0.03]
                ),

                crearNodo(
                    'T', 'Trafico C2',
                    ['I'], 470, 390,
                    [0.70, 0.05]
                ),

                crearNodo(
                    'L', 'Perdida de datos',
                    ['C'], 60, 560,
                    [0.60, 0.01]
                )
            ]
        }
    },

    // ==========================================
    // EJERCICIO 10: OCTAVOS DEL MUNDIAL
    // 10 NODOS
    // ==========================================
    {
        id: 'maestro-ejercicio-10',
        titulo: 'Ejercicio 10 - Octavos de final',

        descripcion:
            'Red de diez variables que relaciona ' +
            'lesiones, ranking, preparacion fisica, ' +
            'clima, ataque, defensa, goles, ' +
            'tarjetas y venta de camisetas.',

        ejercicio: 10,
        pagina: 69,

        consulta: 'G',

        evidencias: {
            Le: '1',
            Cl: '1'
        },

        estadoConsulta: '1',
        resultadoEsperado: 0.3870,

        red: {
            nombre: 'Ejercicio 10 - Octavos del Mundial',
            formato: 1,

            nodos: [

                // Variables independientes
                crearNodo(
                    'Le', 'Lesion delantero',
                    [], 30, 50,
                    [0.20]
                ),

                crearNodo(
                    'Rk', 'Ranking FIFA top 10',
                    [], 310, 50,
                    [0.40]
                ),

                crearNodo(
                    'Pf', 'Preparacion fisica',
                    [], 590, 50,
                    [0.65]
                ),

                crearNodo(
                    'Cl', 'Clima adverso',
                    [], 870, 50,
                    [0.30]
                ),

                // Ataque depende de ranking y lesion
                crearNodo(
                    'Of', 'Ataque efectivo',
                    ['Rk', 'Le'],
                    170, 230,
                    [0.60, 0.85, 0.25, 0.50]
                ),

                // Defensa depende de ranking y preparacion
                crearNodo(
                    'Df', 'Defensa solida',
                    ['Rk', 'Pf'],
                    580, 230,
                    [0.85, 0.60, 0.60, 0.30]
                ),

                // Gana depende de ataque, defensa y clima
                // 111,110,101,100,011,010,001,000
                crearNodo(
                    'G', 'Gana octavos',
                    ['Of', 'Df', 'Cl'],
                    390, 420,
                    [
                        0.70,
                        0.85,
                        0.45,
                        0.60,
                        0.35,
                        0.50,
                        0.10,
                        0.20
                    ]
                ),

                // Dos o mas goles
                crearNodo(
                    'Go', 'Dos o mas goles',
                    ['Of'], 40, 420,
                    [0.65, 0.15]
                ),

                // Tarjeta roja depende de defensa y clima
                crearNodo(
                    'Ta', 'Tarjeta roja',
                    ['Df', 'Cl'],
                    760, 420,
                    [0.10, 0.05, 0.30, 0.20]
                ),

                // Ventas de camisetas
                crearNodo(
                    'Cm', 'Ventas de camisetas',
                    ['G', 'Go'],
                    370, 610,
                    [0.90, 0.70, 0.35, 0.10]
                )
            ]
        }
    }
];

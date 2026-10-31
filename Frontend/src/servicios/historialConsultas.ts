
import type {
    RedBayes,
    RespuestaInferencia
} from '../tipos/red';

export type RegistroConsulta = {
    id: string;
    fecha: string;
    red: RedBayes;
    firmaRed: string;

    // Compatibilidad con el modulo 16
    consulta: string;
    consultaNombre: string;

    // Una o varias variables consultadas
    consultas: string[];

    evidencias: Record<string, string>;
    resultado: RespuestaInferencia;
};

export const LIMITE_HISTORIAL = 30;

const CLAVE_HISTORIAL =
    'redes-bayesianas-idk-historial-v1';


// Identificar red mediante nodos, relaciones y CPT
export function crearFirmaRed(red: RedBayes): string {
    return JSON.stringify(
        red.nodos.map(nodo => ({
            id: nodo.id,
            estados: nodo.estados,
            padres: nodo.padres,
            tabla: nodo.tabla
        }))
    );
}


// Leer consultas nuevas y antiguas
export function leerHistorial(): RegistroConsulta[] {

    try {
        const guardado = localStorage.getItem(
            CLAVE_HISTORIAL
        );

        if (!guardado) {
            return [];
        }

        const datos: unknown = JSON.parse(guardado);

        if (!Array.isArray(datos)) {
            return [];
        }

        const registros: RegistroConsulta[] = [];

        for (const valor of datos) {

            if (!valor || typeof valor !== 'object') {
                continue;
            }

            const registro =
                valor as Partial<RegistroConsulta>;

            // Comprobar datos necesarios
            if (
                typeof registro.id !== 'string' ||
                typeof registro.fecha !== 'string' ||
                typeof registro.firmaRed !== 'string' ||
                typeof registro.consulta !== 'string' ||
                !Array.isArray(registro.red?.nodos) ||
                !Array.isArray(
                    registro.resultado?.distribucion
                ) ||
                typeof registro.resultado
                    ?.probabilidad_evidencia !== 'number' ||
                !registro.evidencias ||
                typeof registro.evidencias !== 'object'
            ) {
                continue;
            }

            // Los registros del modulo 16 guardaban
            // una sola variable en registro.consulta
            const consultas =
                Array.isArray(registro.consultas) &&
                registro.consultas.length > 0
                    ? registro.consultas
                    : [registro.consulta];

            // Comprobar variables existentes
            const validas = [
                ...new Set(consultas)
            ].filter(id =>
                typeof id === 'string' &&
                registro.red!.nodos.some(
                    nodo => nodo.id === id
                )
            );

            if (validas.length === 0) {
                continue;
            }

            // Convertir al formato nuevo
            registros.push({
                ...(registro as RegistroConsulta),

                consultas: validas,
                consulta: validas[0],

                consultaNombre: validas.map(id =>
                    registro.red!.nodos.find(
                        nodo => nodo.id === id
                    )?.nombre || id
                ).join(', ')
            });

            if (
                registros.length ===
                LIMITE_HISTORIAL
            ) {
                break;
            }
        }

        return registros;

    } catch {
        return [];
    }
}


// Guardar las consultas en el navegador
export function guardarHistorial(
    registros: RegistroConsulta[]
): boolean {

    try {
        localStorage.setItem(
            CLAVE_HISTORIAL,

            JSON.stringify(
                registros.slice(0, LIMITE_HISTORIAL)
            )
        );

        return true;

    } catch {
        // Los registros permanecen en memoria
        return false;
    }
}

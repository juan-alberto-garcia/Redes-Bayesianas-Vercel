
import type {
    RedBayes,
    RespuestaInferencia
} from '../tipos/red';

// Datos que guardamos por cada calculo
export type RegistroConsulta = {
    id: string;
    fecha: string;
    red: RedBayes;
    firmaRed: string;
    consulta: string;
    consultaNombre: string;
    evidencias: Record<string, string>;
    resultado: RespuestaInferencia;
};

// Configuracion del historial
export const LIMITE_HISTORIAL = 30;

const CLAVE_HISTORIAL =
    'redes-bayesianas-idk-historial-v1';

// Identificar una red por su estructura y probabilidades
// Las posiciones de React Flow no afectan la firma
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

// Recuperar historial guardado en el navegador
export function leerHistorial(): RegistroConsulta[] {
    try {
        const contenido = localStorage.getItem(
            CLAVE_HISTORIAL
        );

        if (!contenido) {
            return [];
        }

        const registros: unknown = JSON.parse(contenido);

        if (!Array.isArray(registros)) {
            return [];
        }

        // Ignorar registros incompletos o dañados
        return registros.filter(
            (registro): registro is RegistroConsulta => {

                if (!registro || typeof registro !== 'object') {
                    return false;
                }

                const dato = registro as Partial<RegistroConsulta>;

                return (
                    typeof dato.id === 'string' &&
                    typeof dato.fecha === 'string' &&
                    typeof dato.firmaRed === 'string' &&
                    typeof dato.consulta === 'string' &&
                    typeof dato.consultaNombre === 'string' &&
                    dato.evidencias !== null &&
                    typeof dato.evidencias === 'object' &&
                    Array.isArray(dato.red?.nodos) &&
                    Array.isArray(dato.resultado?.distribucion) &&
                    typeof dato.resultado?.probabilidad_evidencia ===
                        'number'
                );
            }
        ).slice(0, LIMITE_HISTORIAL);

    } catch {
        return [];
    }
}

// Guardar historial completo
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
        // Si el navegador bloquea el almacenamiento,
        // los registros siguen disponibles en memoria.
        return false;
    }
}

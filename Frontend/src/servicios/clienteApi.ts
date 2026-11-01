
import type {
    RedBayes,
    RespuestaInferencia
} from '../tipos/red';


// Direccion del servidor
const baseApi = import.meta.env.DEV
  ? 'http://localhost:8000'
  : '';


// Realizar solicitudes HTTP
async function solicitar<T>(
    ruta: string,
    opciones?: RequestInit
): Promise<T> {

    let respuesta: Response;

    try {
        respuesta = await fetch(
            `${baseApi}${ruta}`,
            {
                ...opciones,
                headers: {
                    'Content-Type': 'application/json',
                    ...opciones?.headers
                }
            }
        );
    } catch {
        throw new Error(
            'No se pudo conectar con FastAPI'
        );
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
        const detalle = datos.detail ?? 'Error del servidor';

        throw new Error(
            typeof detalle === 'string'
                ? detalle
                : JSON.stringify(detalle)
        );
    }

    return datos as T;
}


// Funciones disponibles para React
export const clienteApi = {

    // Comprobar el estado del servidor
    estado: () =>
        solicitar<{
            estado: string;
            aplicacion: string;
        }>('/estado'),

    // Validar una red bayesiana
    validar: (red: RedBayes) =>
        solicitar<{
            valida: boolean;
            mensaje: string;
        }>('/api/validar', {
            method: 'POST',
            body: JSON.stringify(red)
        }),

    // Ejecutar eliminacion de variables
    inferir: (
        red: RedBayes,
        variablesConsulta: string[],
        evidencia: Record<string, string>,
        mostrarPasos: boolean
    ) =>
        solicitar<RespuestaInferencia>(
            '/api/inferir',
            {
                method: 'POST',
                body: JSON.stringify({
                    red,
                    variables_consulta: variablesConsulta,
                    evidencia,
                    mostrar_pasos: mostrarPasos
                })
            }
        )
};

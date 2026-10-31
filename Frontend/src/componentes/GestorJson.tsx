
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad
} from '../tipos/red';


// Datos recibidos desde App
type Propiedades = {
    red: RedBayes;
    onImportar: (nuevaRed: RedBayes) => void;
};


// Comprobar si un valor es un objeto
function esObjeto(
    valor: unknown
): valor is Record<string, unknown> {

    return (
        typeof valor === 'object' &&
        valor !== null &&
        !Array.isArray(valor)
    );
}


// Comprobar el contenido de un archivo JSON
function validarRedJson(datos: unknown): RedBayes {

    if (!esObjeto(datos)) {
        throw new Error('El archivo debe contener una red.');
    }

    // Comprobar formato
    if (datos.formato !== 1) {
        throw new Error('Formato JSON no compatible.');
    }

    // Comprobar nombre
    if (
        typeof datos.nombre !== 'string' ||
        !datos.nombre.trim()
    ) {
        throw new Error('La red no tiene un nombre valido.');
    }

    // Comprobar cantidad de nodos
    if (
        !Array.isArray(datos.nodos) ||
        datos.nodos.length < 3 ||
        datos.nodos.length > 10
    ) {
        throw new Error(
            'La red debe contener entre 3 y 10 nodos.'
        );
    }

    // Revisar cada nodo
    const nodos: NodoBayes[] = datos.nodos.map(
        (dato: unknown, indice: number) => {

            if (!esObjeto(dato)) {
                throw new Error(
                    `El nodo ${indice + 1} no es valido.`
                );
            }

            // Identificador y nombre
            if (
                typeof dato.id !== 'string' ||
                !dato.id.trim() ||
                typeof dato.nombre !== 'string' ||
                !dato.nombre.trim()
            ) {
                throw new Error(
                    `El nodo ${indice + 1} tiene nombre o ID invalido.`
                );
            }

            // Estados
            if (
                !Array.isArray(dato.estados) ||
                dato.estados.length < 2 ||
                !dato.estados.every(
                    (estado: unknown) =>
                        typeof estado === 'string' &&
                        estado.trim().length > 0
                )
            ) {
                throw new Error(
                    `Los estados del nodo ${dato.id} no son validos.`
                );
            }

            const estados: string[] = [...dato.estados];

            if (new Set(estados).size !== estados.length) {
                throw new Error(
                    `El nodo ${dato.id} tiene estados repetidos.`
                );
            }

            // Padres
            if (
                !Array.isArray(dato.padres) ||
                !dato.padres.every(
                    (padre: unknown) =>
                        typeof padre === 'string'
                )
            ) {
                throw new Error(
                    `Los padres del nodo ${dato.id} no son validos.`
                );
            }

            const padres: string[] = [...dato.padres];

            if (new Set(padres).size !== padres.length) {
                throw new Error(
                    `El nodo ${dato.id} tiene padres repetidos.`
                );
            }

            // Posicion en React Flow
            if (
                !esObjeto(dato.posicion) ||
                typeof dato.posicion.x !== 'number' ||
                typeof dato.posicion.y !== 'number' ||
                !Number.isFinite(dato.posicion.x) ||
                !Number.isFinite(dato.posicion.y)
            ) {
                throw new Error(
                    `La posicion del nodo ${dato.id} no es valida.`
                );
            }

            // Tabla CPT
            if (!Array.isArray(dato.tabla)) {
                throw new Error(
                    `El nodo ${dato.id} no tiene una CPT valida.`
                );
            }

            const tabla: FilaProbabilidad[] = dato.tabla.map(
                (fila: unknown, numeroFila: number) => {

                    if (
                        !esObjeto(fila) ||
                        !esObjeto(fila.condiciones) ||
                        !esObjeto(fila.probabilidades)
                    ) {
                        throw new Error(
                            `CPT invalida en ${dato.id}, fila ${numeroFila + 1}.`
                        );
                    }

                    // Leer las condiciones
                    const condiciones: Record<string, string> =
                        Object.create(null);

                    for (
                        const [padre, estado]
                        of Object.entries(fila.condiciones)
                    ) {
                        if (typeof estado !== 'string') {
                            throw new Error(
                                `Condicion invalida en ${dato.id}.`
                            );
                        }

                        condiciones[padre] = estado;
                    }

                    // Leer las probabilidades
                    const probabilidades: Record<string, number> =
                        Object.create(null);

                    for (
                        const [estado, valor]
                        of Object.entries(fila.probabilidades)
                    ) {
                        if (
                            typeof valor !== 'number' ||
                            !Number.isFinite(valor) ||
                            valor < 0 ||
                            valor > 1
                        ) {
                            throw new Error(
                                `Probabilidad invalida en ${dato.id}.`
                            );
                        }

                        probabilidades[estado] = valor;
                    }

                    // Comprobar todos los estados
                    if (
                        Object.keys(probabilidades).length !==
                        estados.length
                    ) {
                        throw new Error(
                            `La CPT de ${dato.id} tiene estados incorrectos.`
                        );
                    }

                    let suma = 0;

                    for (const estado of estados) {

                        if (
                            !Object.prototype.hasOwnProperty.call(
                                probabilidades,
                                estado
                            )
                        ) {
                            throw new Error(
                                `Falta el estado ${estado} en ${dato.id}.`
                            );
                        }

                        suma += probabilidades[estado];
                    }

                    if (Math.abs(suma - 1) > 0.000001) {
                        throw new Error(
                            `Las probabilidades de ${dato.id} no suman 1.`
                        );
                    }

                    return {
                        condiciones,
                        probabilidades
                    };
                }
            );

            return {
                id: dato.id,
                nombre: dato.nombre,
                estados,
                padres,
                tabla,
                posicion: {
                    x: dato.posicion.x,
                    y: dato.posicion.y
                }
            };
        }
    );

    // Comprobar identificadores duplicados
    const mapa = new Map(
        nodos.map(nodo => [nodo.id, nodo])
    );

    if (mapa.size !== nodos.length) {
        throw new Error('Existen identificadores duplicados.');
    }

    // Validar relaciones y CPT completas
    for (const nodo of nodos) {

        for (const idPadre of nodo.padres) {

            if (!mapa.has(idPadre)) {
                throw new Error(
                    `El padre ${idPadre} no existe.`
                );
            }

            if (idPadre === nodo.id) {
                throw new Error(
                    `El nodo ${nodo.id} no puede ser su propio padre.`
                );
            }
        }

        // Cantidad esperada de filas CPT
        let filasEsperadas = 1;

        for (const idPadre of nodo.padres) {
            filasEsperadas *= mapa.get(idPadre)!.estados.length;
        }

        if (
            filasEsperadas > 50000 ||
            nodo.tabla.length !== filasEsperadas
        ) {
            throw new Error(
                `La CPT del nodo ${nodo.id} esta incompleta o es demasiado grande.`
            );
        }

        const combinacionesVistas = new Set<string>();

        for (const fila of nodo.tabla) {

            const nombresCondiciones =
                Object.keys(fila.condiciones);

            if (
                nombresCondiciones.length !== nodo.padres.length ||
                nombresCondiciones.some(
                    id => !nodo.padres.includes(id)
                )
            ) {
                throw new Error(
                    `La CPT del nodo ${nodo.id} tiene condiciones incorrectas.`
                );
            }

            // Comprobar estados de cada padre
            for (const idPadre of nodo.padres) {

                const padre = mapa.get(idPadre)!;
                const estado = fila.condiciones[idPadre];

                if (!padre.estados.includes(estado)) {
                    throw new Error(
                        `Estado invalido del padre ${idPadre} en ${nodo.id}.`
                    );
                }
            }

            // Identificar una combinacion de padres
            const clave = JSON.stringify(
                nodo.padres.map(
                    idPadre => fila.condiciones[idPadre]
                )
            );

            if (combinacionesVistas.has(clave)) {
                throw new Error(
                    `La CPT del nodo ${nodo.id} tiene filas repetidas.`
                );
            }

            combinacionesVistas.add(clave);
        }
    }

    // Detectar ciclos dirigidos
    const visitando = new Set<string>();
    const visitados = new Set<string>();

    function visitar(id: string) {

        if (visitando.has(id)) {
            throw new Error(
                'La red contiene un ciclo dirigido.'
            );
        }

        if (visitados.has(id)) {
            return;
        }

        visitando.add(id);

        const nodo = mapa.get(id)!;

        for (const idPadre of nodo.padres) {
            visitar(idPadre);
        }

        visitando.delete(id);
        visitados.add(id);
    }

    for (const nodo of nodos) {
        visitar(nodo.id);
    }

    // Red validada
    return {
        nombre: datos.nombre,
        formato: 1,
        nodos
    };
}


// Componente para guardar y cargar archivos
export default function GestorJson({
    red,
    onImportar
}: Propiedades) {

    const archivoRef = useRef<HTMLInputElement>(null);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');


    // Exportar la red completa
    function exportarJson() {

        setMensaje('');
        setError('');

        try {

            const contenido = JSON.stringify(
                red,
                null,
                2
            );

            const archivo = new Blob(
                [contenido],
                {
                    type: 'application/json;charset=utf-8'
                }
            );

            const url = URL.createObjectURL(archivo);

            // Preparar nombre del archivo
            const nombreArchivo = red.nombre
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(0, 60) || 'red_bayesiana';

            const enlace = document.createElement('a');

            enlace.href = url;
            enlace.download = `${nombreArchivo}.json`;

            // Descargar el JSON
            enlace.click();

            // Liberar la URL temporal
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);

            setMensaje('Archivo JSON generado correctamente.');

        } catch {

            setError('No se pudo exportar la red.');
        }
    }


    // Importar una red desde el equipo
    async function importarJson(
        evento: ChangeEvent<HTMLInputElement>
    ) {

        const archivo = evento.target.files?.[0];

        // Permitir seleccionar el mismo archivo nuevamente
        evento.target.value = '';

        if (!archivo) {
            return;
        }

        setMensaje('');
        setError('');

        // Evitar archivos excesivamente grandes
        if (archivo.size > 2 * 1024 * 1024) {

            setError(
                'El archivo JSON supera el limite de 2 MB.'
            );

            return;
        }

        try {

            const texto = await archivo.text();

            // Eliminar BOM, si existe
            const contenido = texto.replace(/^\uFEFF/, '');

            const datos: unknown = JSON.parse(contenido);

            // Comprobar la red antes de modificar App
            const redImportada = validarRedJson(datos);

            const confirmar = window.confirm(
                'Se reemplazara la red actual por "' +
                redImportada.nombre +
                '". ¿Continuar?'
            );

            if (!confirmar) {
                return;
            }

            onImportar(redImportada);

            setMensaje(
                'Red importada correctamente: ' +
                redImportada.nombre
            );

        } catch (problema) {

            setError(
                problema instanceof Error
                    ? problema.message
                    : 'No se pudo leer el archivo JSON.'
            );
        }
    }


    return (

        <section className="panel">

            <h2>Guardar y cargar red</h2>

            <p>
                Exporta tu red bayesiana a JSON o carga
                una red guardada anteriormente.
                Se conservaran los nodos, relaciones,
                posiciones y tablas CPT.
            </p>

            <div className="accionesRed">

                <button
                    type="button"
                    onClick={exportarJson}
                >
                    Exportar JSON
                </button>

                <button
                    type="button"
                    className="botonSecundario"
                    onClick={() => {
                        archivoRef.current?.click();
                    }}
                >
                    Importar JSON
                </button>

                <input
                    ref={archivoRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={importarJson}
                    style={{ display: 'none' }}
                />

            </div>

            {mensaje && (
                <p className="exito">
                    {mensaje}
                </p>
            )}

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

        </section>
    );
}

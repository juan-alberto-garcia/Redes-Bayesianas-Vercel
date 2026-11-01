
import { useEffect, useRef, useState } from 'react';

import { clienteApi } from './servicios/clienteApi';

import EditorCpt from './componentes/EditorCpt';
import GrafoBayesiano from './componentes/GrafoBayesiano';
import GestorJson from './componentes/GestorJson';
import EditorConsultaConjunta from './componentes/EditorConsultaConjunta';
import EditorEstados from './componentes/EditorEstados';
import SelectorEjemplos from './componentes/SelectorEjemplos';
import HistorialConsultas from './componentes/HistorialConsultas';
import ReporteImpresion from './componentes/ReporteImpresion';

import { redesEjemplo } from './ejemplos/redesEjemplo';
import type { EjemploRed } from './ejemplos/redesEjemplo';

import {
    crearFirmaRed,
    leerHistorial,
    guardarHistorial,
    LIMITE_HISTORIAL
} from './servicios/historialConsultas';

import type {
    RegistroConsulta
} from './servicios/historialConsultas';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Limite de filas en las tablas CPT
const LIMITE_FILAS_CPT = 512;


// Comprobar si existe un camino dirigido
function existeCamino(
    origen: string,
    destino: string,
    nodos: NodoBayes[]
): boolean {

    const pendientes = [origen];
    const visitados = new Set<string>();

    while (pendientes.length > 0) {

        const actual = pendientes.pop();

        if (!actual) {
            continue;
        }

        if (actual === destino) {
            return true;
        }

        if (visitados.has(actual)) {
            continue;
        }

        visitados.add(actual);

        // Buscar los hijos del nodo
        for (const nodo of nodos) {

            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Contar filas de una CPT
function contarFilasCpt(
    padres: string[],
    nodos: NodoBayes[]
): number {

    let cantidad = 1;

    for (const idPadre of padres) {

        const padre = nodos.find(
            nodo => nodo.id === idPadre
        );

        if (!padre) {
            throw new Error(
                `No existe el padre ${idPadre}.`
            );
        }

        cantidad *= padre.estados.length;
    }

    return cantidad;
}


// Construir CPT con probabilidades uniformes
function construirTabla(
    nodoHijo: NodoBayes,
    padresNuevos: string[],
    nodos: NodoBayes[]
): FilaProbabilidad[] {

    let combinaciones: Record<string, string>[] = [{}];

    for (const idPadre of padresNuevos) {

        const padre = nodos.find(
            nodo => nodo.id === idPadre
        );

        if (!padre) {
            throw new Error(
                `No se encontro el padre ${idPadre}.`
            );
        }

        combinaciones = combinaciones.flatMap(
            condiciones =>
                padre.estados.map(estado => ({
                    ...condiciones,
                    [idPadre]: estado
                }))
        );
    }

    const probabilidadInicial =
        1 / nodoHijo.estados.length;

    return combinaciones.map(condiciones => ({
        condiciones,

        probabilidades: Object.fromEntries(
            nodoHijo.estados.map(estado => [
                estado,
                probabilidadInicial
            ])
        )
    }));
}


// Aplicacion
function App() {

    // Una sola red bayesiana activa
    const [redActual, setRedActual] = useState<RedBayes>(
        () => structuredClone(redesEjemplo[0].red)
    );

    // React Flow permanece montado
    const [versionCpt, setVersionCpt] = useState(0);

    // Estado de FastAPI
    const [conexion, setConexion] = useState(
        'Comprobando...'
    );

    // Una o varias variables de consulta
    const [consultas, setConsultas] = useState<string[]>([
        redesEjemplo[0].consulta
    ]);

    // Multiples evidencias
    const [evidencias, setEvidencias] = useState<
        Record<string, string>
    >({
        ...redesEjemplo[0].evidencias
    });

    // Nodo seleccionado
    const [
        nodoSeleccionado,
        setNodoSeleccionado
    ] = useState<string | null>(null);

    // Padres seleccionados
    const [
        padresSeleccionados,
        setPadresSeleccionados
    ] = useState<Record<string, string>>({});

    // Resultados y mensajes
    const [resultado, setResultado] =
        useState<RespuestaInferencia | null>(null);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    // Historial persistente
    const [historial, setHistorial] =
        useState<RegistroConsulta[]>(leerHistorial);

    // Identificar solicitudes de calculo
    const solicitudActual = useRef(0);


    // Comprobar conexion con FastAPI
    useEffect(() => {

        clienteApi.estado()
            .then(datos => {
                setConexion(datos.estado);
            })
            .catch(() => {
                setConexion('Desconectado');
            });

    }, []);


    // Guardar historial en el navegador
    useEffect(() => {

        guardarHistorial(historial);

    }, [historial]);


    // Limpiar resultados anteriores
    function limpiarResultados() {

        solicitudActual.current += 1;

        setCargando(false);
        setResultado(null);
        setMensaje('');
        setError('');
    }


    // Reemplazar la unica red activa
    function reemplazarRed(
        nuevaRed: RedBayes,
        nuevasConsultas: string[],
        nuevasEvidencias: Record<string, string>,
        textoMensaje: string
    ) {

        // Ignorar calculos pendientes
        solicitudActual.current += 1;
        setCargando(false);

        // Reemplazar el grafo actual
        setRedActual(nuevaRed);

        // Reiniciar formularios CPT
        setVersionCpt(anterior => anterior + 1);

        // Configurar consulta y evidencias
        setConsultas([...nuevasConsultas]);
        setEvidencias({ ...nuevasEvidencias });

        // Limpiar selecciones anteriores
        setNodoSeleccionado(null);
        setPadresSeleccionados({});

        setResultado(null);
        setError('');
        setMensaje(textoMensaje);
    }


    // Importar una red desde JSON
    function importarRed(nuevaRed: RedBayes) {

        reemplazarRed(
            nuevaRed,
            [nuevaRed.nodos[0].id],
            {},
            `Red "${nuevaRed.nombre}" importada correctamente.`
        );
    }


    // Cargar una red del catalogo
    function cargarEjemplo(ejemplo: EjemploRed) {

        const nuevaRed = structuredClone(ejemplo.red);

        reemplazarRed(
            nuevaRed,
            [ejemplo.consulta],
            ejemplo.evidencias,
            `Ejemplo "${ejemplo.titulo}" cargado correctamente.`
        );
    }


    // Recuperar una consulta del historial
    function recuperarConsulta(
        registro: RegistroConsulta
    ) {

        const mismaRed =
            crearFirmaRed(redActual) === registro.firmaRed;

        // Solicitar confirmacion al cambiar de red
        if (!mismaRed) {

            const confirmar = window.confirm(
                'La consulta guardada utiliza una red ' +
                'diferente o con otras CPT.\n\n' +
                'Para recuperarla se reemplazara la red actual.\n' +
                'Exporta primero tus cambios a JSON ' +
                'si deseas conservarlos.\n\n' +
                '¿Continuar?'
            );

            if (!confirmar) {
                return;
            }
        }

        if (!mismaRed) {

            // Recuperar red original
            reemplazarRed(
                structuredClone(registro.red),
                registro.consultas,
                registro.evidencias,
                'Se recupero la red original de la consulta.'
            );

        } else {

            // Mantener la red activa
            solicitudActual.current += 1;
            setCargando(false);

            setConsultas([
                ...registro.consultas
            ]);

            setEvidencias({
                ...registro.evidencias
            });

            setError('');
            setMensaje(
                'Consulta recuperada del historial.'
            );
        }

        // Mostrar el resultado sin recalcular
        setResultado(
            structuredClone(registro.resultado)
        );
    }


    // Eliminar un registro del historial
    function eliminarRegistro(id: string) {

        setHistorial(anteriores =>
            anteriores.filter(
                registro => registro.id !== id
            )
        );
    }


    // Vaciar historial
    function vaciarHistorial() {

        setHistorial([]);
    }


    // Cambiar las variables de consulta
    function cambiarConsultas(
        nuevasConsultas: string[]
    ) {

        // Aceptar solamente nodos existentes
        const validas = [
            ...new Set(nuevasConsultas)
        ].filter(id =>
            redActual.nodos.some(
                nodo => nodo.id === id
            )
        );

        // Mantener una consulta como minimo
        if (validas.length === 0) {
            return;
        }

        setConsultas(validas);

        // Eliminar evidencias que ahora son consultas
        setEvidencias(anteriores =>
            Object.fromEntries(
                Object.entries(anteriores).filter(
                    ([id]) => !validas.includes(id)
                )
            )
        );

        limpiarResultados();
    }


    // Actualizar evidencias
    function actualizarEvidencias(
        nuevas: Record<string, string>
    ) {

        // Evitar superposicion con la consulta
        const permitidas = Object.fromEntries(
            Object.entries(nuevas).filter(
                ([id, estado]) =>
                    !consultas.includes(id) &&
                    redActual.nodos.some(
                        nodo =>
                            nodo.id === id &&
                            nodo.estados.includes(estado)
                    )
            )
        );

        setEvidencias(permitidas);

        limpiarResultados();
    }


    // Agregar un nodo nuevo
    function agregarNodo() {

        if (redActual.nodos.length >= 10) {

            setMensaje('');
            setError(
                'La red no puede superar los 10 nodos.'
            );

            return;
        }

        // Buscar identificador disponible
        let numero = 1;

        while (
            redActual.nodos.some(
                nodo => nodo.id === `N${numero}`
            )
        ) {
            numero++;
        }

        const nuevoNodo: NodoBayes = {

            id: `N${numero}`,
            nombre: `Nodo ${numero}`,

            estados: ['Si', 'No'],
            padres: [],

            posicion: {
                x: 100 +
                    (redActual.nodos.length % 3) * 220,

                y: 100 +
                    Math.floor(
                        redActual.nodos.length / 3
                    ) * 150
            },

            tabla: [
                {
                    condiciones: {},

                    probabilidades: {
                        Si: 0.50,
                        No: 0.50
                    }
                }
            ]
        };

        setRedActual(anterior => ({
            ...anterior,

            nodos: [
                ...anterior.nodos,
                nuevoNodo
            ]
        }));

        limpiarResultados();
    }


    // Renombrar nodo
    function renombrarNodo(id: string) {

        const nodo = redActual.nodos.find(
            actual => actual.id === id
        );

        if (!nodo) {
            return;
        }

        const nuevoNombre = window.prompt(
            'Nuevo nombre del nodo:',
            nodo.nombre
        );

        if (nuevoNombre === null) {
            return;
        }

        if (!nuevoNombre.trim()) {

            setMensaje('');
            setError(
                'El nombre no puede estar vacio.'
            );

            return;
        }

        setRedActual(anterior => ({
            ...anterior,

            nodos: anterior.nodos.map(actual =>
                actual.id === id
                    ? {
                        ...actual,
                        nombre: nuevoNombre.trim()
                    }
                    : actual
            )
        }));

        limpiarResultados();
    }


    // Eliminar nodo
    function eliminarNodo(id: string) {

        if (redActual.nodos.length <= 3) {

            setMensaje('');
            setError(
                'La red debe conservar al menos 3 nodos.'
            );

            return;
        }

        // Impedir eliminar nodos con hijos
        const hijos = redActual.nodos.filter(
            nodo => nodo.padres.includes(id)
        );

        if (hijos.length > 0) {

            setMensaje('');
            setError(
                'Primero debes quitar las relaciones de este nodo.'
            );

            return;
        }

        const confirmar = window.confirm(
            '¿Eliminar este nodo de la red?'
        );

        if (!confirmar) {
            return;
        }

        // Crear lista sin el nodo
        const restantes = redActual.nodos.filter(
            nodo => nodo.id !== id
        );

        // Eliminar nodo de las consultas
        const nuevasConsultas = consultas.filter(
            actual => actual !== id
        );

        // Conservar una consulta valida
        if (nuevasConsultas.length === 0) {

            nuevasConsultas.push(
                restantes[0].id
            );
        }

        setRedActual(anterior => ({
            ...anterior,
            nodos: restantes
        }));

        // Limpiar seleccion
        setNodoSeleccionado(actual =>
            actual === id ? null : actual
        );

        setConsultas(nuevasConsultas);

        // Quitar evidencias invalidas
        setEvidencias(anteriores => {

            const nuevas = { ...anteriores };

            delete nuevas[id];

            for (const idConsulta of nuevasConsultas) {
                delete nuevas[idConsulta];
            }

            return nuevas;
        });

        // Limpiar selectores de padres
        setPadresSeleccionados(anteriores => {

            const nuevos = { ...anteriores };

            delete nuevos[id];

            for (const hijoId of Object.keys(nuevos)) {

                if (nuevos[hijoId] === id) {
                    nuevos[hijoId] = '';
                }
            }

            return nuevos;
        });

        limpiarResultados();
    }


    // Agregar una relacion dirigida
    function agregarRelacion(
        idPadre: string,
        idHijo: string
    ) {

        const padre = redActual.nodos.find(
            nodo => nodo.id === idPadre
        );

        const hijo = redActual.nodos.find(
            nodo => nodo.id === idHijo
        );

        if (!padre || !hijo) {

            setMensaje('');
            setError(
                'Selecciona un nodo padre valido.'
            );

            return;
        }

        // Evitar auto-relaciones
        if (idPadre === idHijo) {

            setMensaje('');
            setError(
                'Un nodo no puede ser su propio padre.'
            );

            return;
        }

        // Evitar relaciones repetidas
        if (hijo.padres.includes(idPadre)) {

            setMensaje('');
            setError(
                'Esta relacion ya existe.'
            );

            return;
        }

        // Evitar ciclos
        if (
            existeCamino(
                idHijo,
                idPadre,
                redActual.nodos
            )
        ) {

            setMensaje('');
            setError(
                'No se puede crear la relacion: produciria un ciclo.'
            );

            return;
        }

        // Agregar nuevo padre
        const padresNuevos = [
            ...hijo.padres,
            idPadre
        ];

        // Comprobar tamano de CPT
        const filas = contarFilasCpt(
            padresNuevos,
            redActual.nodos
        );

        if (filas > LIMITE_FILAS_CPT) {

            setMensaje('');
            setError(
                'Esta relacion generaria una CPT demasiado grande.'
            );

            return;
        }

        // Avisar que se modificara la CPT
        const confirmar = window.confirm(
            'La tabla CPT del nodo hijo se reiniciara ' +
            'con probabilidades uniformes. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        // Reconstruir CPT
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        // Actualizar red
        setRedActual(anterior => ({
            ...anterior,

            nodos: anterior.nodos.map(nodo =>
                nodo.id === idHijo
                    ? {
                        ...nodo,
                        padres: padresNuevos,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        setPadresSeleccionados(anteriores => ({
            ...anteriores,
            [idHijo]: ''
        }));

        limpiarResultados();
    }


    // Quitar una relacion
    function quitarRelacion(
        idPadre: string,
        idHijo: string
    ) {

        const hijo = redActual.nodos.find(
            nodo => nodo.id === idHijo
        );

        if (
            !hijo ||
            !hijo.padres.includes(idPadre)
        ) {
            return;
        }

        const confirmar = window.confirm(
            'Se eliminara la relacion y se reiniciara ' +
            'la tabla CPT del hijo. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        // Quitar padre
        const padresNuevos = hijo.padres.filter(
            padre => padre !== idPadre
        );

        // Crear CPT nueva
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        setRedActual(anterior => ({
            ...anterior,

            nodos: anterior.nodos.map(nodo =>
                nodo.id === idHijo
                    ? {
                        ...nodo,
                        padres: padresNuevos,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        limpiarResultados();
    }


    // Guardar CPT editada
    function guardarCpt(
        idNodo: string,
        tablaNueva: FilaProbabilidad[]
    ) {

        setRedActual(anterior => ({
            ...anterior,

            nodos: anterior.nodos.map(nodo =>
                nodo.id === idNodo
                    ? {
                        ...nodo,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        limpiarResultados();
    }


    // Personalizar estados
    function guardarEstados(
        idNodo: string,
        estados: string[]
    ): {
        correcto: boolean;
        mensaje: string;
    } {

        const nodo = redActual.nodos.find(
            actual => actual.id === idNodo
        );

        if (!nodo) {

            return {
                correcto: false,
                mensaje: 'El nodo seleccionado no existe.'
            };
        }

        // Validar cantidad de estados
        if (
            estados.length < 2 ||
            estados.length > 6
        ) {

            return {
                correcto: false,
                mensaje:
                    'Se requieren entre 2 y 6 estados.'
            };
        }

        // Copiar los nodos con sus nuevos estados
        const nodosConEstados = redActual.nodos.map(
            actual =>
                actual.id === idNodo
                    ? {
                        ...actual,
                        estados: [...estados]
                    }
                    : actual
        );

        // Nodo modificado e hijos directos
        const afectados = nodosConEstados.filter(
            actual =>
                actual.id === idNodo ||
                actual.padres.includes(idNodo)
        );

        // Comprobar numero de filas de las CPT
        for (const afectado of afectados) {

            const filas = contarFilasCpt(
                afectado.padres,
                nodosConEstados
            );

            if (filas > LIMITE_FILAS_CPT) {

                return {
                    correcto: false,

                    mensaje:
                        `El cambio generaria ${filas} filas ` +
                        `en la CPT de ${afectado.nombre}. ` +
                        `El limite es ${LIMITE_FILAS_CPT}.`
                };
            }
        }

        // Informar consecuencias
        const nombresHijos = afectados
            .filter(actual =>
                actual.id !== idNodo
            )
            .map(actual =>
                actual.nombre
            );

        let advertencia =
            `Se modificaran los estados de "${nodo.nombre}".\n\n` +
            'Su tabla CPT se reiniciara con ' +
            'probabilidades uniformes.';

        if (nombresHijos.length > 0) {

            advertencia +=
                '\n\nTambien se reiniciaran las CPT de:\n' +
                nombresHijos.join('\n');
        }

        advertencia += '\n\n¿Deseas continuar?';

        if (!window.confirm(advertencia)) {

            return {
                correcto: false,
                mensaje: 'Cambio cancelado.'
            };
        }

        // Reconstruir CPT afectadas
        const nodosActualizados = nodosConEstados.map(
            actual => {

                const afectado =
                    actual.id === idNodo ||
                    actual.padres.includes(idNodo);

                if (!afectado) {
                    return actual;
                }

                return {
                    ...actual,

                    tabla: construirTabla(
                        actual,
                        actual.padres,
                        nodosConEstados
                    )
                };
            }
        );

        // Actualizar estados y CPT
        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosActualizados
        }));

        // Revisar evidencia del nodo modificado
        setEvidencias(anteriores => {

            if (
                !Object.prototype.hasOwnProperty.call(
                    anteriores,
                    idNodo
                )
            ) {
                return anteriores;
            }

            if (estados.includes(anteriores[idNodo])) {
                return anteriores;
            }

            const nuevas = { ...anteriores };

            delete nuevas[idNodo];

            return nuevas;
        });

        // Reiniciar editor CPT
        setVersionCpt(anterior => anterior + 1);

        limpiarResultados();

        const mensajeExito =
            `Estados de "${nodo.nombre}" actualizados. ` +
            'Revisa las tablas CPT.';

        setMensaje(mensajeExito);

        return {
            correcto: true,
            mensaje: mensajeExito
        };
    }


    // Guardar posiciones al mover los nodos
    function moverNodos(
        movimientos: {
            id: string;
            posicion: {
                x: number;
                y: number;
            };
        }[]
    ) {

        const posiciones = new Map(
            movimientos.map(movimiento => [
                movimiento.id,
                movimiento.posicion
            ])
        );

        setRedActual(anterior => {

            let huboCambios = false;

            const nodos = anterior.nodos.map(nodo => {

                const posicion = posiciones.get(
                    nodo.id
                );

                if (!posicion) {
                    return nodo;
                }

                // No actualizar si no cambio
                if (
                    nodo.posicion.x === posicion.x &&
                    nodo.posicion.y === posicion.y
                ) {
                    return nodo;
                }

                huboCambios = true;

                return {
                    ...nodo,
                    posicion
                };
            });

            if (!huboCambios) {
                return anterior;
            }

            return {
                ...anterior,
                nodos
            };
        });
    }


    // Validar red con FastAPI
    async function validar() {

        setError('');
        setMensaje('');

        try {

            const respuesta =
                await clienteApi.validar(redActual);

            setMensaje(respuesta.mensaje);

        } catch (problema) {

            setError(
                problema instanceof Error
                    ? problema.message
                    : 'Error de validacion.'
            );
        }
    }


    // Calcular la consulta conjunta
    async function calcular() {

        // Guardar los datos exactos de la solicitud
        const redConsultada = structuredClone(
            redActual
        );

        const consultasGuardadas = [
            ...consultas
        ];

        const evidenciasGuardadas = {
            ...evidencias
        };

        // Identificar solicitud
        const identificadorSolicitud =
            ++solicitudActual.current;

        setCargando(true);
        setError('');
        setResultado(null);

        try {

            // El Backend recibe TODAS las variables
            const respuesta = await clienteApi.inferir(
                redConsultada,
                consultasGuardadas,
                evidenciasGuardadas,
                false
            );

            // Ignorar calculos de consultas anteriores
            if (
                identificadorSolicitud !==
                solicitudActual.current
            ) {
                return;
            }

            // Mostrar distribucion conjunta
            setResultado(respuesta);


            // Guardar registro en el historial
            const registro: RegistroConsulta = {

                id:
                    `${Date.now()}-` +
                    Math.random().toString(36).slice(2),

                fecha: new Date().toISOString(),

                red: redConsultada,

                firmaRed: crearFirmaRed(
                    redConsultada
                ),

                // Campos antiguos del modulo 16
                consulta: consultasGuardadas[0],

                consultaNombre:
                    consultasGuardadas.map(id =>
                        redConsultada.nodos.find(
                            nodo => nodo.id === id
                        )?.nombre || id
                    ).join(', '),

                // Nuevo campo del modulo 17
                consultas: consultasGuardadas,

                evidencias: evidenciasGuardadas,

                resultado: structuredClone(
                    respuesta
                )
            };

            // Agregar al historial
            setHistorial(anteriores => [
                registro,
                ...anteriores
            ].slice(0, LIMITE_HISTORIAL));

        } catch (problema) {

            if (
                identificadorSolicitud ===
                solicitudActual.current
            ) {

                setError(
                    problema instanceof Error
                        ? problema.message
                        : 'Error de inferencia.'
                );
            }

        } finally {

            if (
                identificadorSolicitud ===
                solicitudActual.current
            ) {
                setCargando(false);
            }
        }
    }


    return (

        <main className="aplicacion">

            {/* Encabezado */}
            <header className="encabezado">

                <div>
                    <h1>Redes Bayesianas IDK</h1>
                    <p>Modelos probabilistas</p>
                </div>

                <span className="estado">
                    Backend: {conexion}
                </span>

            </header>


            {/* Catalogo de ejemplos */}
            <SelectorEjemplos
                onCargar={cargarEjemplo}
            />


            {/* Unico editor grafico */}
            <GrafoBayesiano
                red={redActual}
                seleccionado={nodoSeleccionado}
                onSeleccionar={setNodoSeleccionado}
                onConectar={agregarRelacion}
                onDesconectar={quitarRelacion}
                onMoverNodos={moverNodos}
            />


            {/* Importacion y exportacion JSON */}
            <GestorJson
                red={redActual}
                onImportar={importarRed}
            />


            {/* Administracion de la red */}
            <section className="panel">

                <h2>Red bayesiana</h2>

                <p>{redActual.nombre}</p>

                <p>
                    Nodos: {redActual.nodos.length} / 10
                </p>


                {/* Tarjetas de nodos */}
                <div className="nodos">

                    {redActual.nodos.map(nodo => (

                        <div
                            className="nodo"
                            key={nodo.id}
                        >

                            <strong>
                                {nodo.nombre}
                            </strong>

                            <small>
                                ID: {nodo.id}
                            </small>

                            <small>
                                Estados: {
                                    nodo.estados.join(', ')
                                }
                            </small>

                            <small>
                                Padres: {
                                    nodo.padres.join(', ') ||
                                    'Ninguno'
                                }
                            </small>


                            {/* Relaciones actuales */}
                            <div className="listaPadres">

                                {nodo.padres.map(idPadre => (

                                    <button
                                        key={idPadre}
                                        type="button"
                                        className="botonPadre"
                                        title="Quitar relacion"

                                        onClick={() =>
                                            quitarRelacion(
                                                idPadre,
                                                nodo.id
                                            )
                                        }
                                    >
                                        {idPadre} ×
                                    </button>

                                ))}

                            </div>


                            {/* Agregar relaciones */}
                            <div className="configuracionPadres">

                                <label>

                                    Agregar padre

                                    <select
                                        value={
                                            padresSeleccionados[nodo.id] ||
                                            ''
                                        }

                                        onChange={evento =>
                                            setPadresSeleccionados(
                                                anteriores => ({
                                                    ...anteriores,

                                                    [nodo.id]:
                                                        evento.target.value
                                                })
                                            )
                                        }
                                    >

                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {redActual.nodos
                                            .filter(posiblePadre =>
                                                posiblePadre.id !== nodo.id &&
                                                !nodo.padres.includes(
                                                    posiblePadre.id
                                                )
                                            )
                                            .map(posiblePadre => (

                                                <option
                                                    key={posiblePadre.id}
                                                    value={posiblePadre.id}
                                                >
                                                    {posiblePadre.nombre}
                                                </option>

                                            ))}

                                    </select>

                                </label>


                                <button
                                    type="button"
                                    className="botonSecundario"

                                    disabled={
                                        !padresSeleccionados[nodo.id]
                                    }

                                    onClick={() =>
                                        agregarRelacion(
                                            padresSeleccionados[nodo.id],
                                            nodo.id
                                        )
                                    }
                                >
                                    Conectar
                                </button>

                            </div>


                            {/* Renombrar */}
                            <button
                                type="button"
                                className="botonRenombrar"

                                onClick={() =>
                                    renombrarNodo(nodo.id)
                                }
                            >
                                Renombrar
                            </button>


                            {/* Eliminar */}
                            <button
                                type="button"
                                className="botonEliminar"

                                onClick={() =>
                                    eliminarNodo(nodo.id)
                                }
                            >
                                Eliminar
                            </button>

                        </div>

                    ))}

                </div>


                {/* Acciones de la red */}
                <div className="accionesRed">

                    <button
                        type="button"
                        onClick={validar}
                    >
                        Validar red
                    </button>

                    <button
                        type="button"
                        onClick={agregarNodo}

                        disabled={
                            redActual.nodos.length >= 10
                        }
                    >
                        + Agregar nodo
                    </button>

                </div>


                {/* Mensajes */}
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


            {/* Estados personalizados */}
            <EditorEstados
                red={redActual}
                onGuardar={guardarEstados}
            />


            {/* Tablas CPT */}
            <EditorCpt
                key={versionCpt}
                red={redActual}
                onGuardar={guardarCpt}
            />


            {/* Consultas conjuntas */}
            <section className="panel">

                <h2>
                    Consulta probabilistica
                </h2>

                <EditorConsultaConjunta
                    red={redActual}
                    consultas={consultas}
                    evidencias={evidencias}
                    onCambiarConsultas={cambiarConsultas}
                    onCambiarEvidencias={actualizarEvidencias}
                />

                <button
                    type="button"
                    onClick={calcular}
                    disabled={cargando}
                >
                    {
                        cargando
                            ? 'Calculando...'
                            : 'Calcular probabilidades'
                    }
                </button>

            </section>


            {/* Resultados de inferencia */}
            {resultado && (

                <section className="panel">

                    <h2>
                        Resultados de inferencia
                    </h2>

                    {resultado.distribucion.map(
                        (fila, indice) => (

                            <div
                                className="filaResultado"
                                key={indice}
                            >

                                <span>
                                    {
                                        Object.entries(
                                            fila.asignacion
                                        )
                                            .map(
                                                ([variable, estado]) =>
                                                    `${variable} = ${estado}`
                                            )
                                            .join(', ')
                                    }
                                </span>

                                <strong>
                                    {
                                        (
                                            fila.probabilidad * 100
                                        ).toFixed(2)
                                    }%
                                </strong>

                            </div>

                        )
                    )}

                    <p>
                        Probabilidad de evidencia:{' '}
                        {
                            resultado
                                .probabilidad_evidencia
                                .toFixed(6)
                        }
                    </p>

                    {/* Imprimir o guardar como PDF */}
                    <button
                        type="button"
                        onClick={() => window.print()}
                    >
                        Imprimir reporte / Guardar PDF
                    </button>

                </section>

            )}


            {/* Historial de consultas */}
            <HistorialConsultas
                registros={historial}
                onRecuperar={recuperarConsulta}
                onEliminar={eliminarRegistro}
                onVaciar={vaciarHistorial}
            />


            {/* Reporte independiente de la interfaz grafica */}
            {resultado && (
                <ReporteImpresion
                    red={redActual}
                    consultas={consultas}
                    evidencias={evidencias}
                    resultado={resultado}
                />
            )}

        </main>
    );
}

export default App;


import { useCallback, useEffect, useMemo } from 'react';

import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    MarkerType,
    Position,
    useNodesState,
    type Edge,
    type Node,
    type OnConnect,
    type OnNodeDrag
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import type { RedBayes } from '../tipos/red';
import './GrafoBayesiano.css';


// Posicion de un nodo
type Posicion = {
    x: number;
    y: number;
};


// Datos de un movimiento
type Movimiento = {
    id: string;
    posicion: Posicion;
};


// Propiedades recibidas desde App
type Propiedades = {
    red: RedBayes;

    seleccionado: string | null;

    onSeleccionar: (
        id: string | null
    ) => void;

    onConectar: (
        idPadre: string,
        idHijo: string
    ) => void;

    onDesconectar: (
        idPadre: string,
        idHijo: string
    ) => void;

    onMoverNodos: (
        movimientos: Movimiento[]
    ) => void;
};


// Convertir nodos de la red al formato React Flow
function convertirNodos(red: RedBayes): Node[] {

    return red.nodos.map(nodo => ({
        id: nodo.id,

        // Nodo predeterminado
        type: 'default',

        // Posicion guardada
        position: {
            x: nodo.posicion.x,
            y: nodo.posicion.y
        },

        // Entrada por la izquierda
        targetPosition: Position.Left,

        // Salida por la derecha
        sourcePosition: Position.Right,

        // Texto mostrado
        data: {
            label: `${nodo.nombre} (${nodo.id})`
        }
    }));
}


// Componente principal del editor grafico
export default function GrafoBayesiano({
    red,
    seleccionado,
    onSeleccionar,
    onConectar,
    onDesconectar,
    onMoverNodos
}: Propiedades) {

    // Estado local para mover nodos sin parpadeos
    const [
        nodos,
        setNodos,
        manejarCambiosNodos
    ] = useNodesState<Node>(
        convertirNodos(red)
    );


    // Sincronizar el grafo cuando cambia la red
    useEffect(() => {

        setNodos(actuales => {

            const anteriores = new Map(
                actuales.map(nodo => [
                    nodo.id,
                    nodo
                ])
            );

            return convertirNodos(red).map(nodo => {

                const anterior = anteriores.get(nodo.id);

                // Nodo nuevo
                if (!anterior) {
                    return nodo;
                }

                // Conservar seleccion y estado visual
                return {
                    ...anterior,
                    ...nodo,

                    selected: anterior.selected
                };
            });
        });

    }, [red.nodos, setNodos]);


    // Crear flechas desde las relaciones padre-hijo
    const conexiones = useMemo<Edge[]>(() => {

        return red.nodos.flatMap(nodo =>
            nodo.padres.map(idPadre => ({

                id: `conexion-${idPadre}-${nodo.id}`,

                // Nodo de origen
                source: idPadre,

                // Nodo de destino
                target: nodo.id,

                // Flecha curva
                type: 'bezier',

                // Estilo de la linea
                style: {
                    stroke: '#e11d48',
                    strokeWidth: 2
                },

                // Punta de la flecha
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#e11d48'
                }
            }))
        );

    }, [red.nodos]);


    // Crear una conexion entre dos nodos
    const manejarConexion: OnConnect = useCallback(
        conexion => {

            if (
                conexion.source &&
                conexion.target
            ) {
                onConectar(
                    conexion.source,
                    conexion.target
                );
            }

        },
        [onConectar]
    );


    // Guardar posicion al terminar de arrastrar
    const terminarMovimiento: OnNodeDrag<Node> = useCallback(
        (_evento, nodo) => {

            onMoverNodos([
                {
                    id: nodo.id,

                    posicion: {
                        x: nodo.position.x,
                        y: nodo.position.y
                    }
                }
            ]);

        },
        [onMoverNodos]
    );


    return (

        <section className="panel">

            {/* Titulo */}
            <h2>Editor grafico</h2>

            <p>
                Arrastra los nodos para moverlos.
                Conecta el punto derecho de un nodo
                con el izquierdo de otro.
                Haz clic en una flecha para eliminarla.
            </p>


            {/* Lienzo del grafo */}
            <div className="lienzoGrafo">

                <ReactFlow

                    // Nodos y conexiones
                    nodes={nodos}
                    edges={conexiones}

                    // Movimiento fluido
                    onNodesChange={manejarCambiosNodos}

                    // Guardar posicion al soltar
                    onNodeDragStop={terminarMovimiento}

                    // Crear conexiones
                    onConnect={manejarConexion}

                    // Seleccionar nodo
                    onNodeClick={(_evento, nodo) => {
                        onSeleccionar(nodo.id);
                    }}

                    // Quitar seleccion
                    onPaneClick={() => {
                        onSeleccionar(null);
                    }}

                    // Eliminar relacion seleccionada
                    onEdgeClick={(_evento, conexion) => {
                        onDesconectar(
                            conexion.source,
                            conexion.target
                        );
                    }}

                    // Ajustar la vista inicial
                    fitView

                    // Limites de zoom
                    minZoom={0.3}
                    maxZoom={2}

                    // Tema oscuro
                    colorMode="dark"

                    // No eliminar con teclado
                    deleteKeyCode={null}
                >

                    {/* Fondo cuadriculado */}
                    <Background
                        gap={18}
                        size={1}
                    />

                    {/* Controles de zoom */}
                    <Controls
                        showInteractive={false}
                    />

                    {/* Vista general de la red */}
                    <MiniMap
                        pannable
                        zoomable
                    />

                </ReactFlow>

            </div>


            {/* Informacion del nodo seleccionado */}
            {seleccionado && (

                <p className="detalleNodoGrafo">

                    Nodo seleccionado:{' '}

                    <strong>
                        {
                            red.nodos.find(
                                nodo => nodo.id === seleccionado
                            )?.nombre
                        }
                    </strong>

                    . Puedes editar su tabla CPT
                    en el panel correspondiente.

                </p>

            )}

        </section>
    );
}

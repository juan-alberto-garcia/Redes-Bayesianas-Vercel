
export interface FilaProbabilidad {
    condiciones: Record<string, string>;
    probabilidades: Record<string, number>;
}

export interface Posicion {
    x: number;
    y: number;
}

export interface NodoBayes {
    id: string;
    nombre: string;
    estados: string[];
    padres: string[];
    tabla: FilaProbabilidad[];
    posicion: Posicion;
}

export interface RedBayes {
    nombre: string;
    nodos: NodoBayes[];
    formato: number;
}

export interface FilaResultado {
    asignacion: Record<string, string>;
    probabilidad: number;
}

// Factor descrito por el Backend
export interface FactorDescrito {
    variables: string[];
    filas: {
        asignacion: Record<string, string>;
        valor: number;
    }[];
}

// Etapas del procedimiento matematico
export type PasoInferencia =
    | {
        etapa: 'inicializacion';
        descripcion: string;
        factores: FactorDescrito[];
    }
    | {
        etapa: 'evidencia';
        evidencia: Record<string, string>;
        factores: FactorDescrito[];
    }
    | {
        etapa: 'orden';
        variablesOcultas: string[];
    }
    | {
        etapa: 'eliminacion';
        variable: string;
        factoresUsados: FactorDescrito[];
        producto: FactorDescrito;
        resultado: FactorDescrito;
    }
    | {
        etapa: 'normalizacion';
        probabilidadEvidencia: number;
        factor: FactorDescrito;
        factorAntes?: FactorDescrito;
        constanteNormalizacion?: number;
    }
    
    | {
        etapa: 'producto_final';
        factoresRestantes: FactorDescrito[];
        resultado: FactorDescrito;
    };

export interface RespuestaInferencia {
    nombre_red: string;
    variable_consulta: string[];
    evidencia: Record<string, string>;
    distribucion: FilaResultado[];
    probabilidad_evidencia: number;
    orden_eliminacion: string[];
    pasos: PasoInferencia[];
}

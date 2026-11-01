
from itertools import product
from math import isfinite
from aplicacion.modelos import  (SolicitudInferencia, RespuestaInferencia, FilaResultado)
from aplicacion.validacion import validarRed
from aplicacion.factores import (Factor, crearFactor, reducirFactor, multiplicarFactores, sumarVariable, normalizarFactor)

#Convertir un factor de datos para mostrar sus pasos
def describirFactor(factor:Factor)->dict:
    filas=[]
    for combinacion, valor in factor.valores.items():
        filas.append({"asignacion": dict(zip(factor.variables,combinacion)), "valor": valor})
    return{"variables": factor.variables.copy(), "filas":filas}

#Resolver una consulta mediante eliminacion de variables
def inferirRed(solicitud:SolicitudInferencia)->RespuestaInferencia:
    red=solicitud.red
    variablesConsulta=solicitud.variables_consulta
    evidencia=solicitud.evidencia
    #Validar primerp la estructura de la red
    validarRed(red)
    #Localizar los nodos mediante su ID
    nodos={nodo.id:nodo
           for nodo in red.nodos
    }
    #Comprobar las variables de consulta
    if not variablesConsulta or len(variablesConsulta)!=len(set(variablesConsulta)):
        raise ValueError("La consulta debe tener variables sin repetir")
    for variable in variablesConsulta:
        if variable not in nodos:
            raise ValueError(f"La variable de consulta {variable} no existe")
    #Comprobar la evidencia
    for variable, estado in evidencia.items():
        if variable not in nodos:
            raise ValueError(f"La variable de consulta {variable} no existe")

    #Comprobar la evidencia
    for variable, estado in evidencia.items():
        if variable not in nodos:
            raise ValueError(f"La variable de evidencia {variable} no existe")
        if estado not in nodos[variable].estados:
            raise ValueError(f"Estado de evidencia invalido en {variable}")
    #Lista para registrar los pasos del algoritmo
    pasos=[]
    #Paso 1: Crear factores a partir de las CPT
    facores=[crearFactor(nodo) for nodo in red.nodos]
    if solicitud.mostrar_pasos:
        pasos.append({"etapa":"inicializacion","descripcion":"Crear factores desde las tablas de posibilidad", "factores":[
            describirFactor(factor) for factor in facores
            ]
        })
    #Paso 2: Aplicar evidnecia a los factores
    facores=[reducirFactor(factor, evidencia) for factor in facores]
    if solicitud.mostrar_pasos:
        pasos.append({"etapa":"evidencia", "evidencia":evidencia.copy(),
                      "factores":[describirFactor(factor) for factor in facores
            ]
        })
    #Paso 3: Seleccionar las varibles ocultas
    ordenEliminacion=[nodo.id for nodo in red.nodos
                      if nodo.id not in variablesConsulta and nodo.id not in evidencia]
    if solicitud.mostrar_pasos:
        pasos.append({"etapa":"orden", "variablesOcultas": ordenEliminacion.copy()})

    #Paso 4: Eliminar cada variable oculta
    for variable in ordenEliminacion:
        #factores que contienen la variable
        relacionados=[factor for factor in facores
                      if variable in factor.variables]
        #factores que no contienen la variable
        restantes=[factor for factor in facores
                   if variable not in factor.variables]
        if not relacionados:
            raise ValueError(f"No existen factores para eliminar {variable}")
        #Multiplicar los factores relacionados
        factorUnido=relacionados[0]
        for siguiente in relacionados[1:]:
            factorUnido=multiplicarFactores(factorUnido, siguiente)
        #Sumar los estados de la variable
        factorReducido=sumarVariable(factorUnido, variable)
        #Actualizar la lista de factores
        restantes.append(factorReducido)
        facores=restantes
        #Registrar la eliminacion
        if solicitud.mostrar_pasos:
            pasos.append({"etapa":"eliminacion", "variable":variable, "factoresUsados":[
                describirFactor(factor) for factor in relacionados], "producto":describirFactor(factorUnido), "resultado":describirFactor(factorReducido)})

    #Paso 5: Multiplicar los factores restentes
    factorFinal=facores[0]
    for siguiente in facores[1:]:
        factorFinal=multiplicarFactores(factorFinal, siguiente)
    if solicitud.mostrar_pasos:
        pasos.append({
            "etapa": "producto_final",
            "factoresRestantes": [
                describirFactor(factor) for factor in facores
            ],
            "resultado": describirFactor(factorFinal)
        })
    #Calcular la probabilidad de la evidencia
    probabilidadEvidencia=sum(factorFinal.valores.values())
    #Comprobar que la evidencia sea posible
    if(not isfinite(probabilidadEvidencia) or probabilidadEvidencia <= 0):
        raise ValueError("La evidencia tiene probabilidad cero")

    #Paso 6: Normalizar el factor final
    resultado=normalizarFactor(factorFinal)
    if solicitud.mostrar_pasos:
        pasos.append({"etapa":"normalizacion", "probabilidadEvidencia":probabilidadEvidencia, "factor":describirFactor(resultado)})
    #Preparar las combinaciones de consulta
    distribucion=[]
    estadosConsulta=[nodos[variable].estados for variable in variablesConsulta]
    #Construir la distribucion completa
    for estados in product(*estadosConsulta):
        asignacion=dict(zip(variablesConsulta, estados))
        #Comprobar si contradice una evidencia
        contradiceEvidencia=any(
            asignacion[variable]!=estado
            for variable, estado in evidencia.items()
            if variable in asignacion
        )
        if contradiceEvidencia:
            probabilidad=0.0
        else:
            combinacion=tuple(asignacion[variable] for variable in resultado.variables)
            probabilidad=resultado.valores.get(combinacion, 0.0)
        distribucion.append(FilaResultado(asignacion=asignacion, probabilidad=probabilidad))
    #Entregar la respuesta
    return RespuestaInferencia(
        nombre_red=red.nombre, variable_consulta=variablesConsulta, evidencia=evidencia, distribucion=distribucion, probabilidad_evidencia=probabilidadEvidencia, orden_eliminacion=ordenEliminacion, pasos=pasos)

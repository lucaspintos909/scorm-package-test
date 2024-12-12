#!/bin/bash

# Variables
SRC_DIR="./src"
OUTPUT_DIR="./output"
BASE_NAME="tarea_individual"
DEFAULT_VERSION="v1"

# Crear la carpeta de salida si no existe
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Creando el directorio de salida: '$OUTPUT_DIR'..."
    mkdir -p "$OUTPUT_DIR"
fi

# Determinar la versión
if [ -z "$1" ]; then
    echo "No se proporcionó una versión, buscando la última versión en '$OUTPUT_DIR'..."

    # Buscar el mayor número de versión existente
    LAST_VERSION=$(ls "$OUTPUT_DIR" | grep -oP "${BASE_NAME}_v\K[0-9]+" | sort -nr | head -n 1)
    if [ -z "$LAST_VERSION" ]; then
        VERSION=$DEFAULT_VERSION
    else
        NEW_VERSION=$((LAST_VERSION + 1))
        VERSION="v${NEW_VERSION}"
    fi
else
    VERSION="$1"
fi

# Generar el nombre del archivo ZIP
OUTPUT_ZIP="${BASE_NAME}_${VERSION}.zip"
OUTPUT_PATH=".${OUTPUT_DIR}/${OUTPUT_ZIP}"

# Verificar si el directorio de origen existe
if [ ! -d "$SRC_DIR" ]; then
    echo "Error: El directorio de origen '$SRC_DIR' no existe."
    exit 1
fi

# Cambiar al directorio de origen
cd "$SRC_DIR" || { echo "Error: No se pudo cambiar al directorio '$SRC_DIR'."; exit 1; }

# Comprimir los archivos
echo "Creando el archivo ZIP '$OUTPUT_PATH'..."
zip -r "$OUTPUT_PATH" ./*

# Verificar si la compresión fue exitosa
if [ $? -eq 0 ]; then
    echo "Archivo ZIP creado exitosamente: $OUTPUT_PATH"
else
    echo "Error: Falló la creación del archivo ZIP."
    exit 1
fi

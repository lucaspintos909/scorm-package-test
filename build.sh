#!/bin/bash

# Verifica si se proporcionó un nombre de archivo
if [ -z "$1" ]; then
  echo "Uso: $0 nombre_del_archivo (sin .zip)"
  exit 1
fi

# Definir la ruta de la carpeta a comprimir
SRC_DIR="src"

# Verificar si la carpeta existe
if [ ! -d "$SRC_DIR" ]; then
  echo "Error: La carpeta '$SRC_DIR' no existe."
  exit 1
fi

# Agregar la extensión .zip al nombre proporcionado
ZIP_NAME="$1.zip"

# Moverse a la carpeta src y comprimir su contenido (sin incluir la carpeta en sí)
cd "$SRC_DIR" || exit 1
zip -r "../$ZIP_NAME" ./*
cd - > /dev/null

echo "Archivo zip '$ZIP_NAME' creado exitosamente con el contenido de '$SRC_DIR'."

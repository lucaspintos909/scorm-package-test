@echo off
setlocal enabledelayedexpansion

:: Variables
set "SRC_DIR=.\src"
set "OUTPUT_DIR=.\output"
set "BASE_NAME=multitarea"
set "DEFAULT_VERSION=1"

:: Crear la carpeta de salida si no existe
if not exist "%OUTPUT_DIR%" (
    echo Creando el directorio de salida: "%OUTPUT_DIR%"...
    mkdir "%OUTPUT_DIR%"
)

:: Determinar la versión inicial
if "%~1"=="" (
    echo No se proporcionó una versión, buscando la última versión en "%OUTPUT_DIR%"...

    :: Buscar el mayor número de versión existente
    set "LAST_VERSION=0"
    for /f "tokens=2 delims=_v." %%A in ('dir /b "%OUTPUT_DIR%\%BASE_NAME%_v*.zip" ^| findstr /r "%BASE_NAME%_v[0-9][0-9]*"') do (
        if %%A gtr !LAST_VERSION! set "LAST_VERSION=%%A"
    )

    if "!LAST_VERSION!"=="0" (
        set /a "VERSION=%DEFAULT_VERSION%"
    ) else (
        set /a "VERSION=LAST_VERSION + 1"
    )
) else (
    set "VERSION=%~1"
)

:: Asegurarse de no sobrescribir un archivo existente
:check_existing
set "OUTPUT_ZIP=%BASE_NAME%_v%VERSION%.zip"
set "OUTPUT_PATH=%OUTPUT_DIR%\%OUTPUT_ZIP%"

if exist "%OUTPUT_PATH%" (
    echo El archivo "%OUTPUT_ZIP%" ya existe. Incrementando la versión...
    set /a "VERSION+=1"
    goto check_existing
)

:: Verificar si el directorio de origen existe
if not exist "%SRC_DIR%" (
    echo Error: El directorio de origen "%SRC_DIR%" no existe.
    exit /b 1
)

:: Comprimir los archivos
echo Creando el archivo ZIP "%OUTPUT_PATH%"...
powershell -Command "Compress-Archive -Path '%SRC_DIR%\*' -DestinationPath '%OUTPUT_PATH%' -Force"

:: Verificar si la compresión fue exitosa
if exist "%OUTPUT_PATH%" (
    echo Archivo ZIP creado exitosamente: "%OUTPUT_PATH%"
) else (
    echo Error: Falló la creación del archivo ZIP.
    exit /b 1
)

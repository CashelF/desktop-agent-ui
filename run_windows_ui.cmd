@echo off
setlocal enabledelayedexpansion
pushd "%~dp0"

:: Load .env if it exists
if exist .env (
  for /f "tokens=1,2 delims==" %%a in (.env) do (
    set "%%a=%%b"
  )
)

:: Prompt for WINDOWS_PYTHON_EXE if not set
if "%WINDOWS_PYTHON_EXE%"=="" (
  echo WINDOWS_PYTHON_EXE not found in .env
  set /p "WINDOWS_PYTHON_EXE=Please enter the path to your Windows Python exe: "
  echo WINDOWS_PYTHON_EXE=!WINDOWS_PYTHON_EXE!>>.env
)

set "WINDOWS_PYTHON_PATH=%WINDOWS_PYTHON_EXE%"

if not exist "%WINDOWS_PYTHON_EXE%" (
  echo WINDOWS_PYTHON_PATH does not exist:
  echo   %WINDOWS_PYTHON_EXE%
  set EXIT_CODE=1
  goto :done
)

if not exist node_modules\electron (
  echo Electron is not installed in this repo yet.
  echo Run "npm install" in this folder first, then run this script again.
  set EXIT_CODE=1
  goto :done
)

npm start
set EXIT_CODE=%errorlevel%

:done
popd
exit /b %EXIT_CODE%

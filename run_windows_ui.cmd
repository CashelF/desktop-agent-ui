@echo off
setlocal
pushd "%~dp0"

set "WINDOWS_PYTHON_EXE=C:\Users\cpfit\miniforge3\envs\desktop-agent\python.exe"
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

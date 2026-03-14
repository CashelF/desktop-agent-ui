@echo off
setlocal
pushd "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %errorlevel% neq 0 (
    set EXIT_CODE=1
    goto :done
  )
)

call npm run pack:win
set EXIT_CODE=%errorlevel%

:done
popd
exit /b %EXIT_CODE%

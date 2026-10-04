@echo off
cd /d "%~dp0"

set "PYTHON=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if not exist "%PYTHON%" set "PYTHON=python"

if not exist ".venv\Scripts\python.exe" (
    "%PYTHON%" -m venv .venv
    if errorlevel 1 goto :error
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto :error

set "CYBERSA_RESEARCHER_PASSWORD=change-me"
".venv\Scripts\python.exe" -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
exit /b %errorlevel%

:error
echo Failed to prepare or start CyberSA. Check the error above.
pause
exit /b 1

@echo off
REM Starts RetailIQ: mock source API, backend and frontend. Close this window to stop.
cd /d "%~dp0"
where uv >nul 2>nul || (
  echo uv is not installed. Install it with:  winget install --id astral-sh.uv
  echo or see https://docs.astral.sh/uv/getting-started/installation/
  pause
  exit /b 1
)
uv run --project backend python run.py %*
pause

@echo off
rem Abre a Pixelandia LIVE sempre no mesmo endereco e no mesmo perfil de navegador,
rem para o mundo salvo continuar de uma live para a outra.
setlocal
cd /d "%~dp0"

set "PORTA=8787"
set "URL=http://localhost:%PORTA%/"
set "PERFIL=%LOCALAPPDATA%\PixelandiaLive\navegador"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

rem Liga o servidor local, se ainda nao estiver ligado.
powershell -NoProfile -Command "try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%PORTA%/saude -TimeoutSec 1|Out-Null;exit 0}catch{exit 1}"
if errorlevel 1 (
  start "Pixelandia LIVE - servidor (nao feche)" /min node "%~dp0ponte\ponte.mjs"
  powershell -NoProfile -Command "for($i=0;$i -lt 20;$i++){try{Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%PORTA%/saude -TimeoutSec 1|Out-Null;exit 0}catch{Start-Sleep -Milliseconds 300}};exit 1"
  if errorlevel 1 (
    echo O servidor nao respondeu na porta %PORTA%. Veja a janela "Pixelandia LIVE - servidor".
    pause
    exit /b 1
  )
)

rem Procura o Chrome; se nao tiver, usa o Edge (ja vem no Windows).
set "NAV="
for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if not defined NAV if exist %%P set "NAV=%%~P"

if not defined NAV (
  echo Chrome ou Edge nao encontrado. Abra %URL% sempre no mesmo navegador.
  start "" "%URL%"
  exit /b 0
)

rem Perfil proprio: o salvamento fica separado do seu navegador do dia a dia
rem e nao some se voce limpar o historico dele.
start "" "%NAV%" --user-data-dir="%PERFIL%" --app="%URL%" --window-size=1920,1080 --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required
exit /b 0

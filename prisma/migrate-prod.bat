@echo off
REM Migrações em PRODUÇÃO - use a DATABASE_URL do seu ambiente de produção.
REM Ex.: copie de Vercel/Railway/K8s e rode:
REM   migrate-prod.bat "postgresql://user:pass@host:5432/bfx?schema=public"
if "%~1"=="" (
  echo.
  echo Uso: migrate-prod.bat "postgresql://usuario:senha@host:5432/bfx?schema=public"
  echo.
  echo Obtenha a DATABASE_URL em: Vercel Project Settings, Railway, ou seu provedor.
  exit /b 1
)
set DATABASE_URL=%~1
cd /d "%~dp0.."
echo Aplicando migrações em producao...
npx prisma migrate deploy --schema "%~dp0schema.prisma"
if %errorlevel% equ 0 (
  echo.
  echo Migracoes aplicadas com sucesso.
) else (
  echo.
  echo ERRO. Verifique a conexao e tente novamente.
  exit /b 1
)

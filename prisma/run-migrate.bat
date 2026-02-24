@echo off
REM Roda migrações Prisma. Use a DATABASE_URL do ambiente ou passe como primeiro argumento.
if not "%~1"=="" set DATABASE_URL=%~1
if "%DATABASE_URL%"=="" (
  echo Defina DATABASE_URL no ambiente ou passe como argumento, ex.:
  echo   run-migrate.bat "postgresql://postgres:postgres@localhost:5432/bfx?schema=public"
  exit /b 1
)
cd /d "%~dp0.."
npx prisma migrate deploy --schema "%~dp0schema.prisma"

@echo off
echo ===================================================
echo   DEMARRAGE DU SERVEUR MONGODB (SmartApply Tunisia)
echo ===================================================
echo.
echo Tentative de demarrage du service Windows MongoDB...
net start MongoDB

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Si vous voyez "Acces refuse", faites un clic droit
    echo        sur ce fichier puis "Executer en tant qu'administrateur".
    echo.
    echo Demarrage alternatif direct de mongod.exe...
    echo (Gardez cette fenetre ouverte pour que la base reste active)
    echo.
    "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --config "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
) else (
    echo.
    echo ===================================================
    echo   MongoDB est connecte avec succes sur le port 27017 !
    echo   Vous pouvez maintenant cliquer sur CONNECT dans Compass.
    echo ===================================================
)
pause

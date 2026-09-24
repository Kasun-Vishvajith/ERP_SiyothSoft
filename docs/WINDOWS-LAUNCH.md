# Windows launch guide

## Before the first launch

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for Windows.
2. Start Docker Desktop and wait until its engine reports that it is running.
3. Make sure virtualization/WSL 2 is enabled if Docker Desktop requests it.
4. Double-click `start-erp.bat` from the project root.
5. On the first run, the script creates `.env` from `.env.example` and opens it in Notepad.
6. Replace the `replace-with-...` values in `.env`, especially `POSTGRES_PASSWORD`, `ERP_USERNAME` and `ERP_PASSWORD`, save the file, and run `start-erp.bat` again.

The launcher creates the external Docker volume `mini-erp-pgdata` automatically. This volume contains the PostgreSQL data and survives container restarts.

## Start the application

Double-click:

```text
start-erp.bat
```

The script will validate Docker and Compose, build the backend/frontend images, run the Flyway migrations, wait for the web page, and open:

```text
http://localhost:8188
```

Use the `ERP_USERNAME` and `ERP_PASSWORD` values from `.env` to sign in. Existing products receive stock count `0` after the stock migration; set opening quantities in the Inventory page before creating invoices.

## Stop the application

Double-click:

```text
stop-erp.bat
```

This stops the containers but preserves the database volume. Do not use `docker compose down -v`, because that removes the persistent database volume.

## Useful troubleshooting commands

Run these from PowerShell in the project root:

```powershell
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100
docker compose --env-file .env logs backend
docker compose --env-file .env up --build -d
```

If port `8188` is already in use, stop the other application using it or change the published port in `compose.yaml` and use the matching URL.

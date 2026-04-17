# SETUP GUIDE - Virtual Intern Project

This guide explains how to set up the development environment for the **Virtual Intern** project, specifically configuring **Apache** as a Reverse Proxy so that Frontend, Backend (Laravel), and Meeting Server (Node.js) run under a single domain (Localhost or Ngrok).

## 1. Prerequisites

- **XAMPP** installed (Apache & PHP).
- **Node.js** installed.
- **Ngrok** installed.

## 2. Apache Configuration (Reverse Proxy)

This configuration allows Apache to route traffic to the correct service based on the URL path.

### A. Enable Proxy Modules

1. Open `C:\xampp\apache\conf\httpd.conf` in a text editor (as Administrator).
2. Find and **uncomment** (remove `#`) the following lines:
    ```apache
    LoadModule proxy_module modules/mod_proxy.so
    LoadModule proxy_http_module modules/mod_proxy_http.so
    LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
    # Optional but recommended keys:
    LoadModule proxy_balancer_module modules/mod_proxy_balancer.so
    LoadModule proxy_connect_module modules/mod_proxy_connect.so
    ```

### B. Configure Virtual Host

1. Open `C:\xampp\apache\conf\extra\httpd-vhosts.conf`.
2. Append the following configuration to the end of the file:

    ```apache
    # === Ngrok / Virtual Intern Local Universal Config ===
    # This handles both "http://virtual-intern.local" AND "https://your-ngrok.app"
    <VirtualHost *:80>
        ServerName virtual-intern.local
        ServerAlias *.ngrok-free.app localhost

        # 1. LIVEBLOCKS / SOCKET.IO (Meeting Server)
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule ^/socket.io/(.*) ws://localhost:3002/socket.io/$1 [P,L]

        ProxyPass /socket.io http://localhost:3002/socket.io
        ProxyPassReverse /socket.io http://localhost:3002/socket.io

        # 2. LARAVEL API
        ProxyPass /api http://localhost:8000/api
        ProxyPassReverse /api http://localhost:8000/api

        # 2b. LARAVEL STORAGE (Public Files)
        ProxyPass /storage http://localhost:8000/storage
        ProxyPassReverse /storage http://localhost:8000/storage

        # 3. FRONTEND (Vite/React)
        ProxyPass / http://localhost:5173/
        ProxyPassReverse / http://localhost:5173/

        ErrorLog "logs/virtual-intern-error.log"
        CustomLog "logs/virtual-intern-access.log" common
    </VirtualHost>
    ```

3. **Restart Apache** from XAMPP Control Panel.

## 3. Hosts File (Optional for Local Domain)

To access the app locally via `http://virtual-intern.local`:

1. Open Notepad **Run as Administrator**.
2. Open file: `C:\Windows\System32\drivers\etc\hosts`.
3. Add this line at the bottom:
    ```text
    127.0.0.1 virtual-intern.local
    ```
4. Save.

## 4. Environment Variables (`.env`)

Ensure the Frontend knows to use relative paths so it works behind the proxy.

**File:** `lms-frontend/.env`

```env
VITE_API_URL=/api
VITE_MEETING_SERVER_URL=/
```

## 5. How to Run

You need to run 4 terminal windows:

1. **Frontend:**

    ```bash
    cd lms-frontend
    npm run dev
    # Must run on port 5173
    ```

2. **Backend (Laravel):**

    ```bash
    php artisan serve --port=8000
    ```

3. **Meeting Server:**

    ```bash
    cd meeting-server
    npm start
    # Must run on port 3002
    ```

    ```bash
    ngrok config add-authtoken YOUR_TOKEN
    # OR edit ngrok.yml and paste your token in the 'authtoken' field.
    ```

4. **Ngrok (Public Access):**
    ```bash
    ngrok start --all --config=ngrok.yml
    # OR simply:
    ngrok http 80
    ```

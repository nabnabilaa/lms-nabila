# Deployment Plan for 1 Laravel Project (Free Hosting)

This plan outlines a simpler and more realistic deployment approach for a **single Laravel project** using **free-tier services**.

## Goal

Deploy one Laravel application at zero cost for demo, portfolio, testing, or academic purposes, while avoiding an architecture that is too fragmented.

## Key Decision

The project will be deployed as **one Laravel application** on a platform that supports traditional web app hosting.

### Recommended Hosting
- **Render** or **Koyeb** for the Laravel application
- **Aiven MySQL Free** if the project must stay on MySQL
- **Neon** or **Supabase** if PostgreSQL is acceptable

## Why the Previous Plan Needs Revision

The previous deployment direction used:
- Vercel for frontend
- Vercel for Laravel API
- Separate hosting for the meeting server

That structure creates multiple services and does **not** match the goal of keeping the system as **one Laravel project**.

### Main Limitation

> [!IMPORTANT]
> **Vercel is not the ideal target for a Laravel monolith.**
> It is primarily a serverless platform. While community PHP runtimes exist, this approach is less suitable for a standard Laravel application that should behave like a conventional web app.
>
> If the project also contains a **meeting server** built with **Node.js + Socket.io + Puppeteer**, that component still cannot be hosted properly on Vercel because it needs a persistent process and heavier runtime support.

## Recommended Architecture

### Option A — Best Fit for “1 Project Laravel”
Use this if your application can run fully inside Laravel.

- **Application**: Laravel (Blade / Livewire / Inertia / integrated frontend build)
- **Hosting**: Render or Koyeb
- **Database**: Aiven MySQL Free, Neon, or Supabase
- **Domain**: Free platform subdomain

This is the simplest route and the closest to your stated goal.

### Option B — Only If Realtime Meeting Feature Is Mandatory
Use this only if the project still depends on a separate meeting service.

- **Main App**: Laravel on Render or Koyeb
- **Database**: Aiven / Neon / Supabase
- **Meeting Server**: Separate service on Railway, Render, or VPS

This means the system is **no longer truly one deployment**, even if it remains one larger project repository.

## Recommended Final Direction

For a free deployment and lower complexity, the safest recommendation is:

1. Keep the application as **one Laravel app**
2. Deploy Laravel to **Render** or **Koyeb**
3. Use a **free hosted database**
4. Disable or postpone the separate meeting server feature unless it is absolutely required

## Deployment Steps

## 1. Prepare the Laravel Project

Make sure the project is production-ready.

### Checklist
- Set `APP_ENV=production`
- Set `APP_DEBUG=false`
- Set a proper `APP_KEY`
- Confirm database migrations run without errors
- Confirm file storage strategy (`public` or cloud) is clear
- Make sure `.env` is not committed

Run locally before deployment:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan migrate
```

## 2. Choose a Database

### If You Must Use MySQL
Use **Aiven MySQL Free**.

Update your environment variables:

```env
DB_CONNECTION=mysql
DB_HOST=your-host
DB_PORT=your-port
DB_DATABASE=your-database
DB_USERNAME=your-username
DB_PASSWORD=your-password
```

### If PostgreSQL Is Acceptable
Use **Neon** or **Supabase**.

Example:

```env
DB_CONNECTION=pgsql
DB_HOST=your-host
DB_PORT=5432
DB_DATABASE=your-database
DB_USERNAME=your-username
DB_PASSWORD=your-password
```

## 3. Deploy Laravel to Render

This is one of the best free options for a standard Laravel app.

### Basic Steps
1. Push the project to GitHub
2. Create a new Web Service in Render
3. Connect the repository
4. Set build and start commands
5. Add environment variables in the Render dashboard
6. Deploy

### Typical Commands

**Build Command:**
```bash
composer install --no-dev --optimize-autoloader && php artisan config:cache && php artisan route:cache && php artisan view:cache
```

**Start Command:**
```bash
php artisan serve --host=0.0.0.0 --port=$PORT
```

> Note: some Laravel deployments on Render use Docker or custom web server configuration for better production behavior. For student/demo use, start-command-based deployment is usually enough if supported by your setup.

## 4. Alternative: Deploy Laravel to Koyeb

Koyeb is also suitable for hobby/demo PHP applications.

### Basic Steps
1. Push the project to GitHub
2. Create a new App in Koyeb
3. Connect the repository or deploy using Docker
4. Add all required environment variables
5. Run deployment and test the generated URL

Koyeb is acceptable for prototypes, but free instances are not intended for serious production workloads.

## 5. Set Laravel Environment Variables

At minimum, configure:

```env
APP_NAME="Hospital App"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app-url
LOG_CHANNEL=stack
CACHE_STORE=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
```

And add all database credentials from your provider.

## 6. Run Migration in Production

After deployment, run:

```bash
php artisan migrate --force
```

If your platform provides a shell or deploy hook, use it there.

## 7. Frontend Strategy for One Laravel Project

If the project currently has a separate React frontend, use one of these approaches:

### Preferred Approach
Integrate the frontend into Laravel using:
- Blade
- Livewire
- Inertia
- Vite build inside the Laravel project

This keeps deployment as **one Laravel application**.

### Less Ideal Approach
Keep React separate and deploy it elsewhere.

This breaks the “one Laravel project” deployment goal and should be avoided if simplicity is your priority.

## 8. What to Do About the Meeting Server

If your project includes:
- Node.js
- Socket.io
- Puppeteer
- recording or browser automation

then this component should be treated as a **separate backend service**.

### Recommendation
For a free and simple deployment:
- disable the feature temporarily, or
- replace it with a lighter non-realtime module for the first deployment

Because once this server becomes mandatory, the architecture stops being a clean single-service Laravel deployment.

## Verification Plan

## Automated Checks

Run locally before deployment:

```bash
php artisan test
```

If no tests exist, at least check:

```bash
php artisan migrate:status
php artisan about
```

## Manual Checks

After deployment, verify:
- home page loads correctly
- login/register works
- database connection succeeds
- CRUD features work normally
- file upload works if used
- routes do not return 500 errors
- production `.env` values are applied correctly

## Practical Notes About Free Hosting

Free hosting is suitable for:
- thesis demo
- portfolio
- MVP validation
- internal testing
- small academic projects

Free hosting is **not** suitable for:
- hospital production systems
- high traffic workloads
- sensitive mission-critical operations
- always-on realtime infrastructure

Possible free-tier limitations:
- cold start / sleeping service
- low CPU and RAM
- storage limitations
- limited outbound networking
- limited uptime guarantees

## Final Recommendation

The most realistic deployment plan is:

- **1 Laravel app**
- **Deploy to Render or Koyeb**
- **Use free hosted DB**
- **Avoid Vercel for this monolith**
- **Postpone separate meeting server if possible**

This gives you the cleanest path to launch quickly, stay free, and keep the architecture aligned with your goal.

---

## Short Version

**Best free setup for your case:**
- Laravel app → **Render** or **Koyeb**
- Database → **Aiven MySQL Free** or **Neon/Supabase**
- Frontend → merged into Laravel project
- Meeting server → postpone or deploy separately only if absolutely necessary

That is the least chaotic path. Tiny budget, fewer moving parts, fewer deployment gremlins.

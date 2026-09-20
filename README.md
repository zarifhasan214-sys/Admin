# Manirampur Blood Network — Admin Dashboard

## IMPORTANT: shared PostgreSQL database

This admin project is intentionally configured to use the **same PostgreSQL database and the same table schema** as the main Manirampur Blood Network project.

Both projects use:

```env
DATABASE_URL=the_exact_same_postgresql_connection_string
```

Do not create a second database for the admin dashboard.

### First setup

1. Copy `.env.example` to `.env`.
2. Put the exact same `DATABASE_URL` used by the main app into `.env`.
3. Install packages:

```bash
npm install
```

4. From the **main project only**, push the shared schema:

```bash
npm run db:push
```

5. If this is a brand-new database, seed reference data from the main project:

```bash
npm run db:seed
```

The admin seed is intentionally a no-op. It never truncates shared production data and never creates fake users/donors/requests.

## Deployment

Set the same `DATABASE_URL` as an environment variable in the admin deployment. Never put database credentials in client-side code.

## Android / APK

This project contains a Capacitor 8.5.2 configuration and a GitHub Actions workflow.

Set a GitHub repository secret named:

```text
CAPACITOR_SERVER_URL
```

to the deployed **HTTPS admin URL**, then run:

**GitHub → Actions → Build Android APK → Run workflow**

The workflow produces a debug APK artifact that can be installed on Android.

For Google Play Store, use a properly signed release build/AAB rather than the debug APK.

## Safety

- Never commit `.env`.
- Never expose `DATABASE_URL` to the browser.
- Both apps must use the same PostgreSQL instance/database.
- Do not run the admin seed against a production database.

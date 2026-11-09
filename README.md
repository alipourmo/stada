# BioTrack (Vercel + vercel-php)
1. Import this repo in Vercel (Framework: Other).
2. Environment Variables: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_SSL=1 (if the DB needs TLS), EXAM_DATE=YYYY-MM-DD, INSTALL_KEY=<random string>.
3. Deploy, then open /api/install.php?key=<INSTALL_KEY> once; afterwards delete INSTALL_KEY and redeploy.
4. Open /login.php and register.
The MySQL server must be reachable from the internet. Never commit passwords; see .env.example.

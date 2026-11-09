import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/login.php", destination: "/login", permanent: true },
      { source: "/logout.php", destination: "/api/auth/logout", permanent: false },
      { source: "/pomodoro.php", destination: "/pomodoro", permanent: true },
      { source: "/tests.php", destination: "/log", permanent: true },
      { source: "/tests", destination: "/log", permanent: false },
      { source: "/leaderboard.php", destination: "/leaderboard", permanent: true },
      { source: "/reports.php", destination: "/reports", permanent: true },
      { source: "/class.php", destination: "/class", permanent: true },
    ];
  },
};

export default nextConfig;

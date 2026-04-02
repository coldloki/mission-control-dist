/**
 * PM2 Ecosystem Config — Mission Control
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup   # auto-start on reboot
 */

module.exports = {
  apps: [
    {
      name: "mission-control",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3001,
        MEMORY_DB_PATH: process.env.MEMORY_DB_PATH || "data/tasks.db",
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

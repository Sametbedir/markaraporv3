export async function register() {
  // Zamanlayıcı yalnızca Node sunucusunda çalışır (edge ortamında değil)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startUptimeScheduler } = await import('./lib/uptime/scheduler');
    startUptimeScheduler();
  }
}

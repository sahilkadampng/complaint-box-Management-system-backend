// Keep backend server warm to prevent cold starts
export const setupKeepAlive = () => {
    // Only run in production environment
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
        const BACKEND_URL = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN;

        if (!BACKEND_URL) {
            console.log('⚠️ Keep-alive disabled: BACKEND_URL not configured');
            return;
        }

        console.log('✅ Keep-alive activated for:', BACKEND_URL);

        // Ping server every 10 minutes to prevent cold starts
        const interval = setInterval(async () => {
            try {
                const url = BACKEND_URL.startsWith('http')
                    ? BACKEND_URL
                    : `https://${BACKEND_URL}`;

                await fetch(`${url}/api/auth/health-check`, {
                    method: 'GET',
                    headers: { 'User-Agent': 'Keep-Alive-Service' }
                });

                console.log('🏓 Keep-alive ping sent at', new Date().toISOString());
            } catch (error) {
                console.error('❌ Keep-alive ping failed:', error);
            }
        }, 10 * 60 * 1000); // Every 10 minutes

        // Cleanup on process termination
        process.on('SIGTERM', () => {
            clearInterval(interval);
            console.log('🛑 Keep-alive stopped');
        });

        process.on('SIGINT', () => {
            clearInterval(interval);
            console.log('🛑 Keep-alive stopped');
        });
    } else {
        console.log('ℹ️ Keep-alive disabled (development mode or Vercel environment)');
    }
};
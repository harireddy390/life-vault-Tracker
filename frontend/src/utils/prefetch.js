/**
 * Predictive Prefetching & Route Preloader
 * Eagerly preloads code chunks and warms in-memory SWR cache on idle & touch.
 */
import swrCache from './swrCache';

// Registry of dynamic route importers
const importers = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/command': () => import('../pages/CommandCenter'),
  '/planner': () => import('../pages/Planner'),
  '/progress': () => import('../pages/Planner'),
  '/finance': () => import('../pages/Finance'),
  '/life-ai': () => import('../pages/LifeAI'),
  '/ai': () => import('../pages/LifeAI'),
  '/vault': () => import('../pages/DocumentVault'),
  '/goals': () => import('../pages/Goals'),
  '/health': () => import('../pages/Health'),
  '/learning': () => import('../pages/Notes'),
  '/notes': () => import('../pages/Notes'),
  '/family': () => import('../pages/Family'),
  '/memories': () => import('../pages/Memories'),
  '/emergency': () => import('../pages/Emergency'),
  '/settings': () => import('../pages/Settings'),
};

const preloadedRoutes = new Set();
const preloadedAPIs = new Set();

/**
 * Prefetches both the JavaScript chunk and primary API data for a given route.
 */
export function prefetchRoute(routePath) {
  if (!routePath) return;

  // Normalize path
  const normalized = routePath.split('?')[0].split('#')[0];

  // 1. Eagerly load JS chunk
  if (!preloadedRoutes.has(normalized)) {
    const loader = importers[normalized];
    if (loader) {
      preloadedRoutes.add(normalized);
      loader().catch(() => {});
    }
  }

  // 2. Warm in-memory API cache if not already warm
  if (!preloadedAPIs.has(normalized)) {
    preloadedAPIs.add(normalized);

    if (normalized === '/command') {
      import('../services/commandService')
        .then((m) => m.default.getTodayData())
        .then((data) => {
          if (data) swrCache.set('command:today', data);
        })
        .catch(() => {});
    } else if (normalized === '/progress' || normalized === '/planner') {
      import('../services/progressAnalyticsService')
        .then(async (m) => {
          const [dash, heat] = await Promise.all([
            m.default.getDashboardAnalytics().catch(() => null),
            m.default.getHeatmapData().catch(() => null),
          ]);
          if (dash) swrCache.set('progress:analytics', dash.scores ? dash : dash.data || dash);
          if (heat) swrCache.set('progress:heatmap', heat.days || heat || []);
        })
        .catch(() => {});
    } else if (normalized === '/finance') {
      import('../services/financeService')
        .then((m) => {
          const now = new Date();
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          return m.default.getOverview(monthStr).then((ov) => {
            if (ov) swrCache.set(`finance:overview:${monthStr}`, ov);
          });
        })
        .catch(() => {});
    }
  }
}

/**
 * Schedule eager preloading of top routes during browser idle time.
 */
export function preloadCriticalRoutesOnIdle() {
  const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 300));
  schedule(() => {
    prefetchRoute('/command');
    prefetchRoute('/progress');
    prefetchRoute('/finance');
    prefetchRoute('/life-ai');
  });
}

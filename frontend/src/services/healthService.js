import api from '../api/axiosConfig';

const healthService = {
  // Fetch synced health metrics from your backend database
  getMetrics: async (startDate, endDate) => {
    try {
      const response = await api.get('/health/metrics', { params: { startDate, endDate } });
      return response.data;
    } catch (error) {
      console.warn('Backend health metrics unavailable:', error.message);
      return null;
    }
  },

  // Bridge to native Android Health Connect (if running inside an Android WebView wrapper)
  syncNativeHealthData: async () => {
    try {
      // Check if native Android bridge interface is injected
      if (window.AndroidHealthConnect && typeof window.AndroidHealthConnect.getDailySteps === 'function') {
        const nativeSteps = await window.AndroidHealthConnect.getDailySteps();
        const nativeCalories = await window.AndroidHealthConnect.getActiveCalories();
        
        // Push synced data to backend database
        const payload = {
          date: new Date().toISOString().split('T')[0],
          steps: nativeSteps || 0,
          activeCalories: nativeCalories || 0,
          source: 'HealthConnect'
        };
        
        await api.post('/health/sync', payload);
        return payload;
      }
      return null; // Health Connect bridge not present (web-only mode)
    } catch (error) {
      console.error('Failed to sync native Health Connect data:', error);
      return null;
    }
  }
};

export default healthService;
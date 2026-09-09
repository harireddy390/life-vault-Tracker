import api from '../api/axiosConfig';

export const progressAnalyticsService = {
  // Get main dashboard analytics (Life Scores, velocity, roadmap, radar wheel)
  getDashboardAnalytics: async () => {
    const res = await api.get('/progress/dashboard');
    return res.data;
  },

  // Get 365-day activity heatmap data
  getHeatmapData: async () => {
    const res = await api.get('/progress/heatmap');
    return res.data;
  },

  // Get velocity chart time-series data
  getVelocityData: async (days = 30) => {
    const res = await api.get(`/progress/velocity-chart?days=${days}`);
    return res.data;
  },

  // Get past weekly reflections
  getWeeklyReflections: async () => {
    const res = await api.get('/progress/reflections');
    return res.data;
  },

  // Submit new weekly reflection
  submitWeeklyReflection: async (reflectionData) => {
    const res = await api.post('/progress/reflections', reflectionData);
    return res.data;
  },

  // Get export summary
  getExportSummary: async () => {
    const res = await api.get('/progress/export-pdf');
    return res.data;
  }
};

export default progressAnalyticsService;

import api from '../api/axiosConfig';
import { swrCache } from '../utils/swrCache';

const CACHE_KEY = 'emergency_profile';

const getProfile = async (onRevalidate) => {
  return swrCache.fetchSWR(
    CACHE_KEY,
    async () => {
      const { data } = await api.get('/emergency');
      return data;
    },
    onRevalidate
  );
};

const updateProfile = async (profile) => {
  const { data } = await api.put('/emergency', profile);
  swrCache.set(CACHE_KEY, data);
  return data;
};

export default { getProfile, updateProfile };

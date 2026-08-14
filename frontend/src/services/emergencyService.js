import api from '../api/axiosConfig';

const getProfile = async () => (await api.get('/emergency')).data;
const updateProfile = async (profile) => (await api.put('/emergency', profile)).data;

export default { getProfile, updateProfile };

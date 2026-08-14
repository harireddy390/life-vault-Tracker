import api from '../api/axiosConfig';

const getSessions = async () => (await api.get('/timer-sessions')).data;

const logSession = async (session) => (await api.post('/timer-sessions', session)).data;

export default { getSessions, logSession };

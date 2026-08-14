import api from '../api/axiosConfig';

const getFamily = async () => (await api.get('/family')).data;
const addMember = async (member) => (await api.post('/family', member)).data;
const deleteMember = async (id) => (await api.delete(`/family/${id}`)).data;

export default { getFamily, addMember, deleteMember };

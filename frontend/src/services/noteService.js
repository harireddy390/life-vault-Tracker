import api from '../api/axiosConfig';

const getNotes = async () => (await api.get('/notes')).data;

const createNote = async (title, content = '') =>
  (await api.post('/notes', { title, content })).data;

const updateNote = async (id, updates) => (await api.put(`/notes/${id}`, updates)).data;

const deleteNote = async (id) => (await api.delete(`/notes/${id}`)).data;

export default { getNotes, createNote, updateNote, deleteNote };

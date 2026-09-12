import api from '../api/axiosConfig';

const BASE = '/learning';

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats = async () => (await api.get(`${BASE}/stats`)).data;

// ── Study Notes ───────────────────────────────────────────────────────────────
export const getNotes = async (params = {}) =>
  (await api.get(`${BASE}/notes`, { params })).data;

export const createNote = async (data) =>
  (await api.post(`${BASE}/notes`, data)).data;

export const updateNote = async (id, data) =>
  (await api.put(`${BASE}/notes/${id}`, data)).data;

export const deleteNote = async (id) =>
  (await api.delete(`${BASE}/notes/${id}`)).data;

export const pinNote = async (id) =>
  (await api.patch(`${BASE}/notes/${id}/pin`)).data;

// ── Flashcard Decks ───────────────────────────────────────────────────────────
export const getDecks = async () =>
  (await api.get(`${BASE}/flashcards/decks`)).data;

export const createDeck = async (data) =>
  (await api.post(`${BASE}/flashcards/decks`, data)).data;

export const deleteDeck = async (id) =>
  (await api.delete(`${BASE}/flashcards/decks/${id}`)).data;

// ── Flashcards ────────────────────────────────────────────────────────────────
export const getDueFlashcards = async (deck_id) =>
  (await api.get(`${BASE}/flashcards/due`, { params: deck_id ? { deck_id } : {} })).data;

export const getFlashcards = async (deck_id) =>
  (await api.get(`${BASE}/flashcards`, { params: { deck_id } })).data;

export const createFlashcard = async (data) =>
  (await api.post(`${BASE}/flashcards`, data)).data;

export const gradeFlashcard = async (id, grade) =>
  (await api.patch(`${BASE}/flashcards/${id}/grade`, { grade })).data;

export const deleteFlashcard = async (id) =>
  (await api.delete(`${BASE}/flashcards/${id}`)).data;

// ── Roadmaps ──────────────────────────────────────────────────────────────────
export const getRoadmaps = async () =>
  (await api.get(`${BASE}/roadmaps`)).data;

export const createRoadmap = async (data) =>
  (await api.post(`${BASE}/roadmaps`, data)).data;

export const updateRoadmap = async (id, data) =>
  (await api.put(`${BASE}/roadmaps/${id}`, data)).data;

export const deleteRoadmap = async (id) =>
  (await api.delete(`${BASE}/roadmaps/${id}`)).data;

export const addRoadmapStep = async (topicId, title) =>
  (await api.post(`${BASE}/roadmaps/${topicId}/steps`, { title })).data;

export const toggleStep = async (topicId, stepId) =>
  (await api.patch(`${BASE}/roadmaps/steps/${topicId}/${stepId}/toggle`)).data;

export const deleteStep = async (topicId, stepId) =>
  (await api.delete(`${BASE}/roadmaps/steps/${topicId}/${stepId}`)).data;

// ── Resources ─────────────────────────────────────────────────────────────────
export const getResources = async () =>
  (await api.get(`${BASE}/resources`)).data;

export const createResource = async (data) =>
  (await api.post(`${BASE}/resources`, data)).data;

export const uploadResource = async (formData) =>
  (
    await api.post(`${BASE}/resources/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;

export const updateResourceProgress = async (id, current_progress) =>
  (await api.patch(`${BASE}/resources/${id}/progress`, { current_progress })).data;

export const updateResource = async (id, data) =>
  (await api.put(`${BASE}/resources/${id}`, data)).data;

export const deleteResource = async (id) =>
  (await api.delete(`${BASE}/resources/${id}`)).data;

export default {
  getStats,
  getNotes, createNote, updateNote, deleteNote, pinNote,
  getDecks, createDeck, deleteDeck,
  getDueFlashcards, getFlashcards, createFlashcard, gradeFlashcard, deleteFlashcard,
  getRoadmaps, createRoadmap, updateRoadmap, deleteRoadmap, addRoadmapStep, toggleStep, deleteStep,
  getResources, createResource, uploadResource, updateResourceProgress, updateResource, deleteResource,
};

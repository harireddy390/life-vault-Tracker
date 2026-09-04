
import api from '../api/axiosConfig';

/**
 * Fetch the logged steps for the current user.
 * Optional `date` query param can filter a specific day.
 */
export const getSteps = async (date) => {
    const params = date ? { date } : {};
    const { data } = await api.get('/steps', { params });
    return data;
};

/**
 * Log or update the step count for a given date.
 * If an entry already exists, it will be up‑serted.
 *
 * @param {string} date  – ISO‑date string (e.g., 2024‑09‑05)
 * @param {number} steps – Number of steps for that day
 */
export const logSteps = async (date, steps) => {
    const { data } = await api.post('/steps', { date, steps });
    return data;
};

export default {
    getSteps,
    logSteps,
};

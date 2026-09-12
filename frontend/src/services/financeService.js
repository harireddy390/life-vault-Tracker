import api from '../api/axiosConfig';

const BASE = '/finance';

// ── Overview & Metrics ────────────────────────────────────────────────────────
export const getOverview = async (month) => {
  const params = month ? { month } : {};
  return (await api.get(`${BASE}/overview`, { params })).data;
};

// ── Transactions Ledger ───────────────────────────────────────────────────────
export const getTransactions = async (params = {}) => {
  return (await api.get(`${BASE}/transactions`, { params })).data;
};

export const createTransaction = async (data) => {
  if (data instanceof FormData) {
    return (
      await api.post(`${BASE}/transactions`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }
  return (await api.post(`${BASE}/transactions`, data)).data;
};

export const updateTransaction = async (id, data) => {
  if (data instanceof FormData) {
    return (
      await api.put(`${BASE}/transactions/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  }
  return (await api.put(`${BASE}/transactions/${id}`, data)).data;
};

export const deleteTransaction = async (id) => {
  return (await api.delete(`${BASE}/transactions/${id}`)).data;
};

// ── Budgets ───────────────────────────────────────────────────────────────────
export const getBudgets = async (month) => {
  const params = month ? { month } : {};
  return (await api.get(`${BASE}/budgets`, { params })).data;
};

export const setBudget = async (data) => {
  return (await api.post(`${BASE}/budgets`, data)).data;
};

export const deleteBudget = async (id) => {
  return (await api.delete(`${BASE}/budgets/${id}`)).data;
};

// ── Recurring Bills & Subscriptions ──────────────────────────────────────────
export const getRecurringBills = async () => {
  return (await api.get(`${BASE}/recurring`)).data;
};

export const createRecurringBill = async (data) => {
  return (await api.post(`${BASE}/recurring`, data)).data;
};

export const markRecurringBillPaid = async (id) => {
  return (await api.patch(`${BASE}/recurring/${id}/mark-paid`)).data;
};

export const updateRecurringBill = async (id, data) => {
  return (await api.put(`${BASE}/recurring/${id}`, data)).data;
};

export const deleteRecurringBill = async (id) => {
  return (await api.delete(`${BASE}/recurring/${id}`)).data;
};

// ── CSV Export ────────────────────────────────────────────────────────────────
export const exportCsv = async (month, type = 'All') => {
  const params = { month, type };
  const response = await api.get(`${BASE}/export-csv`, {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `lifevault_finance_${month || 'export'}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default {
  getOverview,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBudgets,
  setBudget,
  deleteBudget,
  getRecurringBills,
  createRecurringBill,
  markRecurringBillPaid,
  updateRecurringBill,
  deleteRecurringBill,
  exportCsv,
};

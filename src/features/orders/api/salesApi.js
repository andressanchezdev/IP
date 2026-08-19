import { apiRequest } from '@/shared/api'

function extractSales(payload) {
  const data = payload?.data ?? payload
  if (Array.isArray(data)) {
    return data
  }
  if (Array.isArray(data?.ventas)) {
    return data.ventas
  }
  if (Array.isArray(data?.sales)) {
    return data.sales
  }
  return []
}

export async function getManagementSales({ token, signal } = {}) {
  const payload = await apiRequest('/api/v1/managment/sales', {
    method: 'GET',
    token,
    signal,
  })

  return {
    data: extractSales(payload),
    meta: payload?.meta ?? {},
    raw: payload,
  }
}

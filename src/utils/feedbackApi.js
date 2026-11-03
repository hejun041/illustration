/**
 * 投诉与改进建议
 * POST /feedback { content, locale? }
 */

export async function submitUserFeedback(http, { content = '', locale = 'zh', apiBaseUrl = '' } = {}) {
  const text = String(content || '').trim();
  const apiUrl = apiBaseUrl ? `${apiBaseUrl.replace(/\/+$/, '')}/feedback` : '/feedback';
  const token = localStorage.getItem('token') || '';
  const res = await http.post(
    apiUrl,
    { content: text, locale },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    }
  );
  const data = res?.data || {};
  const ok = data.code === 0 || data.desc === 'success';
  if (!ok) {
    const msg = data.message || data.desc || '提交失败';
    throw new Error(typeof msg === 'string' ? msg : '提交失败');
  }
  return data.message || data.data || data;
}

/** 仅获取管理员审核公开的建议和回复。 */
export async function listPublicFeedback(http, { page = 1, apiBaseUrl = '' } = {}) {
  const url = apiBaseUrl ? `${apiBaseUrl.replace(/\/+$/, '')}/feedback/public` : '/feedback/public';
  const res = await http.get(url, { params: { page, pageSize: 10 }, timeout: 15000 });
  const data = res?.data;
  if (!data || (data.code !== 0 && data.desc !== 'success')) throw new Error('Unable to load feedback');
  const result = data.data || data.message;
  if (!result || !Array.isArray(result.items)) throw new Error('Invalid feedback response');
  return { items: result.items, hasMore: Boolean(result.hasMore) };
}

export async function listFeedbackForReview(http, { page = 1, apiBaseUrl = '' } = {}) {
  const url = apiBaseUrl ? `${apiBaseUrl.replace(/\/+$/, '')}/feedback/admin` : '/feedback/admin';
  const res = await http.get(url, { params: { page }, timeout: 15000 });
  if (res?.data?.code !== 0 || !Array.isArray(res.data.data?.items)) throw new Error(res?.data?.message || 'Unable to load feedback');
  return res.data.data;
}

export async function reviewFeedback(http, { id, publicContent, reply, isPublished, apiBaseUrl = '' }) {
  const base = apiBaseUrl ? apiBaseUrl.replace(/\/+$/, '') : '';
  const res = await http.post(`${base}/feedback/admin/${encodeURIComponent(id)}`, {
    public_content: publicContent, reply, is_published: isPublished,
  });
  if (res?.data?.code !== 0) throw new Error(res?.data?.message || 'Unable to save feedback');
  return res.data.data;
}

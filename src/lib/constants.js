// Umumiy konstantalar
export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
}

export const DEPARTMENTS = {
  OQUV: 'oquv',
  MARKETING: 'marketing',
}

export const DEPT_LABELS = {
  oquv: '🎓 O\'quv Markaz',
  marketing: '📣 Marketing',
}

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
}

export const INCOME_CATEGORIES = [
  { id: 'kurs', label: '📚 Kurs to\'lovi', color: '#10b981' },
  { id: 'imtihon', label: '📝 Imtihon to\'lovi', color: '#3b82f6' },
  { id: 'konsultatsiya', label: '💬 Konsultatsiya', color: '#8b5cf6' },
  { id: 'grant', label: '🏆 Grant/Subsidiya', color: '#f59e0b' },
  { id: 'smm', label: '📱 SMM Xizmati', color: '#06b6d4' },
  { id: 'boshqa_kirim', label: '💰 Boshqa Kirim', color: '#6b7280' },
]

export const EXPENSE_CATEGORIES = [
  { id: 'ijara', label: '🏢 Ijara', color: '#ef4444' },
  { id: 'maosh', label: '👨‍🏫 Maosh', color: '#f59e0b' },
  { id: 'kommunal', label: '💡 Kommunal', color: '#f97316' },
  { id: 'jihozlar', label: '🖥️ Jihozlar', color: '#06b6d4' },
  { id: 'remont', label: '🏗️ Remont', color: '#8b5cf6' },
  { id: 'reklama', label: '📣 Reklama/Marketing', color: '#ec4899' },
  { id: 'materiallar', label: '📖 O\'quv materiallari', color: '#3b82f6' },
  { id: 'transport', label: '🚗 Transport', color: '#84cc16' },
  { id: 'soliq', label: '📋 Soliq', color: '#6366f1' },
  { id: 'qarz_qaytarish', label: '🤝 Qarz qaytarish', color: '#14b8a6' },
  { id: 'boshqa', label: '📦 Boshqa', color: '#6b7280' },
]

export const PAYMENT_METHODS = [
  { id: 'cash', label: '💵 Naqd' },
  { id: 'card', label: '💳 Karta' },
  { id: 'bank', label: '🏦 Bank o\'tkazma' },
  { id: 'debt', label: '📝 Qarz (Kredit)' },
]

export const ROLE_LABELS = {
  owner: '👑 Owner',
  admin: '🧾 Admin',
  accountant: '📊 Buxgalter',
}

export const formatCurrency = (val) =>
  new Intl.NumberFormat('uz-UZ', {
    style: 'currency', currency: 'UZS', maximumFractionDigits: 0
  }).format(val || 0)

export const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const getCategoryInfo = (id, type = 'expense') => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return list.find(c => c.id === id) || { id, label: id, color: '#6b7280' }
}

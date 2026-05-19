import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, DEPT_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import * as XLSX from 'xlsx'

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth]     = useState(new Date().toISOString().slice(0, 7))
  const [data, setData]       = useState([])

  useEffect(() => { fetchReport() }, [month])

  const fetchReport = async () => {
    setLoading(true)
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .like('transaction_date', `${month}%`)
    setData(txns || [])
    setLoading(false)
  }

  // Department summaries
  const oquvIncome   = data.filter(t => t.department === 'oquv' && t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const oquvExpense  = data.filter(t => t.department === 'oquv' && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const mktIncome    = data.filter(t => t.department === 'marketing' && t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const mktExpense   = data.filter(t => t.department === 'marketing' && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome  = oquvIncome + mktIncome
  const totalExpense = oquvExpense + mktExpense

  // Expense by category (pie chart)
  const expenseByCat = EXPENSE_CATEGORIES.map(cat => {
    const total = data.filter(t => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0)
    return { name: cat.label, value: total, color: cat.color }
  }).filter(c => c.value > 0)

  // Bar chart
  const deptData = [
    { name: '🎓 O\'quv', Kirim: oquvIncome, Xarajat: oquvExpense },
    { name: '📣 Marketing', Kirim: mktIncome, Xarajat: mktExpense },
  ]

  const handleExport = () => {
    const rows = data.map(t => ({
      'Sana': t.transaction_date,
      'Tur': t.type === 'income' ? 'Kirim' : 'Xarajat',
      "Bo'lim": DEPT_LABELS[t.department] || t.department,
      'Kategoriya': ([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.id === t.category))?.label || t.category,
      'Izoh': t.note || '',
      'Kreditor': t.third_party_name || '',
      'Summa': t.amount,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, month)
    XLSX.writeFile(wb, `Mizan_Hisobot_${month}.xlsx`)
  }

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>📑 Hisobotlar</h1>
          <p>Oylik va bo'limlar bo'yicha tahlil</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="date-range-group">
            <label className="date-label">Oy:</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="month-picker"
            />
          </div>
          <button className="btn-export" onClick={handleExport}>
            <Download size={15}/> Excel export
          </button>
        </div>
      </div>

      {loading ? <div className="full-center"><div className="spinner"/></div> : (
        <>
          {/* ── Umumiy statistika ── */}
          <div className="stats-grid">
            <div className="stat-card green-card">
              <div className="stat-icon-wrap"><TrendingUp size={22}/></div>
              <div>
                <div className="stat-label">Jami Kirim</div>
                <h2>{formatCurrency(totalIncome)}</h2>
              </div>
            </div>
            <div className="stat-card red-card">
              <div className="stat-icon-wrap"><TrendingDown size={22}/></div>
              <div>
                <div className="stat-label">Jami Xarajat</div>
                <h2>{formatCurrency(totalExpense)}</h2>
              </div>
            </div>
            <div className={`stat-card ${totalIncome - totalExpense >= 0 ? 'navy-card' : 'red-card'}`}>
              <div className="stat-icon-wrap"><DollarSign size={22}/></div>
              <div>
                <div className="stat-label">Sof Foyda</div>
                <h2>{formatCurrency(totalIncome - totalExpense)}</h2>
              </div>
            </div>
          </div>

          {/* ── Bo'limlar tahlili ── */}
          <div className="charts-row">
            {/* O'quv Markaz */}
            <div className="card">
              <h3 className="card-title">🎓 O'quv Markaz</h3>
              <div className="dept-summary-grid">
                <div className="dept-summary-item income">
                  <span className="dept-summary-label">Kirim</span>
                  <span className="dept-summary-value">{formatCurrency(oquvIncome)}</span>
                </div>
                <div className="dept-summary-item expense">
                  <span className="dept-summary-label">Xarajat</span>
                  <span className="dept-summary-value">{formatCurrency(oquvExpense)}</span>
                </div>
                <div className={`dept-summary-item ${oquvIncome - oquvExpense >= 0 ? 'profit' : 'loss'} full`}>
                  <span className="dept-summary-label">Foyda / Zarar</span>
                  <span className="dept-summary-value">{formatCurrency(oquvIncome - oquvExpense)}</span>
                </div>
              </div>
            </div>

            {/* Marketing */}
            <div className="card">
              <h3 className="card-title">📣 Marketing Bo'limi</h3>
              <div className="dept-summary-grid">
                <div className="dept-summary-item income">
                  <span className="dept-summary-label">Kirim</span>
                  <span className="dept-summary-value">{formatCurrency(mktIncome)}</span>
                </div>
                <div className="dept-summary-item expense">
                  <span className="dept-summary-label">Xarajat</span>
                  <span className="dept-summary-value">{formatCurrency(mktExpense)}</span>
                </div>
                <div className={`dept-summary-item ${mktIncome - mktExpense >= 0 ? 'profit' : 'loss'} full`}>
                  <span className="dept-summary-label">Foyda / Zarar</span>
                  <span className="dept-summary-value">{formatCurrency(mktIncome - mktExpense)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bar Chart ── */}
          <div className="card">
            <h3 className="card-title">Bo'limlar solishtirmasi — {month}</h3>
            {data.length === 0 ? (
              <div className="full-center" style={{ height: 200, color: '#94a3b8' }}>
                Bu oyda yozuv topilmadi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{ fontSize: 13 }}/>
                  <YAxis tickFormatter={v => (v / 1000000).toFixed(1) + 'M'} tick={{ fontSize: 12 }}/>
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }}/>
                  <Bar dataKey="Kirim" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Xarajat" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Pie Chart — Xarajatlar taqsimoti ── */}
          {expenseByCat.length > 0 && (
            <div className="card">
              <h3 className="card-title">Xarajatlar taqsimoti</h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie data={expenseByCat} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                      {expenseByCat.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expenseByCat.map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: cat.color || COLORS[i % COLORS.length], flexShrink: 0 }}/>
                      <span style={{ flex: 1, fontSize: 13 }}>{cat.name}</span>
                      <strong style={{ fontSize: 13 }}>{formatCurrency(cat.value)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Tranzaksiyalar ro'yxati ── */}
          {data.length > 0 && (
            <div className="card no-pad">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Tur</th>
                    <th>Bo'lim</th>
                    <th>Kategoriya</th>
                    <th style={{ textAlign: 'right' }}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(t => {
                    const cat = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.id === t.category)
                    return (
                      <tr key={t.id}>
                        <td>{t.transaction_date}</td>
                        <td><span className={`type-badge ${t.type}`}>{t.type === 'income' ? 'Kirim' : 'Xarajat'}</span></td>
                        <td><span className="dept-badge">{DEPT_LABELS[t.department]}</span></td>
                        <td>{cat?.label || t.category}</td>
                        <td className={`amount-cell ${t.type}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

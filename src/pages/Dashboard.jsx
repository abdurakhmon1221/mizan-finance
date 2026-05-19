import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import { formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEPT_LABELS } from '../lib/constants'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#6366f1','#6b7280']

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats]     = useState(null)
  const [balances, setBalances] = useState({ cash: 0, card: 0, bank: 0, total: 0 })
  const [monthly, setMonthly] = useState([])
  const [byCat, setByCat]     = useState([])
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('month') // month | quarter | year

  useEffect(() => { fetchData() }, [period])

  const getDateFrom = () => {
    const now = new Date()
    if (period === 'month')   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    if (period === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
    if (period === 'year')    return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  }

  const fetchData = async () => {
    setLoading(true)
    const dateFrom = getDateFrom()

    // 1. Fetch cumulative balances (all-time, not filtered by date)
    const { data: allTxns } = await supabase
      .from('transactions')
      .select('type, amount, payment_method')
      .is('deleted_at', null)
      .in('payment_method', ['cash', 'card', 'bank'])

    let b = { cash: 0, card: 0, bank: 0, total: 0 }
    ;(allTxns || []).forEach(t => {
      const pm = t.payment_method
      if (t.type === 'income') b[pm] += t.amount
      else if (t.type === 'expense') b[pm] -= t.amount
    })
    b.total = b.cash + b.card + b.bank
    setBalances(b)

    // 2. Fetch data for selected period
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', dateFrom)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })

    if (!txns) { setLoading(false); return }

    const income  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const profit  = income - expense
    const margin  = income > 0 ? ((profit / income) * 100).toFixed(1) : 0

    setStats({ income, expense, profit, margin })

    // Monthly chart (last 6 months)
    const { data: monthly6 } = await supabase
      .from('transactions')
      .select('amount, type, transaction_date')
      .gte('transaction_date', new Date(new Date().setMonth(new Date().getMonth() - 5)).toISOString().split('T')[0])
      .is('deleted_at', null)

    const monthMap = {}
    ;(monthly6 || []).forEach(t => {
      const m = t.transaction_date.slice(0, 7)
      if (!monthMap[m]) monthMap[m] = { month: m, kirim: 0, xarajat: 0 }
      if (t.type === 'income')  monthMap[m].kirim   += t.amount
      if (t.type === 'expense') monthMap[m].xarajat += t.amount
    })
    setMonthly(Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)))

    // By category (expenses)
    const catMap = {}
    txns.filter(t => t.type === 'expense').forEach(t => {
      if (!catMap[t.category]) catMap[t.category] = 0
      catMap[t.category] += t.amount
    })
    setByCat(Object.entries(catMap).map(([id, val]) => {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === id) || { label: id }
      return { name: cat.label.replace(/^\S+\s/, ''), value: val }
    }))

    setRecent(txns.slice(0, 8))
    setLoading(false)
  }

  if (loading) return <div className="full-center"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📊 Dashboard</h1>
          <p>Salom, {profile?.full_name}! Bugungi moliyaviy ko'rsatkichlar.</p>
        </div>
      </div>

      {/* ── Kassa Qoldig'i (All time) ── */}
      <div className="card" style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', color: 'white', border: 'none' }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, opacity: 0.9, marginBottom: 12 }}>Haqiqiy pul qoldig'i (Kassa)</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Jami Kassa</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(balances.total)}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', height: 32 }} className="desktop-only" />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>💵 Naqd pul</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(balances.cash)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>💳 Plastik Karta</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(balances.card)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>🏦 Hisob raqam</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(balances.bank)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <h3 style={{ fontSize: 16 }}>Davr hisoboti</h3>
        <div className="period-tabs">
          {[['month','Bu oy'],['quarter','3 oy'],['year','Bu yil']].map(([val, label]) => (
            <button key={val} className={`period-btn ${period === val ? 'active' : ''}`} onClick={() => setPeriod(val)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card green-card">
          <div className="stat-icon-wrap"><TrendingUp size={22} /></div>
          <div>
            <p className="stat-label">Jami Kirim</p>
            <h2>{formatCurrency(stats?.income)}</h2>
          </div>
        </div>
        <div className="stat-card red-card">
          <div className="stat-icon-wrap"><TrendingDown size={22} /></div>
          <div>
            <p className="stat-label">Jami Xarajat</p>
            <h2>{formatCurrency(stats?.expense)}</h2>
          </div>
        </div>
        <div className="stat-card navy-card">
          <div className="stat-icon-wrap"><DollarSign size={22} /></div>
          <div>
            <p className="stat-label">Sof Foyda</p>
            <h2>{formatCurrency(stats?.profit)}</h2>
          </div>
        </div>
        <div className="stat-card purple-card">
          <div className="stat-icon-wrap"><Percent size={22} /></div>
          <div>
            <p className="stat-label">Foyda Foizi</p>
            <h2>{stats?.margin}%</h2>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="card chart-card">
          <h3 className="card-title">📈 Kirim vs Xarajat (oylik)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
              <Tooltip formatter={v => formatCurrency(v)} />
              <Bar dataKey="kirim" name="Kirim" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="xarajat" name="Xarajat" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 className="card-title">🥧 Xarajat kategoriyalari</h3>
          {byCat.length === 0 ? <p className="empty-msg">Ma'lumot yo'q</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h3 className="card-title">🕐 Oxirgi Tranzaksiyalar</h3>
        {recent.length === 0 ? <p className="empty-msg">Hali yozuv yo'q</p> : (
          <div className="recent-list">
            {recent.map(t => (
              <div key={t.id} className="recent-item">
                <span className={`type-dot ${t.type === 'income' ? 'green' : 'red'}`} />
                <div className="recent-info">
                  <strong>{t.note || t.category}</strong>
                  <small>{DEPT_LABELS[t.department]} · {t.transaction_date}</small>
                </div>
                <span className={`recent-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

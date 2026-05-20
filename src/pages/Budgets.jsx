import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, EXPENSE_CATEGORIES, DEPARTMENTS } from '../lib/constants'
import { Target, Check, AlertCircle, Copy } from 'lucide-react'

export default function BudgetsPage() {
  const { profile, can } = useAuth()
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState([])
  const [expenses, setExpenses] = useState({})
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [dept, setDept] = useState(DEPARTMENTS.MARKETING)

  // Editing state
  const [editCat, setEditCat] = useState(null)
  const [editLimit, setEditLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => { fetchBudgets() }, [month, dept])

  const fetchBudgets = async () => {
    setLoading(true)
    
    // 1. Fetch budgets for this month and dept
    const { data: bgData } = await supabase
      .from('budgets')
      .select('*')
      .eq('month_year', month)
      .eq('department', dept)
      
    // 2. Fetch ACTUAL expenses for this month and dept
    const startDate = `${month}-01`
    const [y, m] = month.split('-')
    const nextMonth = new Date(y, m, 1).toISOString().split('T')[0]
    
    const { data: exData } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('type', 'expense')
      .eq('department', dept)
      .gte('transaction_date', startDate)
      .lt('transaction_date', nextMonth)
      .is('deleted_at', null)

    const actExpenses = {}
    ;(exData || []).forEach(t => {
      actExpenses[t.category] = (actExpenses[t.category] || 0) + t.amount
    })
    setExpenses(actExpenses)

    // Map all expense categories and merge with fetched budgets
    const mapped = EXPENSE_CATEGORIES.map(cat => {
      const existing = (bgData || []).find(b => b.category === cat.id)
      return {
        id: existing?.id || null,
        category: cat.id,
        label: cat.label,
        limit_amount: existing?.limit_amount || 0,
        actual: actExpenses[cat.id] || 0
      }
    }).sort((a, b) => b.limit_amount - a.limit_amount) // limitsizlarni pastga
    
    setBudgets(mapped)
    setLoading(false)
  }

  const handleSave = async (catId) => {
    setSaving(true)
    const numLimit = parseInt(editLimit.replace(/\D/g, ''), 10) || 0

    const { error } = await supabase.from('budgets').upsert({
      month_year: month,
      department: dept,
      category: catId,
      limit_amount: numLimit,
      created_by: profile.id
    }, { onConflict: 'month_year,department,category' })

    setSaving(false)
    if (error) {
      alert("Xatolik: " + error.message)
    } else {
      setEditCat(null)
      fetchBudgets()
    }
  }

  const copyFromPreviousMonth = async () => {
    if (!window.confirm("Oldingi oy byudjetini ushbu oyga ko'chirishni xohlaysizmi? Ushbu oydagi barcha limitlar ustidan yoziladi.")) return
    
    setCopying(true)
    const [y, m] = month.split('-')
    let prevMonth = new Date(y, m - 2, 1).toISOString().slice(0, 7) // m is 1-indexed string in Date, but doing math is tricky. 
    // Safest way:
    const d = new Date(y, parseInt(m) - 1, 1) // current month
    d.setMonth(d.getMonth() - 1)
    prevMonth = d.toISOString().slice(0, 7)

    const { data: prevBudgets } = await supabase
      .from('budgets')
      .select('category, limit_amount')
      .eq('month_year', prevMonth)
      .eq('department', dept)

    if (!prevBudgets || prevBudgets.length === 0) {
      alert("Oldingi oyda byudjet kiritilmagan.")
      setCopying(false)
      return
    }

    const inserts = prevBudgets.map(b => ({
      month_year: month,
      department: dept,
      category: b.category,
      limit_amount: b.limit_amount,
      created_by: profile.id
    }))

    const { error } = await supabase.from('budgets').upsert(inserts, { onConflict: 'month_year,department,category' })
    
    setCopying(false)
    if (error) alert("Xato: " + error.message)
    else fetchBudgets()
  }

  const totalBudget = budgets.reduce((s, b) => s + b.limit_amount, 0)
  const totalActual = budgets.reduce((s, b) => s + b.actual, 0)
  const totalPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
  const isTotalOver = totalPercent > 100

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Target size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Byudjet Limitlari</h1>
          <p>Kategoriyalar bo'yicha oylik maksimal xarajat limitini belgilang</p>
        </div>
        {can('manageUsers') && (
          <button className="btn-secondary" onClick={copyFromPreviousMonth} disabled={copying}>
            <Copy size={15}/> {copying ? "Ko'chirilmoqda..." : "Oldingi oydan nusxalash"}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Oy</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Bo'lim</label>
          <select value={dept} onChange={e => setDept(e.target.value)}>
            <option value={DEPARTMENTS.MARKETING}>📣 Marketing</option>
            <option value={DEPARTMENTS.OQUV}>🎓 O'quv Markaz</option>
          </select>
        </div>
      </div>

      <div className="summary-row" style={{ marginBottom: 24 }}>
        <div className="summary-item">
          <span className="summary-label">Belgilangan Byudjet</span>
          <span className="sum-income" style={{ color: '#3b82f6' }}>{formatCurrency(totalBudget)}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">Haqiqatda Sarflandi</span>
          <span className="sum-expense">{formatCurrency(totalActual)}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">Holat</span>
          <span className="sum-profit" style={{ color: isTotalOver ? '#ef4444' : '#10b981' }}>
            {totalPercent.toFixed(1)}% {isTotalOver ? 'Oshib ketdi' : 'Norma'}
          </span>
        </div>
      </div>

      <div className="card no-pad">
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <div className="table-responsive">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Kategoriya</th>
                  <th>Haqiqatda ishlangan</th>
                  <th>Byudjet Limiti</th>
                  <th>Holat</th>
                  {can('manageUsers') && <th style={{ textAlign: 'center' }}>Sozlash</th>}
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => {
                  const percent = b.limit_amount > 0 ? (b.actual / b.limit_amount) * 100 : 0
                  const isOver = percent > 100
                  const isWarning = percent > 85 && !isOver

                  return (
                    <tr key={b.category}>
                      <td><strong>{b.label}</strong></td>
                      <td style={{ color: '#ef4444', fontWeight: 500 }}>{formatCurrency(b.actual)}</td>
                      <td>
                        {editCat === b.category ? (
                          <input 
                            type="text"
                            autoFocus
                            value={editLimit}
                            onChange={e => setEditLimit(e.target.value.replace(/\D/g, ''))}
                            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', width: 120 }}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: b.limit_amount > 0 ? '#1e40af' : '#94a3b8' }}>
                            {b.limit_amount > 0 ? formatCurrency(b.limit_amount) : 'Cheklanmagan'}
                          </span>
                        )}
                      </td>
                      <td>
                        {b.limit_amount > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', minWidth: 100 }}>
                              <div style={{ 
                                width: `${Math.min(percent, 100)}%`, 
                                height: '100%', 
                                background: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981' 
                              }}/>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: isOver ? '#ef4444' : '#64748b' }}>
                              {Math.round(percent)}%
                            </span>
                            {isOver && <AlertCircle size={14} color="#ef4444" title="Limitdan oshib ketdi!" />}
                            {isWarning && <AlertCircle size={14} color="#f59e0b" title="Limitga yaqinlashdi" />}
                          </div>
                        )}
                      </td>
                      {can('manageUsers') && (
                        <td style={{ textAlign: 'center' }}>
                          {editCat === b.category ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditCat(null)}>Bekor</button>
                              <button className="btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleSave(b.category)} disabled={saving}>
                                <Check size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '4px 10px', fontSize: 12 }} 
                              onClick={() => { setEditCat(b.category); setEditLimit(String(b.limit_amount)) }}
                            >
                              O'zgartirish
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

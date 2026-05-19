import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, DEPT_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth]     = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM
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

  // Calculate summaries
  const oquvIncome = data.filter(t => t.department === 'oquv' && t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const oquvExpense = data.filter(t => t.department === 'oquv' && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  
  const mktIncome = data.filter(t => t.department === 'marketing' && t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const mktExpense = data.filter(t => t.department === 'marketing' && t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Chart data
  const deptData = [
    { name: DEPT_LABELS.oquv, Kirim: oquvIncome, Xarajat: oquvExpense },
    { name: DEPT_LABELS.marketing, Kirim: mktIncome, Xarajat: mktExpense }
  ]

  const handleExport = () => {
    // Basic export for current month
    const rows = data.map(t => ({
      'Sana': t.transaction_date,
      'Tur': t.type === 'income' ? 'Kirim' : 'Xarajat',
      "Bo'lim": DEPT_LABELS[t.department] || t.department,
      'Kategoriya': (t.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).find(c => c.id === t.category)?.label || t.category,
      'Summa': t.amount
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, month)
    XLSX.writeFile(wb, `Mizan_Hisobot_${month}.xlsx`)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📑 Hisobotlar</h1>
          <p>Oylik va bo'limlar bo'yicha tahlil</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="month-picker"
          />
          <button className="btn-export" onClick={handleExport}>
            <Download size={15}/> Export
          </button>
        </div>
      </div>

      {loading ? <div className="full-center"><div className="spinner"/></div> : (
        <>
          <div className="charts-row">
            {/* O'quv Markaz */}
            <div className="card">
              <h3 className="card-title">{DEPT_LABELS.oquv}</h3>
              <div className="summary-row" style={{ marginTop: 15, marginBottom: 15 }}>
                <span className="sum-income">Kirim: {formatCurrency(oquvIncome)}</span>
                <span className="sum-expense">Xarajat: {formatCurrency(oquvExpense)}</span>
              </div>
              <div className="sum-profit positive" style={{ padding: 10, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
                Foyda: {formatCurrency(oquvIncome - oquvExpense)}
              </div>
            </div>

            {/* Marketing */}
            <div className="card">
              <h3 className="card-title">{DEPT_LABELS.marketing}</h3>
              <div className="summary-row" style={{ marginTop: 15, marginBottom: 15 }}>
                <span className="sum-income">Kirim: {formatCurrency(mktIncome)}</span>
                <span className="sum-expense">Xarajat: {formatCurrency(mktExpense)}</span>
              </div>
              <div className="sum-profit positive" style={{ padding: 10, textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>
                Foyda: {formatCurrency(mktIncome - mktExpense)}
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <h3 className="card-title">Bo'limlar solishtirmasi ({month})</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Kirim" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Xarajat" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

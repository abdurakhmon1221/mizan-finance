import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts'
import { FileText, Printer, Download } from 'lucide-react'
import { formatCurrency } from '../lib/constants'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [monthStr, setMonthStr] = useState(new Date().toISOString().slice(0, 7))
  
  // Data
  const [multiMonthData, setMultiMonthData] = useState([])
  const [monthlyStats, setMonthlyStats] = useState({ income: 0, expense: 0, profit: 0 })
  const [taxes, setTaxes] = useState({ yatt: 0, inps: 0, social: 0, netProfit: 0 })
  const [courseProfitability, setCourseProfitability] = useState([])

  useEffect(() => { fetchReportData() }, [monthStr])

  const fetchReportData = async () => {
    setLoading(true)

    // 1. Fetch all transactions for the year to build multi-month comparison
    const currentYear = monthStr.slice(0, 4)
    const { data: yearTxns } = await supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .is('deleted_at', null)
      .like('transaction_date', `${currentYear}%`)

    const mMap = {}
    for (let i = 1; i <= 12; i++) {
      const m = `${currentYear}-${String(i).padStart(2, '0')}`
      mMap[m] = { month: m, kirim: 0, xarajat: 0 }
    }
    
    ;(yearTxns || []).forEach(t => {
      const m = t.transaction_date.slice(0, 7)
      if (mMap[m]) {
        if (t.type === 'income') mMap[m].kirim += t.amount
        if (t.type === 'expense') mMap[m].xarajat += t.amount
      }
    })
    
    setMultiMonthData(Object.values(mMap).filter(m => m.kirim > 0 || m.xarajat > 0 || m.month <= monthStr))

    // 2. Fetch specific month stats
    const monthTxns = (yearTxns || []).filter(t => t.transaction_date.startsWith(monthStr))
    const inc = monthTxns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0)
    const exp = monthTxns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0)
    const prof = inc - exp
    setMonthlyStats({ income: inc, expense: exp, profit: prof })

    // Advanced Taxes
    // Aytaylik, YaTT (4%), INPS (0.1% ish haqidan, sodda qilib jami tushumdan 1% deymiz), Ijtimoiy soliq (BHM 1 barobar = 340k)
    const yatt = inc * 0.04
    const inps = inc * 0.01 // Sodda taxmin
    const social = 340000 
    setTaxes({
      yatt,
      inps,
      social,
      netProfit: prof - (yatt + inps + social)
    })

    // 3. Course Profitability
    const { data: stData } = await supabase.from('students').select('id, group_id')
    const { data: grData } = await supabase.from('groups').select('id, name, teacher_id')
    const { data: tchData } = await supabase.from('teachers').select('id, base_salary, salary_type')
    const { data: incTxns } = await supabase.from('transactions').select('amount, student_id').eq('type', 'income').like('transaction_date', `${monthStr}%`)
    const { data: expTxns } = await supabase.from('transactions').select('amount, teacher_id').eq('type', 'expense').like('transaction_date', `${monthStr}%`)

    // Calculate group income
    const groupIncome = {}
    ;(incTxns || []).forEach(t => {
      if (!t.student_id) return
      const st = (stData || []).find(s => s.id === t.student_id)
      if (st && st.group_id) {
        groupIncome[st.group_id] = (groupIncome[st.group_id] || 0) + t.amount
      }
    })

    // Map to course profitability
    const profitability = (grData || []).map(g => {
      const gInc = groupIncome[g.id] || 0
      
      // Calculate salary cost for this group
      let gCost = 0
      const tch = (tchData || []).find(t => t.id === g.teacher_id)
      if (tch) {
        if (tch.salary_type === 'percentage') {
          gCost = (gInc * tch.base_salary) / 100
        } else {
          // Fixed salary cost needs to be divided among their groups, or we just assign fixed cost directly.
          // For simplicity, if fixed, we assume it's cost. But since we need profitability per group,
          // let's just see how many groups they have.
          const tchGroups = (grData || []).filter(x => x.teacher_id === tch.id).length
          gCost = tchGroups > 0 ? tch.base_salary / tchGroups : tch.base_salary
        }
      }
      
      const gProf = gInc - gCost
      const margin = gInc > 0 ? (gProf / gInc) * 100 : 0

      return {
        name: g.name,
        income: gInc,
        cost: gCost,
        profit: gProf,
        margin
      }
    }).filter(g => g.income > 0 || g.cost > 0).sort((a,b) => b.profit - a.profit)

    setCourseProfitability(profitability)
    setLoading(false)
  }

  const handlePrint = () => {
    const printContent = document.getElementById('report-print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif;">
        <div style="display:flex; justify-content: space-between; align-items:center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px;">
          <div>
            <h1 style="color: #1e40af; margin:0;">Mizan Finance</h1>
            <p style="color: #64748b; margin:5px 0 0 0;">Rasmiy Oylik Hisobot</p>
          </div>
          <div style="text-align: right;">
            <strong>Davr:</strong> ${monthStr}<br/>
            <strong>Sana:</strong> ${new Date().toLocaleDateString('uz-UZ')}
          </div>
        </div>
        ${printContent}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><FileText size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Hisobotlar (Kengaytirilgan)</h1>
          <p>Moliya va soliq tahlillari</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input type="month" className="input-field" value={monthStr} onChange={e => setMonthStr(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}/>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={16}/> PDF Qilish
          </button>
        </div>
      </div>

      {loading ? <div className="full-center" style={{ padding: 60 }}><div className="spinner"/></div> : (
        <div id="report-print-area">
          
          <div className="summary-row" style={{ marginBottom: 24 }}>
            <div className="summary-item">
              <span className="summary-label">Jami Kirim ({monthStr})</span>
              <span className="sum-income" style={{ color: '#10b981' }}>{formatCurrency(monthlyStats.income)}</span>
            </div>
            <div className="summary-divider"/>
            <div className="summary-item">
              <span className="summary-label">Jami Xarajat</span>
              <span className="sum-expense">{formatCurrency(monthlyStats.expense)}</span>
            </div>
            <div className="summary-divider"/>
            <div className="summary-item">
              <span className="summary-label">Operatsion Foyda</span>
              <span className="sum-profit" style={{ color: monthlyStats.profit > 0 ? '#3b82f6' : '#ef4444' }}>{formatCurrency(monthlyStats.profit)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Soliq Hisoboti */}
            <div className="card">
              <h3 className="card-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>📋 Soliq va Ajratmalar (Taxminiy)</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748b' }}>YaTT Solig'i (4% aylanmadan):</span>
                <strong style={{ color: '#ef4444' }}>-{formatCurrency(taxes.yatt)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748b' }}>INPS (Shaxsiy jamg'arib boriladigan pensiya):</span>
                <strong style={{ color: '#ef4444' }}>-{formatCurrency(taxes.inps)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: '#64748b' }}>Ijtimoiy Soliq (BHM 1 barobar):</span>
                <strong style={{ color: '#ef4444' }}>-{formatCurrency(taxes.social)}</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
                <strong>Sof (Net) Foyda:</strong>
                <strong style={{ color: taxes.netProfit > 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(taxes.netProfit)}</strong>
              </div>
            </div>

            {/* Oylar taqqoslamasi grafiki */}
            <div className="card">
              <h3 className="card-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>📊 Yil bo'yicha dinamika</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={multiMonthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                  <RechartsTooltip formatter={v => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="kirim" name="Kirim" fill="#10b981" radius={[2,2,0,0]} />
                  <Bar dataKey="xarajat" name="Xarajat" fill="#ef4444" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card no-pad">
            <h3 className="card-title" style={{ padding: '20px 20px 0 20px' }}>🎯 Kurslar Rentabelligi (Profitability)</h3>
            <p style={{ padding: '0 20px 16px 20px', color: '#64748b', fontSize: 14 }}>Qaysi guruh eng ko'p sof foyda keltirayotganini tahlil qiling</p>
            <div className="table-responsive">
              <table className="txn-table">
                <thead>
                  <tr>
                    <th>Guruh Nomi</th>
                    <th style={{ textAlign: 'right' }}>Kirim (Tushum)</th>
                    <th style={{ textAlign: 'right' }}>Xarajat (Maosh)</th>
                    <th style={{ textAlign: 'right' }}>Sof Foyda</th>
                    <th style={{ textAlign: 'center' }}>Rentabellik (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {courseProfitability.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.name}</strong></td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(c.income)}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatCurrency(c.cost)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: c.profit > 0 ? '#3b82f6' : '#64748b' }}>{formatCurrency(c.profit)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: c.margin > 50 ? '#d1fae5' : (c.margin > 20 ? '#fef3c7' : '#fee2e2'),
                          color: c.margin > 50 ? '#059669' : (c.margin > 20 ? '#d97706' : '#e11d48')
                        }}>
                          {c.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {courseProfitability.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Ma'lumot topilmadi</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

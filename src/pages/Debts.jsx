import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { BookOpen, Check } from 'lucide-react'

function RepayModal({ creditorName, dept, onClose, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState(`Qarz qaytarildi (${creditorName})`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount) return alert('Summani kiriting')
    setSaving(true)

    const payload = {
      type: 'expense',
      amount: numAmount,
      category: 'qarz_qaytarish',
      department: dept || 'oquv',
      payment_method: 'cash',
      note: note.trim(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_by: profile.id,
      paid_by: profile.full_name,
      third_party_name: creditorName,
      is_third_party: true
    }

    const { error } = await supabase.from('transactions').insert(payload)
    setSaving(false)
    if (error) return alert('Xatolik: ' + error.message)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>💰 Qarz qaytarish</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Kreditor: <strong>{creditorName}</strong></p>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>Qaytarilayotgan summa *</label>
          <input
            type="text"
            inputMode="numeric"
            value={parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('uz-UZ')}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}
          />
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 24 }}>
          <label>Izoh</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Bekor</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Check size={16}/> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DebtsPage() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [repayCreditor, setRepayCreditor] = useState(null)

  useEffect(() => { fetchDebts() }, [])

  const fetchDebts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('is_third_party', true)
      .not('third_party_name', 'is', null)

    const txns = data || []
    
    // Group by creditor
    const grouped = {}
    txns.forEach(t => {
      const name = t.third_party_name.trim()
      if (!grouped[name]) {
        grouped[name] = { name, totalBorrowed: 0, totalRepaid: 0, lastDept: t.department }
      }
      
      // If it's a debt payment method (we borrowed money or bought something on credit)
      if (t.payment_method === 'debt' && t.type === 'expense') {
        grouped[name].totalBorrowed += t.amount
      } 
      // If it's an expense but category is qarz_qaytarish (we repaid)
      else if (t.category === 'qarz_qaytarish' && t.type === 'expense') {
        grouped[name].totalRepaid += t.amount
      }
      // Note: We can expand this logic if they loan money to others (income side)
    })

    const finalDebts = Object.values(grouped).map(g => ({
      ...g,
      balance: g.totalBorrowed - g.totalRepaid
    })).filter(g => g.totalBorrowed > 0) // Only show if we actually borrowed

    setDebts(finalDebts)
    setLoading(false)
  }

  const totalBalance = debts.reduce((s, d) => s + d.balance, 0)

  return (
    <div className="page">
      {repayCreditor && (
        <RepayModal
          creditorName={repayCreditor.name}
          dept={repayCreditor.lastDept}
          onClose={() => setRepayCreditor(null)}
          onSaved={fetchDebts}
        />
      )}

      <div className="page-header">
        <div>
          <h1><BookOpen size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Qarzlar Daftari</h1>
          <p>Kreditorlar va to'lanishi kerak bo'lgan summalar</p>
        </div>
      </div>

      <div className="summary-row" style={{ marginBottom: 24 }}>
        <div className="summary-item">
          <span className="summary-label">Jami olingan qarz</span>
          <span className="sum-expense" style={{ color: '#64748b' }}>{formatCurrency(debts.reduce((s, d) => s + d.totalBorrowed, 0))}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">Jami qaytarilgan</span>
          <span className="sum-income">{formatCurrency(debts.reduce((s, d) => s + d.totalRepaid, 0))}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">Hozirgi Qarzdorlik</span>
          <span className="sum-expense">{formatCurrency(totalBalance)}</span>
        </div>
      </div>

      <div className="card no-pad">
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Kreditor (Shaxs / Tashkilot)</th>
                <th style={{ textAlign: 'right' }}>Olingan</th>
                <th style={{ textAlign: 'right' }}>Qaytarilgan</th>
                <th style={{ textAlign: 'right' }}>Qoldiq (Qarzimiz)</th>
                <th style={{ textAlign: 'center' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((d, i) => (
                <tr key={i} style={{ opacity: d.balance === 0 ? 0.6 : 1 }}>
                  <td><strong>{d.name}</strong> {d.balance === 0 && <span className="status-badge active" style={{ marginLeft: 8 }}>Uzildi</span>}</td>
                  <td style={{ textAlign: 'right', color: '#64748b' }}>{formatCurrency(d.totalBorrowed)}</td>
                  <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(d.totalRepaid)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: d.balance > 0 ? '#ef4444' : '#64748b' }}>
                    {formatCurrency(d.balance)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {d.balance > 0 && (
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setRepayCreditor(d)}>
                        💰 Qaytarish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {debts.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Qarzlar mavjud emas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

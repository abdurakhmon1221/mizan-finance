import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { BookOpen, Check, AlertCircle, Plus, X } from 'lucide-react'

function AddDebtModal({ type, onClose, onSaved }) {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!name.trim() || !numAmount) return alert("Ism va summani kiriting")
    setSaving(true)

    // type === 'creditor' -> Biz qarz olyapmiz (yoki nasiyaga narsa olyapmiz).
    // Buni kirim (qarz oldik) deb yozish ham mumkin, yoki xarajat (nasiya) deb yozish mumkin.
    // Tizim mantiqi: payment_method='debt' and type='expense' => Nasiyaga xizmat/tovar oldik
    
    // Yoki soddaroq qilib yangi logika:
    // Creditor (Bizning qarz) -> income (Kassa ko'paydi) + payment_method='debt'
    // Debtor (Boshqalar qarzi) -> expense (Kassa kamaydi) + payment_method='debt'
    
    // Lekin avvalgi logikaga moslashtiramiz:
    const payload = {
      type: type === 'creditor' ? 'expense' : 'income',
      amount: numAmount,
      category: type === 'creditor' ? 'xarid_qarzga' : 'sotuv_qarzga',
      department: 'oquv',
      payment_method: 'debt',
      note: note.trim() || (type === 'creditor' ? 'Qarzga olindi' : 'Qarzga berildi'),
      transaction_date: new Date().toISOString().split('T')[0],
      due_date: dueDate || null,
      created_by: profile.id,
      third_party_name: name.trim(),
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
        <div className="edit-modal-header">
          <h3>{type === 'creditor' ? '💰 Qarz Olish (Nasiya)' : '🤝 Qarz Berish (Nasiya)'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16, marginTop: 16 }}>
          <label>Shaxs yoki Tashkilot nomi *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} />
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>Summa (so'm) *</label>
          <input
            type="text"
            inputMode="numeric"
            value={parseInt(amount.replace(/\D/g, '') || '0').toLocaleString('uz-UZ')}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}
          />
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>Qaytarish muddati</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} />
        </div>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 24 }}>
          <label>Izoh</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} />
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

function RepayModal({ debt, type, onClose, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(String(debt.balance))
  const [note, setNote] = useState(type === 'creditor' ? `Qarz qaytarildi (${debt.name})` : `Qarz undirildi (${debt.name})`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount) return alert('Summani kiriting')
    setSaving(true)

    // Creditorga qarz qaytarish = Xarajat (biz pul beramiz)
    // Debitordan qarz undirish = Kirim (biz pul olamiz)
    const payload = {
      type: type === 'creditor' ? 'expense' : 'income',
      amount: numAmount,
      category: 'qarz_qaytarish',
      department: debt.lastDept || 'oquv',
      payment_method: 'cash',
      note: note.trim(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_by: profile.id,
      third_party_name: debt.name,
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
        <h3 style={{ marginBottom: 16 }}>{type === 'creditor' ? '💰 Qarzni Qaytarish' : '📥 Qarzni Undirish'}</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Shaxs: <strong>{debt.name}</strong></p>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>Summa *</label>
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
  const [debts, setDebts] = useState({ creditors: [], debtors: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('creditors') // 'creditors' | 'debtors'
  
  const [repayDebt, setRepayDebt] = useState(null)
  const [showAddDebt, setShowAddDebt] = useState(false)

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
    
    const credGroup = {} // We owe them
    const debtGroup = {} // They owe us

    txns.forEach(t => {
      const name = t.third_party_name.trim()
      
      // Creditor logic (Bizning qarz)
      // Biz ulardan narsa oldik nasiyaga
      if (t.payment_method === 'debt' && t.type === 'expense') {
        if (!credGroup[name]) credGroup[name] = { name, totalBorrowed: 0, totalRepaid: 0, lastDept: t.department, dueDate: t.due_date }
        credGroup[name].totalBorrowed += t.amount
        if (t.due_date && (!credGroup[name].dueDate || t.due_date > credGroup[name].dueDate)) {
          credGroup[name].dueDate = t.due_date
        }
      }
      else if (t.category === 'qarz_qaytarish' && t.type === 'expense') {
        if (!credGroup[name]) credGroup[name] = { name, totalBorrowed: 0, totalRepaid: 0, lastDept: t.department }
        credGroup[name].totalRepaid += t.amount
      }

      // Debtor logic (Boshqalar qarzi)
      // Biz ularga qarzga sotdik
      if (t.payment_method === 'debt' && t.type === 'income') {
        if (!debtGroup[name]) debtGroup[name] = { name, totalBorrowed: 0, totalRepaid: 0, lastDept: t.department, dueDate: t.due_date }
        debtGroup[name].totalBorrowed += t.amount
        if (t.due_date && (!debtGroup[name].dueDate || t.due_date > debtGroup[name].dueDate)) {
          debtGroup[name].dueDate = t.due_date
        }
      }
      else if (t.category === 'qarz_qaytarish' && t.type === 'income') {
        if (!debtGroup[name]) debtGroup[name] = { name, totalBorrowed: 0, totalRepaid: 0, lastDept: t.department }
        debtGroup[name].totalRepaid += t.amount
      }
    })

    const creditors = Object.values(credGroup).map(g => ({ ...g, balance: g.totalBorrowed - g.totalRepaid })).filter(g => g.totalBorrowed > 0)
    const debtors = Object.values(debtGroup).map(g => ({ ...g, balance: g.totalBorrowed - g.totalRepaid })).filter(g => g.totalBorrowed > 0)

    setDebts({ creditors, debtors })
    setLoading(false)
  }

  const activeList = tab === 'creditors' ? debts.creditors : debts.debtors
  const totalBalance = activeList.reduce((s, d) => s + d.balance, 0)

  const isOverdue = (dateStr) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div className="page">
      {repayDebt && (
        <RepayModal
          debt={repayDebt}
          type={tab === 'creditors' ? 'creditor' : 'debtor'}
          onClose={() => setRepayDebt(null)}
          onSaved={fetchDebts}
        />
      )}

      {showAddDebt && (
        <AddDebtModal
          type={tab === 'creditors' ? 'creditor' : 'debtor'}
          onClose={() => setShowAddDebt(false)}
          onSaved={fetchDebts}
        />
      )}

      <div className="page-header">
        <div>
          <h1><BookOpen size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Qarzlar Daftari</h1>
          <p>Kreditorlar va Debitorlar bilan hisob-kitob</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddDebt(true)}>
          <Plus size={15}/> Yangi Qarz Qo'shish
        </button>
      </div>

      <div className="period-tabs" style={{ marginBottom: 20 }}>
        <button className={`period-btn ${tab === 'creditors' ? 'active' : ''}`} onClick={() => setTab('creditors')}>
          Bizning Qarzlar (Kreditor)
        </button>
        <button className={`period-btn ${tab === 'debtors' ? 'active' : ''}`} onClick={() => setTab('debtors')}>
          Boshqalar Qarzi (Debitor)
        </button>
      </div>

      <div className="summary-row" style={{ marginBottom: 24 }}>
        <div className="summary-item">
          <span className="summary-label">{tab === 'creditors' ? 'Jami qarz olganmiz' : 'Jami qarz berganmiz'}</span>
          <span className="sum-expense" style={{ color: '#64748b' }}>{formatCurrency(activeList.reduce((s, d) => s + d.totalBorrowed, 0))}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">{tab === 'creditors' ? 'Qaytarib berdik' : 'Qaytarib oldik'}</span>
          <span className="sum-income">{formatCurrency(activeList.reduce((s, d) => s + d.totalRepaid, 0))}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">{tab === 'creditors' ? 'Qarzdormiz (Qoldiq)' : 'Bizga Berishlari Kerak'}</span>
          <span className="sum-expense" style={{ color: tab === 'creditors' ? '#ef4444' : '#10b981' }}>{formatCurrency(totalBalance)}</span>
        </div>
      </div>

      <div className="card no-pad">
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Shaxs / Tashkilot</th>
                <th>Muddat</th>
                <th style={{ textAlign: 'right' }}>Umumiy Summa</th>
                <th style={{ textAlign: 'right' }}>Qaytarildi</th>
                <th style={{ textAlign: 'right' }}>Qoldiq</th>
                <th style={{ textAlign: 'center' }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {activeList.map((d, i) => {
                const overdue = d.balance > 0 && isOverdue(d.dueDate)
                return (
                  <tr key={i} style={{ opacity: d.balance <= 0 ? 0.6 : 1 }}>
                    <td>
                      <strong>{d.name}</strong> 
                      {d.balance <= 0 && <span className="status-badge active" style={{ marginLeft: 8 }}>Uzildi</span>}
                    </td>
                    <td>
                      {d.dueDate ? (
                        <span style={{ color: overdue ? '#ef4444' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {overdue && <AlertCircle size={14}/>} {d.dueDate}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>{formatCurrency(d.totalBorrowed)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatCurrency(d.totalRepaid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: d.balance > 0 ? (tab === 'creditors' ? '#ef4444' : '#10b981') : '#64748b' }}>
                      {formatCurrency(d.balance)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {d.balance > 0 && (
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setRepayDebt(d)}>
                          💰 {tab === 'creditors' ? 'Qaytarish' : 'Undirish'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {activeList.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Qarzlar mavjud emas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

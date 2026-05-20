import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, DEPT_LABELS } from '../lib/constants'
import { Wallet, Search, Filter, Trash2, Eye, ShieldAlert } from 'lucide-react'

function DeleteModal({ txn, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false)
  const handleConfirm = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', txn.id)
    setSaving(false)
    if (error) alert(error.message)
    else { onConfirm(); onClose(); }
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>O'chirishni tasdiqlang</h3>
        <p style={{ margin: '16px 0', color: '#64748b' }}>Siz rostdan ham ushbu tranzaksiyani bekor qilmoqchimisiz? (Mablag' kassadan qaytariladi)</p>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <strong>{formatCurrency(txn.amount)}</strong> — {txn.note || txn.category}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Bekor</button>
          <button className="btn-primary" style={{ background: '#ef4444' }} onClick={handleConfirm} disabled={saving}>
            O'chirish
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { profile, can } = useAuth()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false) // Audit Trail uchun
  const [delTxn, setDelTxn] = useState(null)

  useEffect(() => { fetchTxns() }, [showDeleted])

  const fetchTxns = async () => {
    setLoading(true)
    let query = supabase
      .from('transactions')
      .select('*, profiles:created_by(full_name)')
      .order('created_at', { ascending: false })

    // Agar o'chirilganlarni ko'rmoqchi bo'lmasak, ularni yashiramiz
    if (!showDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data } = await query
    setTxns(data || [])
    setLoading(false)
  }

  const filtered = txns.filter(t => {
    const matchType = filterType === 'all' || t.type === filterType
    const text = `${t.category} ${t.note} ${t.payment_method} ${t.third_party_name || ''} ${t.profiles?.full_name || ''}`.toLowerCase()
    const matchSearch = text.includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="page">
      {delTxn && <DeleteModal txn={delTxn} onClose={() => setDelTxn(null)} onConfirm={fetchTxns} />}

      <div className="page-header">
        <div>
          <h1><Wallet size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Kassa Harakati (Audit Log)</h1>
          <p>Barcha kirim, xarajat va tahrirlar tarixi</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Qidirish</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Izoh, kategoriya yoki xodim izlash..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Turi</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Barchasi</option>
            <option value="income">Kirim</option>
            <option value="expense">Xarajat</option>
          </select>
        </div>
        {can('manageUsers') && (
          <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              className={`btn-secondary ${showDeleted ? 'active' : ''}`} 
              onClick={() => setShowDeleted(!showDeleted)}
              title="O'chirilgan operatsiyalarni ham ko'rish (Audit)"
              style={{ background: showDeleted ? '#fee2e2' : '', color: showDeleted ? '#ef4444' : '', borderColor: showDeleted ? '#fca5a5' : '' }}
            >
              <ShieldAlert size={16}/> {showDeleted ? "O'chirilganlarni bekitish" : "O'chirilganlarni ko'rsatish"}
            </button>
          </div>
        )}
      </div>

      <div className="card no-pad">
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <div className="table-responsive">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Sana & Vaqt</th>
                  <th>Kategoriya & Izoh</th>
                  <th>Bo'lim & Usul</th>
                  <th>Kiritdi / Xodim</th>
                  <th style={{ textAlign: 'right' }}>Summa</th>
                  <th style={{ textAlign: 'center' }}>Hujjat</th>
                  {can('deleteTransaction') && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const isDeleted = !!t.deleted_at
                  return (
                    <tr key={t.id} style={{ opacity: isDeleted ? 0.6 : 1, background: isDeleted ? '#f8fafc' : 'white' }}>
                      <td>
                        <div style={{ textDecoration: isDeleted ? 'line-through' : 'none' }}>{t.transaction_date}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(t.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <strong style={{ textDecoration: isDeleted ? 'line-through' : 'none' }}>{t.category}</strong>
                        {t.note && <div style={{ fontSize: 12, color: '#64748b' }}>{t.note}</div>}
                        {t.third_party_name && <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 500 }}>👤 {t.third_party_name}</div>}
                        {isDeleted && <span className="status-badge inactive" style={{ marginTop: 4 }}>O'chirilgan ({new Date(t.deleted_at).toLocaleDateString()})</span>}
                      </td>
                      <td>
                        <div>{DEPT_LABELS[t.department] || t.department}</div>
                        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{t.payment_method}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                            {t.profiles?.full_name?.[0] || '?'}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>{t.profiles?.full_name || 'Noma\'lum'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: isDeleted ? '#94a3b8' : (t.type === 'income' ? '#10b981' : '#0f172a'), textDecoration: isDeleted ? 'line-through' : 'none' }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {t.receipt_url ? (
                          <a href={t.receipt_url} target="_blank" rel="noreferrer" className="btn-icon" title="Chekni ko'rish">
                            <Eye size={16} />
                          </a>
                        ) : '—'}
                      </td>
                      {can('deleteTransaction') && (
                        <td style={{ textAlign: 'center' }}>
                          {!isDeleted && (
                            <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => setDelTxn(t)} title="Bekor qilish">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Ma'lumot topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

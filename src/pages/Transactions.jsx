import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  formatCurrency, formatDate, getCategoryInfo,
  DEPT_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  PAYMENT_METHODS
} from '../lib/constants'
import { Search, X, Download, Trash2, Eye, Edit3, Check, ChevronDown } from 'lucide-react'
import * as XLSX from 'xlsx'

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ txn, onClose, onSaved }) {
  const [amount, setAmount]     = useState(String(txn.amount))
  const [note, setNote]         = useState(txn.note || '')
  const [date, setDate]         = useState(txn.transaction_date)
  const [dept, setDept]         = useState(txn.department)
  const [category, setCategory] = useState(txn.category)
  const [payMethod, setPayMethod] = useState(txn.payment_method || 'cash')
  const [thirdParty, setThirdParty] = useState(txn.third_party_name || '')
  const [saving, setSaving]     = useState(false)

  const cats = txn.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount) return alert('Summani kiriting')
    setSaving(true)
    const { error } = await supabase.from('transactions').update({
      amount: numAmount,
      note: note.trim(),
      transaction_date: date,
      department: dept,
      category,
      payment_method: payMethod,
      is_third_party: payMethod === 'debt' && !!thirdParty,
      third_party_name: payMethod === 'debt' ? thirdParty : null,
    }).eq('id', txn.id)
    setSaving(false)
    if (error) return alert('Xatolik: ' + error.message)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-modal" onClick={e => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>✏️ Tahrirlash</h3>
          <button className="btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="form-grid" style={{ gap: 16 }}>
          <div className="form-group full-width">
            <label>Summa (so'm) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={parseInt(amount.replace(/\D/g,'') || '0').toLocaleString('uz-UZ')}
              onChange={e => setAmount(e.target.value.replace(/\D/g,''))}
            />
          </div>

          <div className="form-group">
            <label>Kategoriya</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Bo'lim</label>
            <select value={dept} onChange={e => setDept(e.target.value)}>
              {Object.entries(DEPT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>To'lov usuli</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Sana</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {payMethod === 'debt' && (
            <div className="form-group full-width">
              <label>Kreditor ismi (3-chi shaxs)</label>
              <input
                type="text"
                value={thirdParty}
                onChange={e => setThirdParty(e.target.value)}
                placeholder="Masalan: Bobur aka"
              />
            </div>
          )}

          <div className="form-group full-width">
            <label>Izoh</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Izoh kiriting"
              maxLength={200}
            />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Bekor</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <Check size={15}/> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const { profile, can } = useAuth()
  const [txns, setTxns]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterDept, setFilterDept] = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [previewImg, setPreviewImg] = useState(null)
  const [deleteId, setDeleteId]     = useState(null)
  const [editTxn, setEditTxn]       = useState(null)

  const isOwner = profile?.role === 'owner'

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })

    if (!isOwner) q = q.eq('created_by', profile?.id)
    if (filterType !== 'all') q = q.eq('type', filterType)
    if (filterDept !== 'all') q = q.eq('department', filterDept)
    if (dateFrom) q = q.gte('transaction_date', dateFrom)
    if (dateTo)   q = q.lte('transaction_date', dateTo)

    const { data } = await q
    setTxns(data || [])
    setLoading(false)
  }, [filterType, filterDept, dateFrom, dateTo, profile, isOwner])

  useEffect(() => { fetchTxns() }, [fetchTxns])

  const filtered = txns.filter(t =>
    (t.note || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.third_party_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const handleDelete = async () => {
    await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId)
    setDeleteId(null)
    fetchTxns()
  }

  const handleExport = () => {
    const rows = filtered.map(t => ({
      'Sana': t.transaction_date,
      'Tur': t.type === 'income' ? 'Kirim' : 'Xarajat',
      "Bo'lim": DEPT_LABELS[t.department] || t.department,
      'Kategoriya': getCategoryInfo(t.category, t.type).label,
      'Izoh': t.note || '',
      "To'lov usuli": t.payment_method || '',
      'Kreditor': t.third_party_name || '',
      'Summa': t.amount,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tranzaksiyalar')
    XLSX.writeFile(wb, `Mizan_${new Date().toLocaleDateString('uz-UZ')}.xlsx`)
  }

  const clearFilters = () => {
    setFilterType('all'); setFilterDept('all')
    setDateFrom(''); setDateTo(''); setSearch('')
  }
  const hasFilters = filterType !== 'all' || filterDept !== 'all' || dateFrom || dateTo || search

  return (
    <div className="page">
      {/* ── Image Preview Modal ── */}
      {previewImg && (
        <div className="modal-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-modal" onClick={e => e.stopPropagation()}>
            <button className="img-modal-close" onClick={() => setPreviewImg(null)}><X size={18}/></button>
            <img src={previewImg} alt="chek" />
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>🗑️ Bu yozuvni o'chirmoqchimisiz?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteId(null)}>Bekor</button>
              <button className="btn-danger" onClick={handleDelete}>O'chirish</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTxn && (
        <EditModal
          txn={editTxn}
          onClose={() => setEditTxn(null)}
          onSaved={fetchTxns}
        />
      )}

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1>🧾 Tranzaksiyalar</h1>
          <p>{filtered.length} ta yozuv</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={15}/> Excel
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15}/>
          <input
            type="text"
            placeholder="Izoh, kategoriya yoki kreditor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={13}/></button>}
        </div>

        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Tur: Barchasi</option>
          <option value="income">Kirim</option>
          <option value="expense">Xarajat</option>
        </select>

        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Bo'lim: Barchasi</option>
          <option value="oquv">🎓 O'quv Markaz</option>
          <option value="marketing">📣 Marketing</option>
        </select>

        <div className="date-range-group">
          <label className="date-label">Dan:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>

        <div className="date-range-group">
          <label className="date-label">Gacha:</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>

        {hasFilters && (
          <button className="btn-icon danger" onClick={clearFilters} title="Filtrlarni tozalash">
            <X size={14}/> Tozalash
          </button>
        )}
      </div>

      {/* ── Summary Row ── */}
      <div className="summary-row">
        <div className="summary-item">
          <span className="summary-label">💚 Kirim</span>
          <span className="sum-income">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">🔴 Xarajat</span>
          <span className="sum-expense">{formatCurrency(totalExpense)}</span>
        </div>
        <div className="summary-divider"/>
        <div className="summary-item">
          <span className="summary-label">💰 Balans</span>
          <span className={`sum-profit ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(totalIncome - totalExpense)}
          </span>
        </div>
      </div>

      {/* ── Table / Cards ── */}
      {loading ? <div className="full-center"><div className="spinner"/></div> : (
        <>
          {/* Desktop table */}
          <div className="card no-pad desktop-only">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Tur</th>
                  <th>Bo'lim</th>
                  <th>Kategoriya</th>
                  <th>Izoh / Kreditor</th>
                  <th style={{ textAlign: 'right' }}>Summa</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const cat = getCategoryInfo(t.category, t.type)
                  return (
                    <tr key={t.id}>
                      <td className="date-cell">{formatDate(t.transaction_date)}</td>
                      <td><span className={`type-badge ${t.type}`}>{t.type === 'income' ? 'Kirim' : 'Xarajat'}</span></td>
                      <td><span className="dept-badge">{DEPT_LABELS[t.department]}</span></td>
                      <td><span className="cat-dot-badge" style={{ background: cat.color + '22', color: cat.color }}>{cat.label}</span></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{t.note || '—'}</div>
                        {t.third_party_name && (
                          <small className="third-party-tag">📝 {t.third_party_name} (qarz)</small>
                        )}
                      </td>
                      <td className={`amount-cell ${t.type}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td>
                        <div className="action-btns">
                          {t.receipt_url && (
                            <button className="btn-icon" onClick={() => setPreviewImg(t.receipt_url)} title="Chekni ko'rish">
                              <Eye size={14}/>
                            </button>
                          )}
                          {isOwner && (
                            <button className="btn-icon" onClick={() => setEditTxn(t)} title="Tahrirlash">
                              <Edit3 size={14}/>
                            </button>
                          )}
                          {can('deleteTransaction') && (
                            <button className="btn-icon danger" onClick={() => setDeleteId(t.id)} title="O'chirish">
                              <Trash2 size={14}/>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Yozuv topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="txn-cards mobile-only">
            {filtered.map(t => {
              const cat = getCategoryInfo(t.category, t.type)
              return (
                <div key={t.id} className="txn-card">
                  <div className="txn-card-top">
                    <span className={`type-badge ${t.type}`}>{t.type === 'income' ? 'Kirim' : 'Xarajat'}</span>
                    <span className={`txn-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                  <div className="txn-card-body">
                    <div className="txn-cat" style={{ color: cat.color }}>{cat.label}</div>
                    <div className="txn-note">{t.note || t.category}</div>
                    {t.third_party_name && <div className="third-party-tag">📝 {t.third_party_name} (qarz)</div>}
                    <div className="txn-meta">{DEPT_LABELS[t.department]} · {formatDate(t.transaction_date)}</div>
                  </div>
                  <div className="txn-card-actions">
                    {t.receipt_url && <button className="btn-icon" onClick={() => setPreviewImg(t.receipt_url)}><Eye size={14}/> Chek</button>}
                    {isOwner && <button className="btn-icon" onClick={() => setEditTxn(t)}><Edit3 size={14}/> Tahrir</button>}
                    {can('deleteTransaction') && <button className="btn-icon danger" onClick={() => setDeleteId(t.id)}><Trash2 size={14}/></button>}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && <div className="empty-state"><p>Yozuv topilmadi</p></div>}
          </div>
        </>
      )}
    </div>
  )
}

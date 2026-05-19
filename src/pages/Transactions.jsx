import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDate, getCategoryInfo, DEPT_LABELS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../lib/constants'
import { Search, X, Download, Trash2, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function TransactionsPage() {
  const { profile, can } = useAuth()
  const [txns, setTxns]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [filterDept, setFilterDept]   = useState('all')
  const [filterCat, setFilterCat]     = useState('all')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [previewImg, setPreviewImg]   = useState(null)
  const [deleteId, setDeleteId]       = useState(null)

  const isOwner = profile?.role === 'owner'

  const fetchTxns = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false })

    if (!isOwner) q = q.eq('created_by', profile?.id)
    if (filterType !== 'all')  q = q.eq('type', filterType)
    if (filterDept !== 'all')  q = q.eq('department', filterDept)
    if (filterCat  !== 'all')  q = q.eq('category', filterCat)
    if (dateFrom) q = q.gte('transaction_date', dateFrom)
    if (dateTo)   q = q.lte('transaction_date', dateTo)

    const { data } = await q
    setTxns(data || [])
    setLoading(false)
  }, [filterType, filterDept, filterCat, dateFrom, dateTo, profile, isOwner])

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

  const allCats = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

  return (
    <div className="page">
      {previewImg && (
        <div className="modal-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-modal" onClick={e => e.stopPropagation()}>
            <button className="img-modal-close" onClick={() => setPreviewImg(null)}><X size={18}/></button>
            <img src={previewImg} alt="chek" />
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>Bu yozuvni o'chirmoqchimisiz?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteId(null)}>Bekor</button>
              <button className="btn-danger" onClick={handleDelete}>O'chirish</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>🧾 Tranzaksiyalar</h1>
          <p>{filtered.length} ta yozuv</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={15}/> Excel
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={15}/>
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)}/>
          {search && <button onClick={() => setSearch('')}><X size={13}/></button>}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Hammasi</option>
          <option value="income">Kirim</option>
          <option value="expense">Xarajat</option>
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Barcha bo'limlar</option>
          <option value="oquv">🎓 O'quv Markaz</option>
          <option value="marketing">📣 Marketing</option>
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Boshlanish sanasi"/>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Tugash sanasi"/>
      </div>

      {/* Summary row */}
      <div className="summary-row">
        <span className="sum-income">💚 Kirim: {formatCurrency(totalIncome)}</span>
        <span className="sum-expense">🔴 Xarajat: {formatCurrency(totalExpense)}</span>
        <span className={`sum-profit ${totalIncome - totalExpense >= 0 ? 'positive' : 'negative'}`}>
          💰 Balans: {formatCurrency(totalIncome - totalExpense)}
        </span>
      </div>

      {/* Cards (mobile) / Table (desktop) */}
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
                  <th>Summa</th>
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
                        <div>{t.note || '—'}</div>
                        {t.third_party_name && <small className="third-party-tag">📝 {t.third_party_name} (qarz)</small>}
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
                    <span className={`txn-amount ${t.type}`}>{t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}</span>
                  </div>
                  <div className="txn-card-body">
                    <div className="txn-cat" style={{ color: cat.color }}>{cat.label}</div>
                    <div className="txn-note">{t.note || t.category}</div>
                    {t.third_party_name && <div className="third-party-tag">📝 {t.third_party_name} (qarz)</div>}
                    <div className="txn-meta">{DEPT_LABELS[t.department]} · {formatDate(t.transaction_date)}</div>
                  </div>
                  <div className="txn-card-actions">
                    {t.receipt_url && <button className="btn-icon" onClick={() => setPreviewImg(t.receipt_url)}><Eye size={14}/> Chek</button>}
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

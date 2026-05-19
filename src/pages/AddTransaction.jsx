import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, DEPARTMENTS,
  DEPT_LABELS, PAYMENT_METHODS, formatCurrency
} from '../lib/constants'
import { Check, X, Camera } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

export default function AddTransactionPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [type, setType]             = useState('income')
  const [amount, setAmount]         = useState('')
  const [category, setCategory]     = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS.OQUV)
  const [payMethod, setPayMethod]   = useState('cash')
  const [note, setNote]             = useState('')
  const [date, setDate]             = useState(today())
  const [paidBy, setPaidBy]         = useState(profile?.full_name || '')
  const [thirdParty, setThirdParty] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [success, setSuccess]       = useState(false)

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setReceiptFile(f)
    setReceiptPreview(URL.createObjectURL(f))
  }

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setAmount(raw)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!category) { alert('Kategoriyani tanlang'); return }
    const numAmount = parseInt(amount, 10)
    if (!numAmount || numAmount <= 0) { alert('Summani kiriting'); return }

    setLoading(true)

    let receiptUrl = null

    // Upload receipt if exists
    if (receiptFile) {
      const ext  = receiptFile.name.split('.').pop()
      const path = `receipts/${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, receiptFile, { cacheControl: '3600', upsert: false })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
        receiptUrl = urlData?.publicUrl
      }
    }

    const payload = {
      type,
      amount: numAmount,
      category,
      department,
      payment_method: payMethod,
      note: note.trim(),
      transaction_date: date,
      created_by: profile.id,
      receipt_url: receiptUrl,
      paid_by: payMethod === 'debt' ? (thirdParty || paidBy) : paidBy,
      is_third_party: payMethod === 'debt' && !!thirdParty,
      third_party_name: payMethod === 'debt' ? thirdParty : null,
    }

    const { error } = await supabase.from('transactions').insert(payload)
    setLoading(false)

    if (error) { alert('Xatolik: ' + error.message); return }

    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setAmount('')
      setCategory('')
      setNote('')
      setReceiptFile(null)
      setReceiptPreview(null)
      setThirdParty('')
      setDate(today())
    }, 1500)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{type === 'income' ? '💚 Kirim Qo\'shish' : '🔴 Xarajat Qo\'shish'}</h1>
          <p>Yangi moliyaviy yozuv kiriting</p>
        </div>
      </div>

      {/* Type toggle */}
      <div className="type-toggle">
        <button className={`toggle-btn ${type === 'income' ? 'income-active' : ''}`} onClick={() => { setType('income'); setCategory('') }}>
          💚 Kirim
        </button>
        <button className={`toggle-btn ${type === 'expense' ? 'expense-active' : ''}`} onClick={() => { setType('expense'); setCategory('') }}>
          🔴 Xarajat
        </button>
      </div>

      <form className="transaction-form" onSubmit={handleSubmit}>
        {success && <div className="success-alert">✅ Muvaffaqiyatli saqlandi!</div>}

        <div className="form-grid">
          {/* Summa */}
          <div className="form-group full-width">
            <label>Summa (so'm) *</label>
            <div className="amount-input-wrap">
              <input
                type="text"
                inputMode="numeric"
                value={amount ? parseInt(amount).toLocaleString('uz-UZ') : ''}
                onChange={handleAmountChange}
                placeholder="0"
                className="amount-input"
                required
              />
              {amount && <span className="amount-hint">{formatCurrency(parseInt(amount))}</span>}
            </div>
          </div>

          {/* Kategoriya */}
          <div className="form-group">
            <label>Kategoriya *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} required>
              <option value="">— Tanlang —</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {/* Bo'lim */}
          <div className="form-group">
            <label>Bo'lim *</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              {Object.entries(DEPT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            {department === 'marketing' && (
              <small className="field-hint">📣 Marketing xarajati umumiy hisobda ham aks etadi</small>
            )}
          </div>

          {/* To'lov usuli */}
          <div className="form-group">
            <label>To'lov usuli *</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          {/* 3-chi shaxs (faqat qarz bo'lsa) */}
          {payMethod === 'debt' && (
            <div className="form-group">
              <label>Kreditor ismi (3-chi shaxs)</label>
              <input
                type="text"
                value={thirdParty}
                onChange={e => setThirdParty(e.target.value)}
                placeholder="Masalan: Bobur aka"
              />
              {thirdParty && (
                <small className="field-hint warning-hint">
                  ⚠️ Korxona {thirdParty}ga qarzdor bo'ladi
                </small>
              )}
            </div>
          )}

          {/* Sana */}
          <div className="form-group">
            <label>Sana *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          {/* Izoh */}
          <div className="form-group full-width">
            <label>Izoh</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Masalan: Aprel oyining ijara to'lovi"
              maxLength={200}
            />
          </div>

          {/* Chek / Hujjat */}
          <div className="form-group full-width">
            <label>📸 Chek / Hujjat rasmi</label>
            <div className="receipt-upload">
              {receiptPreview ? (
                <div className="receipt-preview-wrap">
                  <img src={receiptPreview} alt="chek" className="receipt-preview-img" />
                  <button type="button" className="receipt-remove" onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="receipt-upload-btn">
                  <Camera size={20} />
                  <span>Rasm yuklash yoki suratga olish</span>
                  <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            <X size={16} /> Bekor
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Check size={16} /> {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </div>
  )
}

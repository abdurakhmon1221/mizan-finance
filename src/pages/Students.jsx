import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { GraduationCap, UserPlus, Check, X, CreditCard } from 'lucide-react'

// ── Pay Modal ─────────────────────────────────────────────────────────────────
function PayModal({ student, onClose, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(String(student.monthly_fee))
  const [payMethod, setPayMethod] = useState('cash')
  const [note, setNote] = useState(`${student.full_name} (${student.course_name}) oylik to'lovi`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount) return alert('Summani kiriting')
    setSaving(true)

    const payload = {
      type: 'income',
      amount: numAmount,
      category: 'kurs',
      department: 'oquv',
      payment_method: payMethod,
      note: note.trim(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_by: profile.id,
      student_id: student.id // bog'liqlik
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
        <h3 style={{ marginBottom: 16 }}>💰 To'lov qabul qilish</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>O'quvchi: <strong>{student.full_name}</strong></p>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>To'lov usuli</label>
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <option value="cash">💵 Naqd</option>
            <option value="card">💳 Karta (Terminal)</option>
            <option value="bank">🏦 Bank (Click/Payme)</option>
          </select>
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
            <Check size={16}/> {saving ? 'Saqlanmoqda...' : 'Qabul qilish'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { can } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [payStudent, setPayStudent] = useState(null)
  const [search, setSearch] = useState('')

  // Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [course, setCourse] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    // Supabase orqali o'quvchilarni va ularning oxirgi to'lovlarini olish
    const { data: stData, error } = await supabase
      .from('students')
      .select('*, transactions(amount, transaction_date)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    // Har bir o'quvchi uchun jami to'langan summani va oxirgi to'lov sanasini hisoblaymiz
    const formatted = stData.map(st => {
      const txns = st.transactions || []
      const totalPaid = txns.reduce((s, t) => s + t.amount, 0)
      const lastPayment = txns.length > 0 
        ? txns.sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0].transaction_date
        : null
      return { ...st, totalPaid, lastPayment }
    })

    setStudents(formatted)
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const numFee = parseInt(fee.replace(/\D/g, ''), 10)

    const { error } = await supabase.from('students').insert({
      full_name: fullName,
      phone,
      course_name: course,
      monthly_fee: numFee
    })

    setSaving(false)
    if (error) return alert("Xatolik: " + error.message)
    
    setFullName(''); setPhone(''); setCourse(''); setFee('')
    setShowForm(false)
    fetchStudents()
  }

  const toggleActive = async (id, current) => {
    await supabase.from('students').update({ is_active: !current }).eq('id', id)
    fetchStudents()
  }

  const filtered = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    (s.course_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      {payStudent && (
        <PayModal student={payStudent} onClose={() => setPayStudent(null)} onSaved={fetchStudents} />
      )}

      <div className="page-header">
        <div>
          <h1><GraduationCap size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> O'quvchilar</h1>
          <p>{filtered.length} ta ro'yxatga olingan</p>
        </div>
        {(can('manageUsers') || can('addTransaction')) && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <UserPlus size={15}/> Yangi qo'shish
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Yangi O'quvchi</h3>
          <form onSubmit={handleCreate} className="form-grid">
            <div className="form-group">
              <label>F.I.O *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Aliyev Vali"/>
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 123 45 67"/>
            </div>
            <div className="form-group">
              <label>Kurs nomi</label>
              <input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="Ingliz tili (IELTS)"/>
            </div>
            <div className="form-group">
              <label>Oylik to'lov summasi *</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={fee ? parseInt(fee.replace(/\D/g,'')).toLocaleString('uz-UZ') : ''}
                onChange={e => setFee(e.target.value)} 
                required 
                placeholder="400,000"
              />
            </div>
            <div className="form-group full-width" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card no-pad">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <input 
            type="text" 
            placeholder="Ism yoki kurs bo'yicha qidirish..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
        
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <div className="table-responsive">
            <table className="txn-table">
              <thead>
                <tr>
                  <th>F.I.O</th>
                  <th>Kurs / Telefon</th>
                  <th>Oylik To'lov</th>
                  <th>Jami to'lagan</th>
                  <th>Oxirgi to'lov</th>
                  <th style={{ textAlign: 'center' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
                    <td>
                      <strong>{s.full_name}</strong>
                      {!s.is_active && <span className="status-badge inactive" style={{ marginLeft: 8 }}>Nofaol</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.course_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{s.phone || '—'}</div>
                    </td>
                    <td style={{ color: '#1e40af', fontWeight: 600 }}>{formatCurrency(s.monthly_fee)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(s.totalPaid)}</td>
                    <td style={{ fontSize: 13 }}>{s.lastPayment || <span style={{color: '#ef4444'}}>To'lamagan</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {s.is_active && can('addTransaction') && (
                          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13, background: '#10b981' }} onClick={() => setPayStudent(s)}>
                            <CreditCard size={14} style={{ marginRight: 4 }}/> To'lov
                          </button>
                        )}
                        {(can('manageUsers') || can('deleteTransaction')) && (
                          <button 
                            className={`btn-secondary ${s.is_active ? '' : 'active'}`} 
                            style={{ padding: '6px 12px', fontSize: 13 }} 
                            onClick={() => toggleActive(s.id, s.is_active)}
                          >
                            {s.is_active ? "To'xtatish" : "Faollashtirish"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>O'quvchilar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

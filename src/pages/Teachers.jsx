import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { Presentation, UserPlus, Check, Banknote } from 'lucide-react'

// ── Pay Modal ─────────────────────────────────────────────────────────────────
function PayModal({ teacher, onClose, onSaved }) {
  const { profile } = useAuth()
  
  // Default amount to the remaining balance (expected - paid)
  const defaultAmount = teacher.expectedSalary > teacher.thisMonthPaid 
    ? String(teacher.expectedSalary - teacher.thisMonthPaid)
    : String(teacher.base_salary) // fallback if fixed or negative

  const [amount, setAmount] = useState(defaultAmount)
  const [payMethod, setPayMethod] = useState('cash')
  const [note, setNote] = useState(`${teacher.full_name} (${teacher.subject}) oylik maosh / avans`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ''), 10)
    if (!numAmount) return alert('Summani kiriting')
    setSaving(true)

    const payload = {
      type: 'expense',
      amount: numAmount,
      category: 'maosh',
      department: 'oquv',
      payment_method: payMethod,
      note: note.trim(),
      transaction_date: new Date().toISOString().split('T')[0],
      created_by: profile.id,
      teacher_id: teacher.id
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
        <h3 style={{ marginBottom: 16 }}>💰 Maosh / Avans to'lash</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Xodim: <strong>{teacher.full_name}</strong></p>

        <div className="form-group" style={{ textAlign: 'left', marginBottom: 16 }}>
          <label>To'lov usuli</label>
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}>
            <option value="cash">💵 Naqd</option>
            <option value="card">💳 Karta o'tkazma</option>
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
            <Check size={16}/> {saving ? 'Saqlanmoqda...' : 'To\'lash'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeachersPage() {
  const { can } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [payTeacher, setPayTeacher] = useState(null)
  const [search, setSearch] = useState('')

  // Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [salaryType, setSalaryType] = useState('fixed')
  const [baseSalary, setBaseSalary] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTeachers() }, [])

  const fetchTeachers = async () => {
    setLoading(true)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    // Fetch all needed data for calculation
    const [tchRes, stRes, grRes, txnRes] = await Promise.all([
      supabase.from('teachers').select('*, transactions(amount, transaction_date)').order('created_at', { ascending: false }),
      supabase.from('students').select('id, group_id'),
      supabase.from('groups').select('id, teacher_id'),
      supabase.from('transactions').select('amount, student_id').eq('type', 'income').like('transaction_date', `${currentMonth}%`)
    ])

    if (tchRes.error) {
      console.error(tchRes.error)
      setLoading(false)
      return
    }

    const students = stRes.data || []
    const groups = grRes.data || []
    const incomeTxns = txnRes.data || []

    // Calculate total generated income for each teacher
    const generatedIncomeByTeacher = {}
    
    incomeTxns.forEach(txn => {
      if (!txn.student_id) return
      const student = students.find(s => s.id === txn.student_id)
      if (!student || !student.group_id) return
      
      const group = groups.find(g => g.id === student.group_id)
      if (!group || !group.teacher_id) return
      
      const tId = group.teacher_id
      generatedIncomeByTeacher[tId] = (generatedIncomeByTeacher[tId] || 0) + txn.amount
    })

    const formatted = tchRes.data.map(tch => {
      const txns = tch.transactions || []
      
      // Jami barcha to'langan pullar
      const totalPaid = txns.reduce((s, t) => s + t.amount, 0)
      
      // Faqat shu oydagi to'langan pullar (avans/maosh)
      const thisMonthPaid = txns
        .filter(t => t.transaction_date.startsWith(currentMonth))
        .reduce((s, t) => s + t.amount, 0)

      const lastPayment = txns.length > 0 
        ? txns.sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0].transaction_date
        : null
        
      // Calculate expected salary
      let expectedSalary = 0
      let generatedIncome = 0
      
      if (tch.salary_type === 'percentage') {
        generatedIncome = generatedIncomeByTeacher[tch.id] || 0
        expectedSalary = (generatedIncome * tch.base_salary) / 100
      } else {
        expectedSalary = tch.base_salary
      }

      return { 
        ...tch, 
        totalPaid, 
        thisMonthPaid, 
        lastPayment, 
        expectedSalary,
        generatedIncome
      }
    })

    setTeachers(formatted)
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const numSalary = parseInt(baseSalary.replace(/\D/g, ''), 10)

    const { error } = await supabase.from('teachers').insert({
      full_name: fullName,
      phone,
      subject,
      salary_type: salaryType,
      base_salary: numSalary
    })

    setSaving(false)
    if (error) return alert("Xatolik: " + error.message)
    
    setFullName(''); setPhone(''); setSubject(''); setBaseSalary('')
    setShowForm(false)
    fetchTeachers()
  }

  const toggleActive = async (id, current) => {
    await supabase.from('teachers').update({ is_active: !current }).eq('id', id)
    fetchTeachers()
  }

  const filtered = teachers.filter(t => 
    t.full_name.toLowerCase().includes(search.toLowerCase()) || 
    (t.subject || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      {payTeacher && (
        <PayModal teacher={payTeacher} onClose={() => setPayTeacher(null)} onSaved={fetchTeachers} />
      )}

      <div className="page-header">
        <div>
          <h1><Presentation size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Xodimlar & O'qituvchilar</h1>
          <p>O'qituvchilar maoshi avtomatik hisoblanadi</p>
        </div>
        {(can('manageUsers') || can('addTransaction')) && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <UserPlus size={15}/> Yangi qo'shish
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Yangi Xodim / O'qituvchi</h3>
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
              <label>Mutaxassislik / Fan</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Matematika / SMM menejer"/>
            </div>
            <div className="form-group">
              <label>To'lov usuli</label>
              <select value={salaryType} onChange={e => setSalaryType(e.target.value)}>
                <option value="fixed">Oylik maosh (Fiks)</option>
                <option value="percentage">O'quvchidan foiz (%)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{salaryType === 'fixed' ? "Oylik maosh summasi *" : "Foiz (masalan 40) *"}</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={baseSalary ? parseInt(baseSalary.replace(/\D/g,'')).toLocaleString('uz-UZ') : ''}
                onChange={e => setBaseSalary(e.target.value)} 
                required 
                placeholder={salaryType === 'fixed' ? "5,000,000" : "40"}
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
            placeholder="Ism yoki fan bo'yicha qidirish..." 
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
                  <th>Kelishuv</th>
                  <th style={{ textAlign: 'right' }}>Kutilayotgan Maosh</th>
                  <th style={{ textAlign: 'right' }}>To'langan (Bu oy)</th>
                  <th style={{ textAlign: 'right' }}>Qoldiq</th>
                  <th style={{ textAlign: 'center' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const remaining = t.expectedSalary - t.thisMonthPaid;
                  
                  return (
                    <tr key={t.id} style={{ opacity: t.is_active ? 1 : 0.5 }}>
                      <td>
                        <strong>{t.full_name}</strong>
                        {!t.is_active && <span className="status-badge inactive" style={{ marginLeft: 8 }}>Nofaol</span>}
                        <div style={{ fontSize: 12, color: '#64748b' }}>{t.subject || '—'}</div>
                      </td>
                      <td>
                        {t.salary_type === 'percentage' 
                          ? <div>
                              <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{t.base_salary}% ulush</span>
                              <div style={{ fontSize: 11, color: '#64748b' }}>Tushum: {formatCurrency(t.generatedIncome)}</div>
                            </div>
                          : <span style={{ color: '#1e40af', fontWeight: 600 }}>{formatCurrency(t.base_salary)} fiks</span>
                        }
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(t.expectedSalary)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                        {formatCurrency(t.thisMonthPaid)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: remaining > 0 ? '#ef4444' : '#64748b' }}>
                        {remaining > 0 ? formatCurrency(remaining) : (remaining < 0 ? `+${formatCurrency(Math.abs(remaining))}` : '0')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {t.is_active && can('addTransaction') && (
                            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13, background: '#f59e0b', color: 'white' }} onClick={() => setPayTeacher(t)}>
                              <Banknote size={14} style={{ marginRight: 4 }}/> To'lash
                            </button>
                          )}
                          {(can('manageUsers') || can('deleteTransaction')) && (
                            <button 
                              className={`btn-secondary ${t.is_active ? '' : 'active'}`} 
                              style={{ padding: '6px 12px', fontSize: 13 }} 
                              onClick={() => toggleActive(t.id, t.is_active)}
                            >
                              {t.is_active ? "To'xt" : "Faol"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Xodimlar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

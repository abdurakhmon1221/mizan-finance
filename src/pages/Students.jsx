import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { GraduationCap, UserPlus, Check, X, CreditCard, Edit, FileText, Printer } from 'lucide-react'

// ── Pay Modal ─────────────────────────────────────────────────────────────────
function PayModal({ student, onClose, onSaved }) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState(String(student.monthly_fee))
  const [payMethod, setPayMethod] = useState('cash')
  const [note, setNote] = useState(`${student.full_name} (${student.groups?.name || 'Kurs'}) oylik to'lovi`)
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
      student_id: student.id
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

// ── Student Detail & Edit Modal ──────────────────────────────────────────────
function StudentDetailModal({ student, groups, onClose, onSaved }) {
  const { can } = useAuth()
  const [tab, setTab] = useState('history') // history | edit
  const [saving, setSaving] = useState(false)
  
  // Edit form state
  const [fullName, setFullName] = useState(student.full_name)
  const [phone, setPhone] = useState(student.phone || '')
  const [groupId, setGroupId] = useState(student.group_id || '')
  const [fee, setFee] = useState(String(student.monthly_fee))

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const numFee = parseInt(fee.replace(/\D/g, ''), 10)

    const { error } = await supabase.from('students').update({
      full_name: fullName,
      phone,
      group_id: groupId || null,
      monthly_fee: numFee
    }).eq('id', student.id)

    setSaving(false)
    if (error) return alert("Xatolik: " + error.message)
    onSaved()
  }

  const handlePrint = () => {
    const printContent = document.getElementById('print-area').innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif;">
        <h2 style="text-align:center; margin-bottom: 20px;">O'quvchi To'lov Tarixi</h2>
        ${printContent}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // To restore React event listeners after replacing body HTML
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h3>🎓 {student.full_name}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="period-tabs" style={{ marginBottom: 20 }}>
          <button className={`period-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            To'lov Tarixi
          </button>
          {can('manageUsers') && (
            <button className={`period-btn ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
              Tahrirlash
            </button>
          )}
        </div>

        {tab === 'history' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={handlePrint}>
                <Printer size={14} style={{ marginRight: 4 }}/> Qog'ozga chiqarish (PDF)
              </button>
            </div>
            
            <div id="print-area">
              <div style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>F.I.O:</span>
                  <strong>{student.full_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Guruh:</span>
                  <strong>{student.groups?.name || student.course_name || 'Yo\'q'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Tarif:</span>
                  <strong>{formatCurrency(student.monthly_fee)} / oy</strong>
                </div>
              </div>

              <h4 style={{ marginBottom: 12 }}>Barcha to'lovlar</h4>
              {student.transactions && student.transactions.length > 0 ? (
                <table className="txn-table" style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Sana</th>
                      <th style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Izoh</th>
                      <th style={{ textAlign: 'right', borderBottom: '1px solid #cbd5e1', padding: 8 }}>Summa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...student.transactions].sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date)).map((t, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>{t.transaction_date}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>{t.note || 'Oylik to\'lov'}</td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                          {formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>Jami to'langan:</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(student.totalPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>To'lovlar topilmadi</div>
              )}
            </div>
          </div>
        )}

        {tab === 'edit' && (
          <form onSubmit={handleUpdate} className="form-grid">
            <div className="form-group full-width" style={{ textAlign: 'left' }}>
              <label>F.I.O</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}/>
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Telefon</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}/>
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Guruh</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                <option value="">-- Tanlang --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Oylik tarif</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={parseInt(fee.replace(/\D/g,'') || '0').toLocaleString('uz-UZ')}
                onChange={e => setFee(e.target.value)} 
                required 
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
            </div>
            <div className="form-group full-width" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { can } = useAuth()
  const [students, setStudents] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [payStudent, setPayStudent] = useState(null)
  const [detailStudent, setDetailStudent] = useState(null)
  const [search, setSearch] = useState('')

  // Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [groupId, setGroupId] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { 
    fetchGroups()
    fetchStudents() 
  }, [])

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('id, name, price').eq('is_active', true)
    setGroups(data || [])
  }

  const fetchStudents = async () => {
    setLoading(true)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    
    const { data: stData, error } = await supabase
      .from('students')
      .select('*, groups(name), transactions(amount, transaction_date, note)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const formatted = stData.map(st => {
      const txns = st.transactions || []
      
      const totalPaid = txns.reduce((s, t) => s + t.amount, 0)
      const thisMonthPaid = txns
        .filter(t => t.transaction_date.startsWith(currentMonth))
        .reduce((s, t) => s + t.amount, 0)
        
      const lastPayment = txns.length > 0 
        ? txns.sort((a,b) => new Date(b.transaction_date) - new Date(a.transaction_date))[0].transaction_date
        : null
        
      let payStatus = 'red'
      let statusText = 'To\'lamagan'
      
      if (thisMonthPaid >= st.monthly_fee) {
        payStatus = 'green'
        statusText = 'To\'lagan'
      } else if (thisMonthPaid > 0) {
        payStatus = 'yellow'
        statusText = 'Qisman'
      }
      
      return { 
        ...st, 
        totalPaid, 
        thisMonthPaid, 
        lastPayment, 
        payStatus, 
        statusText 
      }
    })

    setStudents(formatted)
    setLoading(false)
  }

  useEffect(() => {
    if (groupId) {
      const g = groups.find(x => x.id === groupId)
      if (g) setFee(String(g.price))
    }
  }, [groupId, groups])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const numFee = parseInt(fee.replace(/\D/g, ''), 10)

    const { error } = await supabase.from('students').insert({
      full_name: fullName,
      phone,
      group_id: groupId || null,
      course_name: '',
      monthly_fee: numFee
    })

    setSaving(false)
    if (error) return alert("Xatolik: " + error.message)
    
    setFullName(''); setPhone(''); setGroupId(''); setFee('')
    setShowForm(false)
    fetchStudents()
  }

  const toggleActive = async (id, current, e) => {
    e.stopPropagation()
    await supabase.from('students').update({ is_active: !current }).eq('id', id)
    fetchStudents()
  }

  const filtered = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase()) || 
    (s.groups?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.course_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const renderStatusBadge = (status, text, paid) => {
    const colors = {
      red: { bg: '#fee2e2', color: '#ef4444' },
      yellow: { bg: '#fef3c7', color: '#d97706' },
      green: { bg: '#d1fae5', color: '#10b981' }
    }
    const c = colors[status]
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, color: c.color, padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
        {text}
        {status === 'yellow' && ` (${formatCurrency(paid)})`}
      </div>
    )
  }

  return (
    <div className="page">
      {payStudent && (
        <PayModal student={payStudent} onClose={() => setPayStudent(null)} onSaved={fetchStudents} />
      )}
      {detailStudent && (
        <StudentDetailModal 
          student={detailStudent} 
          groups={groups} 
          onClose={() => setDetailStudent(null)} 
          onSaved={() => { setDetailStudent(null); fetchStudents(); }} 
        />
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
              <label>Guruh (Kurs)</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">-- Tanlang --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
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
            placeholder="Ism yoki guruh bo'yicha qidirish..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
          />
        </div>
        
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <div className="table-responsive">
            <table className="txn-table table-hover">
              <thead>
                <tr>
                  <th>F.I.O</th>
                  <th>Guruh / Telefon</th>
                  <th>Bu Oydagi To'lov</th>
                  <th>Jami to'lagan</th>
                  <th>Oxirgi to'lov</th>
                  <th style={{ textAlign: 'center' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5, cursor: 'pointer' }} onClick={() => setDetailStudent(s)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{s.full_name}</strong>
                        {!s.is_active && <span className="status-badge inactive">Nofaol</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.groups?.name || s.course_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{s.phone || '—'}</div>
                    </td>
                    <td>
                      {s.is_active ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          {renderStatusBadge(s.payStatus, s.statusText, s.thisMonthPaid)}
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Tarif: {formatCurrency(s.monthly_fee)}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Nofaol</span>
                      )}
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(s.totalPaid)}</td>
                    <td style={{ fontSize: 13 }}>{s.lastPayment || <span style={{color: '#ef4444'}}>To'lamagan</span>}</td>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {s.is_active && can('addTransaction') && (
                          <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 13, background: '#10b981', minWidth: 80 }} onClick={() => setPayStudent(s)}>
                            <CreditCard size={14} style={{ marginRight: 4 }}/> To'lov
                          </button>
                        )}
                        {(can('manageUsers') || can('deleteTransaction')) && (
                          <button 
                            className={`btn-secondary ${s.is_active ? '' : 'active'}`} 
                            style={{ padding: '6px 12px', fontSize: 13, minWidth: 80 }} 
                            onClick={(e) => toggleActive(s.id, s.is_active, e)}
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

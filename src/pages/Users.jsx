import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, ROLE_LABELS, DEPT_LABELS } from '../lib/constants'
import { UserPlus, Edit3, Power } from 'lucide-react'

export default function UsersPage() {
  const { profile } = useAuth()
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // New user form
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [role, setRole]           = useState(ROLES.ADMIN)
  const [dept, setDept]           = useState('all')
  const [tempPass, setTempPass]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  const genPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
    let p = ''
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
    setTempPass(p)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!tempPass) { alert('Parol generatsiya qiling'); return }
    setSaving(true)
    setMsg('')

    // Create auth user via Supabase Admin (using service role would be needed for production)
    // For now, use signUp and immediately create profile
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password: tempPass,
      options: { data: { full_name: fullName } }
    })

    if (authErr) { setMsg('Xatolik: ' + authErr.message); setSaving(false); return }

    // Insert profile
    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
      department: dept,
      is_active: true,
    })

    if (profErr) { setMsg('Profil xatoligi: ' + profErr.message); setSaving(false); return }

    setMsg(`✅ Foydalanuvchi yaratildi! Parol: ${tempPass} (bir marta ko'rsatiladi, eslab qoling!)`)
    setFullName(''); setEmail(''); setTempPass(''); setRole(ROLES.ADMIN); setDept('all')
    fetchUsers()
    setSaving(false)
  }

  const toggleActive = async (userId, isActive) => {
    await supabase.from('profiles').update({ is_active: !isActive }).eq('id', userId)
    fetchUsers()
  }

  const changeRole = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchUsers()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👥 Foydalanuvchilar</h1>
          <p>{users.length} ta foydalanuvchi</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <UserPlus size={16}/> Yangi
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Yangi Foydalanuvchi</h3>
          {msg && <div className={msg.startsWith('✅') ? 'success-alert' : 'error-alert'}>{msg}</div>}
          <form onSubmit={handleCreateUser} className="form-grid">
            <div className="form-group">
              <label>Ism Familiya *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Masalan: Sherali Rahimov"/>
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="sherali@mizan.uz"/>
            </div>
            <div className="form-group">
              <label>Rol *</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value={ROLES.ADMIN}>Admin (Reception)</option>
                <option value={ROLES.ACCOUNTANT}>Accountant (Buxgalter)</option>
                <option value={ROLES.OWNER}>Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label>Bo'lim</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
                <option value="all">Hammasi</option>
                <option value="oquv">O'quv Markaz</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>Vaqtinchalik Parol *</label>
              <div className="pass-row">
                <input type="text" value={tempPass} onChange={e => setTempPass(e.target.value)} placeholder="Parol kiritng yoki generatsiya qiling" required/>
                <button type="button" className="btn-secondary" onClick={genPassword}>Generatsiya</button>
              </div>
              <small className="field-hint">⚠️ Bu parolni foydalanuvchiga yuboring. Keyinroq ko'rinmaydi!</small>
            </div>
            <div className="form-group full-width">
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Yaratilmoqda...' : 'Yaratish'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="card no-pad">
        {loading ? <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div> : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Ism</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Bo'lim</th>
                <th>Status</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td><strong>{u.full_name}</strong></td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}
                      className="inline-select"
                      disabled={u.id === profile?.id}
                    >
                      {Object.entries(ROLES).map(([, val]) => (
                        <option key={val} value={val}>{ROLE_LABELS[val]}</option>
                      ))}
                    </select>
                  </td>
                  <td>{u.department === 'all' ? 'Hammasi' : DEPT_LABELS[u.department] || u.department}</td>
                  <td><span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Faol' : 'Nofaol'}</span></td>
                  <td>
                    {u.id !== profile?.id && (
                      <button className={`btn-icon ${u.is_active ? 'danger' : ''}`} onClick={() => toggleActive(u.id, u.is_active)} title={u.is_active ? "O'chirish" : 'Faollashtirish'}>
                        <Power size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

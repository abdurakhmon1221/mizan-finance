import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, ROLE_LABELS, DEPT_LABELS } from '../lib/constants'
import { UserPlus, Power, ShieldCheck, RefreshCw, Copy, Check } from 'lucide-react'

const ROLE_COLORS = {
  owner:      { bg: '#fef3c7', color: '#92400e', label: '👑 Owner' },
  admin:      { bg: '#dbeafe', color: '#1e40af', label: '🛡️ Admin' },
  accountant: { bg: '#d1fae5', color: '#065f46', label: '📊 Buxgalter' },
}

export default function UsersPage() {
  const { profile } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied]   = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [role, setRole]         = useState(ROLES.ADMIN)
  const [dept, setDept]         = useState('all')
  const [tempPass, setTempPass] = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState({ text: '', ok: true })

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
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
    setTempPass(p)
  }

  const copyPass = () => {
    navigator.clipboard.writeText(tempPass)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ✅ Foydalanuvchi yaratish — hozirgi sessionni buzmaydigan usul
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!tempPass) { setMsg({ text: '⚠️ Avval parol generatsiya qiling', ok: false }); return }
    setSaving(true)
    setMsg({ text: '', ok: true })

    // Hozirgi adminning session ma'lumotlarini saqlab olamiz
    const { data: { session: currentSession } } = await supabase.auth.getSession()

    // Yangi foydalanuvchini ro'yxatdan o'tkazamiz
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password: tempPass,
      options: { data: { full_name: fullName } }
    })

    if (authErr) {
      setMsg({ text: 'Xatolik: ' + authErr.message, ok: false })
      setSaving(false)
      return
    }

    // Hozirgi adminning sessionini qayta tiklash
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      })
    }

    // Profil yaratish
    const { error: profErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role,
      department: dept,
      is_active: true,
    })

    if (profErr) {
      setMsg({ text: 'Profil xatoligi: ' + profErr.message, ok: false })
      setSaving(false)
      return
    }

    setMsg({
      text: `✅ "${fullName}" yaratildi! Parolni saqlang: ${tempPass}`,
      ok: true
    })
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
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const changeDept = async (userId, newDept) => {
    await supabase.from('profiles').update({ department: newDept }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, department: newDept } : u))
  }

  const isOwner = profile?.role === ROLES.OWNER

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👥 Foydalanuvchilar</h1>
          <p>{users.length} ta foydalanuvchi ro'yxatda</p>
        </div>
        {isOwner && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setMsg({ text: '', ok: true }) }}>
            <UserPlus size={16}/> Yangi qo'shish
          </button>
        )}
      </div>

      {/* ===== Yangi foydalanuvchi formasi ===== */}
      {showForm && isOwner && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Yangi Foydalanuvchi Yaratish</h3>

          {msg.text && (
            <div className={msg.ok ? 'success-alert' : 'error-alert'} style={{ marginBottom: 16 }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="form-grid">
            <div className="form-group">
              <label>Ism Familiya *</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Masalan: Sherali Rahimov"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="sherali@mizan.uz"
              />
            </div>

            <div className="form-group">
              <label>Rol *</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value={ROLES.OWNER}>👑 Owner (Barcha huquqlar)</option>
                <option value={ROLES.ADMIN}>🛡️ Admin (Reception)</option>
                <option value={ROLES.ACCOUNTANT}>📊 Buxgalter (Faqat ko'rish)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Bo'lim</label>
              <select value={dept} onChange={e => setDept(e.target.value)}>
                <option value="all">🏢 Hammasi</option>
                <option value="oquv">🎓 O'quv Markaz</option>
                <option value="marketing">📣 Marketing</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Vaqtinchalik Parol *</label>
              <div className="pass-row">
                <input
                  type="text"
                  value={tempPass}
                  onChange={e => setTempPass(e.target.value)}
                  placeholder="Parol kiriting yoki generatsiya qiling"
                  required
                />
                <button type="button" className="btn-secondary" onClick={genPassword}>
                  <RefreshCw size={14}/> Generatsiya
                </button>
                {tempPass && (
                  <button type="button" className="btn-secondary" onClick={copyPass}>
                    {copied ? <Check size={14}/> : <Copy size={14}/>}
                    {copied ? 'Nusxalandi!' : 'Nusxalash'}
                  </button>
                )}
              </div>
              <small className="field-hint">
                ⚠️ Bu parolni foydalanuvchiga yuboring. Keyinroq ko'rinmaydi!
              </small>
            </div>

            <div className="form-group full-width">
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Yaratilmoqda...' : <><UserPlus size={14}/> Yaratish</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ===== Foydalanuvchilar jadvali ===== */}
      <div className="card no-pad">
        {loading ? (
          <div className="full-center" style={{ padding: 40 }}><div className="spinner"/></div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="txn-table desktop-only">
              <thead>
                <tr>
                  <th>Ism</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Bo'lim</th>
                  <th>Status</th>
                  {isOwner && <th>Amallar</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.45 }}>
                    <td>
                      <strong>{u.full_name}</strong>
                      {u.id === profile?.id && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#6366f1', fontWeight: 600 }}>(Siz)</span>
                      )}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{u.email}</td>
                    <td>
                      {isOwner && u.id !== profile?.id ? (
                        <select
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          className="inline-select"
                          style={{
                            background: ROLE_COLORS[u.role]?.bg,
                            color: ROLE_COLORS[u.role]?.color,
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 6,
                            padding: '4px 8px',
                          }}
                        >
                          {Object.entries(ROLES).map(([, val]) => (
                            <option key={val} value={val}>{ROLE_LABELS[val]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="role-badge" style={{
                          background: ROLE_COLORS[u.role]?.bg,
                          color: ROLE_COLORS[u.role]?.color,
                        }}>
                          {ROLE_COLORS[u.role]?.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {isOwner && u.id !== profile?.id ? (
                        <select
                          value={u.department || 'all'}
                          onChange={e => changeDept(u.id, e.target.value)}
                          className="inline-select"
                        >
                          <option value="all">🏢 Hammasi</option>
                          <option value="oquv">🎓 O'quv</option>
                          <option value="marketing">📣 Marketing</option>
                        </select>
                      ) : (
                        <span>{u.department === 'all' ? '🏢 Hammasi' : DEPT_LABELS[u.department] || u.department}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    {isOwner && (
                      <td>
                        {u.id !== profile?.id && (
                          <button
                            className={`btn-icon ${u.is_active ? 'danger' : ''}`}
                            onClick={() => toggleActive(u.id, u.is_active)}
                            title={u.is_active ? "O'chirish" : 'Faollashtirish'}
                          >
                            <Power size={14}/>
                            {u.is_active ? " O'chirish" : ' Faollashtirish'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="mobile-only" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users.map(u => (
                <div key={u.id} className="card" style={{ opacity: u.is_active ? 1 : 0.45, margin: 0, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <strong>{u.full_name}</strong>
                      {u.id === profile?.id && <span style={{ marginLeft: 6, fontSize: 11, color: '#6366f1' }}>(Siz)</span>}
                    </div>
                    <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="role-badge" style={{
                      background: ROLE_COLORS[u.role]?.bg,
                      color: ROLE_COLORS[u.role]?.color,
                    }}>
                      {ROLE_COLORS[u.role]?.label}
                    </span>
                    {isOwner && u.id !== profile?.id && (
                      <>
                        <select
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          className="inline-select"
                          style={{ fontSize: 12 }}
                        >
                          {Object.entries(ROLES).map(([, val]) => (
                            <option key={val} value={val}>{ROLE_LABELS[val]}</option>
                          ))}
                        </select>
                        <button
                          className={`btn-icon ${u.is_active ? 'danger' : ''}`}
                          onClick={() => toggleActive(u.id, u.is_active)}
                          style={{ fontSize: 12 }}
                        >
                          <Power size={12}/> {u.is_active ? "O'chirish" : 'Faollashtirish'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ===== Rollar izohli jadval ===== */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="card-title"><ShieldCheck size={16}/> Rol huquqlari</h3>
        <table className="txn-table">
          <thead>
            <tr>
              <th>Imkoniyat</th>
              <th style={{ textAlign: 'center' }}>👑 Owner</th>
              <th style={{ textAlign: 'center' }}>🛡️ Admin</th>
              <th style={{ textAlign: 'center' }}>📊 Buxgalter</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Dashboard ko\'rish',         true,  true,  true],
              ['Kirim/xarajat qo\'shish',    true,  true,  false],
              ['Barcha tranzaksiyalarni ko\'rish', true, false, true],
              ['Tranzaksiyani o\'chirish',   true,  false, false],
              ['Excel export',               true,  false, true],
              ['Foydalanuvchi qo\'shish',    true,  false, false],
              ['Rol o\'zgartirish',          true,  false, false],
              ['Foydalanuvchini bloklash',   true,  false, false],
            ].map(([label, o, a, ac]) => (
              <tr key={label}>
                <td>{label}</td>
                <td style={{ textAlign: 'center' }}>{o  ? '✅' : '❌'}</td>
                <td style={{ textAlign: 'center' }}>{a  ? '✅' : '❌'}</td>
                <td style={{ textAlign: 'center' }}>{ac ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

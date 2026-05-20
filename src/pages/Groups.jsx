import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../lib/constants'
import { Users, Plus, Check } from 'lucide-react'

export default function GroupsPage() {
  const { can } = useAuth()
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  // Form
  const [name, setName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [price, setPrice] = useState('')
  const [schedule, setSchedule] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { 
    fetchTeachers()
    fetchGroups() 
  }, [])

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name')
    setTeachers(data || [])
  }

  const fetchGroups = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        teachers (full_name),
        students (count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setGroups(data || [])
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const numPrice = parseInt(price.replace(/\D/g, ''), 10)

    const payload = {
      name,
      teacher_id: teacherId || null,
      price: numPrice,
      schedule
    }

    const { error } = await supabase.from('groups').insert(payload)

    setSaving(false)
    if (error) return alert("Xatolik: " + error.message)
    
    setName(''); setTeacherId(''); setPrice(''); setSchedule('')
    setShowForm(false)
    fetchGroups()
  }

  const toggleActive = async (id, current) => {
    await supabase.from('groups').update({ is_active: !current }).eq('id', id)
    fetchGroups()
  }

  const filtered = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    (g.teachers?.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1><Users size={24} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> Guruhlar va Kurslar</h1>
          <p>{filtered.length} ta ro'yxatga olingan</p>
        </div>
        {(can('manageUsers')) && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={15}/> Yangi qo'shish
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="card-title">Yangi Guruh</h3>
          <form onSubmit={handleCreate} className="form-grid">
            <div className="form-group">
              <label>Guruh nomi *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Masalan: IELTS A1"/>
            </div>
            <div className="form-group">
              <label>O'qituvchi</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
                <option value="">-- Tanlang --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Oylik narxi *</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={price ? parseInt(price.replace(/\D/g,'')).toLocaleString('uz-UZ') : ''}
                onChange={e => setPrice(e.target.value)} 
                required 
                placeholder="400,000"
              />
            </div>
            <div className="form-group">
              <label>Dars vaqtlari</label>
              <input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="Du/Ch/Juma 15:00"/>
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
            placeholder="Guruh nomi yoki o'qituvchi bo'yicha qidirish..." 
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
                  <th>Guruh Nomi</th>
                  <th>O'qituvchi</th>
                  <th>Dars vaqti</th>
                  <th>Narxi</th>
                  <th style={{ textAlign: 'center' }}>O'quvchilar</th>
                  <th style={{ textAlign: 'center' }}>Holat</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(g => (
                  <tr key={g.id} style={{ opacity: g.is_active ? 1 : 0.5 }}>
                    <td>
                      <strong>{g.name}</strong>
                    </td>
                    <td>{g.teachers?.full_name || '—'}</td>
                    <td>{g.schedule || '—'}</td>
                    <td style={{ color: '#1e40af', fontWeight: 600 }}>{formatCurrency(g.price)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="dept-badge">{g.students?.[0]?.count || 0} ta</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {can('manageUsers') ? (
                        <button 
                          className={`btn-secondary ${g.is_active ? '' : 'active'}`} 
                          style={{ padding: '4px 10px', fontSize: 12 }} 
                          onClick={() => toggleActive(g.id, g.is_active)}
                        >
                          {g.is_active ? "To'xtatish" : "Faollashtirish"}
                        </button>
                      ) : (
                        <span className={`status-badge ${g.is_active ? 'active' : 'inactive'}`}>
                          {g.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Guruhlar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

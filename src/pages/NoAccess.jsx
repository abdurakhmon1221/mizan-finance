import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function NoAccessPage() {
  const navigate = useNavigate()
  
  return (
    <div className="full-center" style={{ flexDirection: 'column', textAlign: 'center' }}>
      <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: 16 }} />
      <h2>Ruxsat yo'q</h2>
      <p style={{ color: '#64748b', marginTop: 8, maxWidth: 300 }}>
        Sizning profilingizda bu sahifani ko'rish uchun yetarli huquq yo'q.
      </p>
      <button className="btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/')}>
        Bosh sahifaga qaytish
      </button>
    </div>
  )
}

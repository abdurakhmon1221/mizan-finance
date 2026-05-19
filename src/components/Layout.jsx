import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart2, Wallet, PlusCircle, FileText, Users, LogOut
} from 'lucide-react'
import { ROLE_LABELS } from '../lib/constants'

const navItems = [
  { to: '/',              icon: BarChart2,  label: 'Dashboard',    perm: 'viewDashboard' },
  { to: '/transactions',  icon: Wallet,     label: 'Tranzaksiyalar', perm: null },
  { to: '/add',           icon: PlusCircle, label: 'Qo\'shish',    perm: 'addTransaction' },
  { to: '/reports',       icon: FileText,   label: 'Hisobotlar',   perm: 'viewReports' },
  { to: '/users',         icon: Users,      label: 'Foydalanuvchilar', perm: 'manageUsers' },
]

export default function Layout({ children }) {
  const { profile, signOut, can } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const visibleItems = navItems.filter(item => !item.perm || can(item.perm))

  return (
    <div className="app-wrapper">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">M</div>
          <div>
            <h2>Mizan Finance</h2>
            <small>O'quv Markaz</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18}/> {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">{profile?.full_name?.[0] || 'U'}</div>
            <div>
              <p className="user-name">{profile?.full_name}</p>
              <p className="user-role">{ROLE_LABELS[profile?.role] || profile?.role}</p>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut} title="Chiqish">
            <LogOut size={16}/>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-area">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {visibleItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-nav-btn ${isActive ? 'active' : ''}`}
          >
            {to === '/add'
              ? <div className="fab"><PlusCircle size={24}/></div>
              : <><Icon size={20}/><span>{label}</span></>
            }
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

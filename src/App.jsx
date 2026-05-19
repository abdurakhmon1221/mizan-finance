import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './router/ProtectedRoute'

import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Debts from './pages/Debts'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Budgets from './pages/Budgets'
import NoAccess from './pages/NoAccess'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/no-access" element={<NoAccess />} />
          
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Layout><Students /></Layout></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute><Layout><Teachers /></Layout></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute require="addTransaction"><Layout><AddTransaction /></Layout></ProtectedRoute>} />
          <Route path="/budgets" element={<ProtectedRoute require="manageUsers"><Layout><Budgets /></Layout></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute require="viewReports"><Layout><Reports /></Layout></ProtectedRoute>} />
          <Route path="/debts" element={<ProtectedRoute require="viewReports"><Layout><Debts /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute require="manageUsers"><Layout><Users /></Layout></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

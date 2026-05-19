import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xtioydziumpissjbqcej.supabase.co',
  'sb_publishable_dV0pCC8Oyv0vb0-nVy7kwQ_7eT1re2K'
)

async function setup() {
  console.log('🔄 Owner profilini yaratish boshlandi...')
  
  // 1. Auth user yaratish
  const { data, error } = await supabase.auth.signUp({
    email: 'abduraxmon@mizan.uz',
    password: 'MizanOwner2025!',
    options: {
      data: { full_name: 'Abduraxmon' }
    }
  })

  if (error) {
    console.log('❌ Xatolik yuz berdi (Balki allaqachon yaratilgandir):', error.message)
    return
  }

  // 2. Profile jadvaliga Owner rolini berish
  const { error: profError } = await supabase.from('profiles').insert({
    id: data.user.id,
    full_name: 'Abduraxmon',
    email: 'abduraxmon@mizan.uz',
    role: 'owner',
    department: 'all'
  })

  if (profError) {
    console.log('❌ Profil yaratishda xatolik:', profError.message)
  } else {
    console.log('✅ Muvaffaqiyatli! Endi dasturga kirishingiz mumkin.')
    console.log('📧 Email: abduraxmon@mizan.uz')
    console.log('🔑 Parol: MizanOwner2025!')
  }
}

setup()

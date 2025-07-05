import React, { useState, useEffect } from 'react'
import {
  ShoppingCart,
  RefreshCw,
  User,
  Key,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Settings,
  LogOut
} from 'lucide-react'
import './main.css'

const TebexExchangeSystem = () => {
  const [currentView, setCurrentView] = useState('login')
  const [authStep, setAuthStep] = useState('send')
  const [transactionId, setTransactionId] = useState('')
  const [code, setCode] = useState('')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('')
const [selectedNewProducts, setSelectedNewProducts] = useState([])
const [showExchangeModal, setShowExchangeModal] = useState(false)

  const [userProducts, setUserProducts] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [exchangeRequests, setExchangeRequests] = useState([])
  const [selectedOldProduct, setSelectedOldProduct] = useState(null)
  const [selectedNewProduct, setSelectedNewProduct] = useState(null)
  const [productKey, setProductKey] = useState('')
  const [exchangeReason, setExchangeReason] = useState('')

  const mockAvailableProducts = [
    { id: 1, name: 'Premium Script Pack', price: 25.99, category: 'Scripts', rating: 4.8, downloads: 1200 },
    { id: 2, name: 'Advanced Car System', price: 15.99, category: 'Vehicles', rating: 4.6, downloads: 850 },
    { id: 3, name: 'Housing System', price: 35.99, category: 'Housing', rating: 4.9, downloads: 2100 },
    { id: 4, name: 'Job System', price: 20.99, category: 'Jobs', rating: 4.7, downloads: 1500 },
    { id: 5, name: 'Banking System', price: 18.99, category: 'Economy', rating: 4.5, downloads: 900 },
    { id: 6, name: 'Inventory System', price: 22.99, category: 'Inventory', rating: 4.8, downloads: 1100 }
  ]

  const mockUserProducts = [
    { id: 1, name: 'Premium Script Pack', purchaseDate: '2024-01-15', transactionId: 'TBX-12345', status: 'active' },
    { id: 2, name: 'Advanced Car System', purchaseDate: '2024-02-10', transactionId: 'TBX-12346', status: 'active' },
    { id: 4, name: 'Job System', purchaseDate: '2024-03-05', transactionId: 'TBX-12347', status: 'refunded' }
  ]

  useEffect(() => {
  if (currentView === 'dashboard') {
    loadAvailablePackages()
  }
}, [currentView])

const oldPrice = selectedOldProduct && availableProducts.find(a=>a.id===selectedOldProduct.id)?.price


  const loadAvailablePackages = async () => {
    try {
      const res = await fetch('/api/packages')
      if (res.ok) {
        const data = await res.json()
        setAvailableProducts(Array.isArray(data) ? data : [])
      } else {
        setAvailableProducts(mockAvailableProducts)
      }
    } catch {
      setAvailableProducts(mockAvailableProducts)
    }
  }

  const sendCode = async () => {
  setLoading(true)
  setError('')
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Kod gönderilemedi')

    // eğer test modu için backend code döndürdüyse hemen verify et
    if (data.code) {
      console.log('🔑 Test Kod:', data.code)
      // direkt olarak verify-code endpoint’ine post’la
      const vres = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, code: data.code })
      })
      const vdata = await vres.json()
      if (!vres.ok) throw new Error(vdata.error || 'Doğrulama başarısız')
      // login başarılı
      setUser(vdata.user)
      setUserProducts(vdata.purchases)
      setCurrentView('dashboard')
      return
    }

    // normal akışta kullanıcıyı verify ekranına geçir
    setAuthStep('verify')
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}




  const verifyCode = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Doğrulama hatası')
      setUser(data.user)
      setUserProducts(data.purchases)
      await loadAvailablePackages()
      setCurrentView('dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExchangeRequest = async () => {
    setLoading(true)
    setError('')
    // if (!selectedOldProduct || !selectedNewProduct) {
    //   setError('Lütfen hem mevcut hem yeni ürün seç')
    //   setLoading(false)
    //   return
    // }
    // if (!productKey.trim()) {
    //   setError('Ürün anahtarı gir')
    //   setLoading(false)
    //   return
    // }
    // if (selectedOldProduct.id === selectedNewProduct.id) {
    //   setError('Aynı ürünü seçemezsin')
    //   setLoading(false)
    //   return
    // }
    try {
      const res = await fetch('/api/exchange/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: user.transactionId,
          oldProduct: selectedOldProduct,
          newProduct: selectedNewProducts,
          productKey,
          reason: exchangeReason,
          userEmail: user.email
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request hatası')
      setSuccess('Talebin alındı')
      setCurrentView('requests')
    } catch {
      setExchangeRequests(prev => [
        ...prev,
        {
          id: Date.now(),
          oldProduct: selectedOldProduct,
          newProduct: selectedNewProduct,
          productKey,
          reason: exchangeReason,
          status: 'pending',
          requestDate: new Date().toISOString(),
          user: user.email
        }
      ])
      setSuccess('Talebin alındı')
      setCurrentView('requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('exchangeRequests:', exchangeRequests)
  }, [exchangeRequests])


  const loadExchangeRequests = async () => {
    if (!user?.email) return
    try {
      const res = await fetch(`/api/exchange/requests/${encodeURIComponent(user.email)}`)
      const data = await res.json()
      setExchangeRequests(Array.isArray(data) ? data : [])
    } catch {
      setExchangeRequests([]) // fallback
    }
  }


  useEffect(() => {
    if (currentView === 'requests' && user?.email) loadExchangeRequests()
  }, [currentView, user])

  const getStatusIcon = status => {
    if (status === 'pending') return <Clock size={16} />
    if (status === 'approved') return <CheckCircle size={16} />
    if (status === 'rejected') return <XCircle size={16} />
    return <AlertCircle size={16} />
  }

  const getStatusText = status => {
    if (status === 'pending') return 'Beklemede'
    if (status === 'approved') return 'Onaylandı'
    if (status === 'rejected') return 'Reddedildi'
    return 'Bilinmeyen'
  }

  useEffect(() => {
    console.log('userProducts:', userProducts)
  }, [userProducts])

  const renderLogin = () => (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <ShoppingCart size={32} />
          </div>
          <h1 className="login-title">Ürün Değişim</h1>
          <p className="login-subtitle">Kolay değişim sistemi</p>
        </div>
        <div className="form-group">
          <label className="form-label">
            Transaction ID
          </label>
          <input
            type="text"
            className="form-input"
            value={transactionId}
            onChange={e => setTransactionId(e.target.value)}
            placeholder="TBX-12345"
          />
        </div>
        {authStep === 'send' && (
          <button onClick={sendCode} disabled={loading} className="login-button">
            {loading ? 'Gönderiliyor...' : 'Koda Gönder'}
          </button>
        )}
        {authStep === 'verify' && (
          <>
            <div className="form-group">
              <label className="form-label">Gelen Kod</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="6 haneli kod"
              />
            </div>
            <button onClick={verifyCode} disabled={loading} className="login-button">
              {loading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </>
        )}
        {error && (
          <div className="error-message">
            <XCircle size={20} />
            <span className="error-text">{error}</span>
          </div>
        )}
      </div>
    </div>
  )

  const renderDashboard = () => (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-icon">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="header-title">Ürün Değişim</h1>
              <p className="header-subtitle">Mağaza sistemi</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <p className="user-label">Hoş geldin</p>
              <p className="user-email">{user?.email}</p>
            </div>
            <button onClick={() => setCurrentView('requests')} className="btn btn-primary">
              <RefreshCw size={16} /> Taleplerim
            </button>
            <button onClick={() => { setUser(null); setCurrentView('login'); setAuthStep('send') }} className="btn btn-ghost">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <div className="products-grid">
          <div className="product-section">
            <div className="section-header">
              <Package size={20} className="section-icon red" />
              <div>
                <h2 className="section-title">Mevcut Ürünleriniz</h2>
                <p className="section-subtitle">Değişim için seçin</p>
              </div>
            </div>
            <div className="product-list">
   {userProducts.map(p => {
    return (
    <div
      key={p.id}
      onClick={()=>setSelectedOldProduct(p)}
      className={`product-card ${selectedOldProduct?.id===p.id?'selected':''}`}
    >
      {p.status==='refunded' && <div className="badge">Refunded</div>}
      {p.status==='chargeback' && <div className="badge">Refunded</div>}
      <h3>{p.name}</h3>
      <p><b>{p.price} €</b></p>       {/* burayı kullan */}
      <p>{new Date(p.purchaseDate).toLocaleDateString('tr-TR')}</p>
      <p>{p.transactionId}</p>
    </div>
  )})}
</div>


          </div>
          <div className="product-section">
            <div className="section-header">
              <RefreshCw size={20} className="section-icon green" />
              <div>
                <h2 className="section-title">Yeni Ürün Seçin ({availableProducts.length})</h2>
                <p className="section-subtitle">Değiştirmek istediğiniz</p>
              </div>
            </div>
            <div className="search-container">
  <input
    type="text"
    placeholder="Script ara..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="search-input"
  />
</div>

<div className="product-list">
  {(() => {
    const filtered = availableProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (!availableProducts.length) return <p>Yükleniyor...</p>
    if (!filtered.length) return <p>Sonuç bulunamadı</p>

    const oldItem = availableProducts.find(a => a.id === selectedOldProduct?.id)
    const oldPrice = oldItem?.price || 0
    const currentTotal = selectedNewProducts.reduce((sum, x) => sum + x.price, 0)

    return filtered.map(p => {
      const isSelected = selectedNewProducts.some(x => x.id === p.id)
      const wouldExceed = !isSelected && (currentTotal + p.price > oldPrice)

      return (
        <div
          key={p.id}
          onClick={() => {
            if (wouldExceed) {
              alert('Seçeceğin ürün toplamı eskisinden pahalı olamaz!')
              return
            }
            if (isSelected) {
              setSelectedNewProducts(prev => prev.filter(x => x.id !== p.id))
            } else {
              setSelectedNewProducts(prev => [...prev, p])
            }
            setError('')
          }}
          className={`product-card 
            ${isSelected ? 'selected' : ''} 
            ${wouldExceed ? 'disabled' : ''}
          `}
        >
          <h3>{p.name}</h3>
          <span className="product-category">{p.category}</span>
          {p.rating && <p>{p.rating} ★</p>}
          {p.downloads && <p>📥 {p.downloads}</p>}
          <p>${p.price}</p>
        </div>
      )
    })
  })()}
</div>

          </div>
        </div>
       {selectedOldProduct && selectedNewProducts.length > 0 && (
          <div className="exchange-form">
            <Key size={20} />
            <h2>Değişim Detayları</h2>
            <div>
              <div>
                <h3>Mevcut</h3>
                <p>{selectedOldProduct.name}</p>
              </div>
              <ArrowRight size={20} />
              <div>
                <h3>Yeni</h3>
                 {selectedNewProducts.map(p => (
    <p key={p.id}>{p.name}</p>
  ))}
              </div>
            </div>
          
            <textarea
              value={exchangeReason}
              onChange={e => setExchangeReason(e.target.value)}
              placeholder="Sebep (opsiyonel)"
              style={{
                width: '17rem',
                height: '3rem',
                borderRadius: '.5rem',
                fontFamily: 'monospace',
                padding: '.7rem',
                marginTop: '1rem',
                background: '#000000',
                color: '#ddd'
              }}
            />
            {error && <p className="error-text">{error}</p>}
            <br></br>
            <button onClick={handleExchangeRequest} disabled={loading}>
              {loading ? 'Gönderiliyor...' : 'Talep Gönder'}
            </button>
          </div>
        )}
      </main>
    </div>
  )

  const renderRequests = () => (
    <div className="requests">
      <header className="header">
        <RefreshCw size={20} />
        <h1>Değişim Taleplerim</h1>
        <button onClick={() => setCurrentView('dashboard')} className="btn btn-primary">
          <Package size={16} /> Yeni Talep
        </button>
      </header>
      <main>
        {exchangeRequests.length === 0
          ? <p>Henüz talebin yok</p>
          : exchangeRequests.map(r => (
              <div key={r.id}>
                <h3>Talep #{r.id}</h3>
                <p>{new Date(r.requestDate).toLocaleDateString('tr-TR')}</p>
                <p>{getStatusText(r.status)}</p>
              </div>
            ))
        }
      </main>
    </div>
  )

  if (currentView === 'login') return renderLogin()
  if (currentView === 'dashboard') return renderDashboard()
  if (currentView === 'requests') return renderRequests()
  return null
}

export default TebexExchangeSystem

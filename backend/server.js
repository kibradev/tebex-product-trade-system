const express = require('express')
const axios = require('axios')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()
const codes = {}
const app = express()
const nodemailer = require('nodemailer')
const SKIP_EMAIL = process.env.SKIP_EMAIL === 'true'  // .env’de SKIP_EMAIL=true yap
const Port = process.env.PORT || 3001
app.listen(Port, ()=>console.log(`Server port ${Port}`))

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
})
app.use(cors())
app.use(express.json())
const ExchangeRequestSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  transactionId: String,
  oldProduct: { id: Number, name: String, transactionId: String },
  newProduct: { id: Number, name: String, price: Number },
  productKey: String,
  reason: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  adminNotes: String
})
const ExchangeRequest = mongoose.model('ExchangeRequest', ExchangeRequestSchema)
const TEBEX_API_BASE = 'https://plugin.tebex.io/'
const TEBEX_SECRET = process.env.TEBEX_SECRET
const tebexApi = {
  async getPayment(transactionId) {
    try {
      const response = await axios.get(`${TEBEX_API_BASE}payments/${transactionId}`, {
        headers: { 'X-Tebex-Secret': TEBEX_SECRET }
      })
      return response.data
    } catch (error) {
      console.error(error.response?.data || error.message)
      throw new Error('Payment not found or invalid')
    }
  },
  async getCustomerPackages(playerId) {
    const res = await axios.get(`${TEBEX_API_BASE}player/${playerId}/packages`, {
      headers: { 'X-Tebex-Secret': TEBEX_SECRET }
    })
    return res.data
  },
  async getUserPayments(email) {
    try {
      const response = await axios.get(`${TEBEX_API_BASE}payments`, {
        headers: { 'X-Tebex-Secret': TEBEX_SECRET },
        params: { email, limit: 100 }
      })
      console.log(JSON.stringify(response.data, null, 2))
      return response.data.data || []
    } catch (error) {
      console.error(error.response?.data || error.message)
      return []
    }
  },
  async getPackages() {
    try {
      const response = await axios.get(`${TEBEX_API_BASE}packages`, {
        headers: { 'X-Tebex-Secret': TEBEX_SECRET }
      })
      console.log('🔥 getPackages raw data:', response.data)
      const arr = Array.isArray(response.data) ? response.data : []
      console.log('🔥 getPackages as array:', arr.length, arr)
      return arr
    } catch (error) {
      console.error('🔥 getPackages ERROR:', error.response?.data || error.message)
      return []
    }
  },

  async isPaymentRefunded(txn){
    const payment = await this.getPayment(txn)
    return payment.status === 'Refunded' || payment.status === 'Chargeback'
  }
}

app.post('/api/auth/send-code', async (req, res) => {
  const { transactionId } = req.body
  const payment = await tebexApi.getPayment(transactionId)
  if (!payment) return res.status(400).json({ error: 'Invalid tx' })

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  codes[payment.email] = code

  if (!SKIP_EMAIL) {
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: payment.email,
      subject: '0Resmon Trade',
      text: `Your Entry Code: ${code}`
    })
  }

  // test için kodu direkt cevapta da yolla
  res.json({ ok: true, ...(SKIP_EMAIL && { code }) })
})

app.post('/api/auth/verify-code', async (req, res) => {
  const { transactionId, code } = req.body
  const payment = await tebexApi.getPayment(transactionId)
  const pkgs = await tebexApi.getCustomerPackages(payment.player.uuid)

  const all = []

  for (const pkg of pkgs) {
    const payInfo   = await tebexApi.getPayment(pkg.txn_id)
    const isRefund  = payInfo.status === 'Refunded' || payInfo.status === 'Chargeback'
    const status    = isRefund ? 'refunded' : 'active'
    all.push({
      id: pkg.package.id,
      name: pkg.package.name,
      transactionId: pkg.txn_id,
      purchaseDate: pkg.date,
      price: payInfo.price?.amount ?? payInfo.amount ?? 0,
      status
    })
  }

  return res.json({
    user: { email: payment.email, transactionId },
    purchases: all
  })
})



app.post('/api/auth/login', async (req, res) => {
  const { transactionId } = req.body
  // 1) Ödeme bilgisini al
  const payment = await tebexApi.getPayment(transactionId)
  const userEmail = payment.email

  // 2) Kullanıcının tüm ödemelerini çek
  const allPayments = await tebexApi.getUserPayments(userEmail)

  const purchases = []
  const refunded = []

  // 3) Her ödemeyi işlemeyi dene
  for (const p of allPayments) {
    // p.txn_id ve p.date, p.package.id & p.package.name mevcut varsayılıyor
    const isRefund = await tebexApi.isPaymentRefunded(p.txn_id)
    const item = {
      id: p.package.id,
      name: p.package.name,
      transactionId: p.txn_id,
      purchaseDate: p.date
    }
    purchases.push(item)
  }

  // 4) Dönüş objesi
  res.json({
    user: { email: userEmail, transactionId },
    purchases,   // aktif ürünler
    refunded     // iade edilmiş ürünler
  })
})

let pkgCache = []
app.use(express.json())

async function refreshPackages() {
  try {
    const res = await axios.get(`${TEBEX_API_BASE}packages`, {
      headers: { 'X-Tebex-Secret': TEBEX_SECRET }
    })
    // eğer data içinde packages dizisi geliyorsa, ona bak, yoksa direk data
    pkgCache = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.packages)
        ? res.data.packages
        : []
    console.log('🗄️ pkgCache yenilendi:', pkgCache.length, 'adet paket')
  } catch (e) {
    console.error('Cache refresh error:', e.message)
  }
}
// app.listen’tan önce startup’ta bir kez çağır
refreshPackages()

app.get('/api/packages', async (req, res) => {
  if (!pkgCache.length) {
    // ilk yükleme hâlâ bitmediyse
    return res.status(503).json({ error: 'Paketler henüz yüklenmedi' })
  }
  const formatted = pkgCache.map(p => ({
    id: p.id || p.package?.id,
    name: p.name || p.package?.name,
    price: p.base_price || p.price || p.package?.base_price || 0,
    category: p.category?.name || p.package?.category?.name || 'Diğer'
  }))
  res.json(formatted)
})

app.post('/api/admin/refresh-packages', async (req, res) => {
  try {
    await refreshPackages()
    res.json({ ok: true, count: pkgCache.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/exchange/request', async (req, res) => {
  try {
    const { transactionId, oldProduct, newProduct, productKey, reason, userEmail } = req.body
    const payment = await tebexApi.getPayment(oldProduct.transactionId)
    if (!payment || payment.email !== userEmail) return res.status(403).json({ error: 'Bu ürün size ait değil' })
    const refunded = await tebexApi.isPaymentRefunded(oldProduct.transactionId)
    if (refunded) return res.status(400).json({ error: 'İade edilmiş ürünler için değişim talebi oluşturulamaz' })
    const exchangeRequest = new ExchangeRequest({ userId: payment.customer.uuid, userEmail, transactionId, oldProduct, newProduct, productKey, reason })
    await exchangeRequest.save()
    await sendDiscordNotification(exchangeRequest)
    res.json({ success: true, requestId: exchangeRequest._id, message: 'Değişim talebi başarıyla oluşturuldu' })
  } catch {
    res.status(500).json({ error: 'Değişim talebi oluşturulamadı' })
  }
})
app.get('/api/exchange/requests/:email', async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({ userEmail: req.params.email }).sort({ createdAt: -1 })
    res.json(requests)
  } catch {
    res.status(500).json({ error: 'Talepler yüklenemedi' })
  }
})
app.put('/api/admin/exchange/:requestId', async (req, res) => {
  try {
    const request = await ExchangeRequest.findByIdAndUpdate(req.params.requestId, { status: req.body.status, adminNotes: req.body.adminNotes, updatedAt: new Date() }, { new: true })
    if (!request) return res.status(404).json({ error: 'Talep bulunamadı' })
    await notifyUser(request)
    res.json({ success: true, request })
  } catch {
    res.status(500).json({ error: 'Talep güncellenemedi' })
  }
})
async function sendDiscordNotification(exchangeRequest) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await axios.post(url, { embeds: [{ title: '🔄 Yeni Değişim Talebi', color: 3447003, fields: [{ name: 'Kullanıcı', value: exchangeRequest.userEmail, inline: true }, { name: 'Eski Ürün', value: exchangeRequest.oldProduct.name, inline: true }, { name: 'Yeni Ürün', value: exchangeRequest.newProduct.name, inline: true }, { name: 'Ürün Anahtarı', value: `\`${exchangeRequest.productKey}\`` }] , timestamp: new Date().toISOString() }] })
  } catch {}
}
async function notifyUser(request) {}
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tebex-exchange').then(() => console.log('MongoDB connected')).catch(() => {})
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err))
process.on('uncaughtException', err => { console.error('Uncaught Exception:', err); process.exit(1) })
module.exports = app

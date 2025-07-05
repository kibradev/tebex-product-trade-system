
# Tebex Exchange System

A product exchange system for FiveM. Users can easily request a replacement for products they've purchased.

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kibradev/tebex-exchange-system.git
cd tebex-exchange-system/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file inside the `backend/` directory and add:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123456
DB_NAME=tebex_exchange
```

> If you're using MongoDB:
```
MONGO_URI=mongodb://localhost:27017/tebex-exchange
```

### 4. Create the Database (For MySQL)

```sql
CREATE DATABASE tebex_exchange;
```

Let me know if you want a sample SQL schema.

### 5. Start the Application

```bash
npm start
```

---

## 📦 Project Structure

```
backend/
├── server.js
├── routes/
├── controllers/
├── models/
└── .env
```

```
web/
├── src/
├── public/
└── build/
```

---

## 🌐 Build the Frontend (React)

```bash
cd web
npm install
npm run build
```

The generated `web/build` directory can be used as a public directory in the backend or integrated into FiveM.

---

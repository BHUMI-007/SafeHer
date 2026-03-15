# 🛡️ SafeHer — AI-Powered Women's Safety App

> *"Your safety, our priority"*

[![Live Demo](https://img.shields.io/badge/Live-Demo-purple)](https://safeher-28bb2.web.app)
[![Backend](https://img.shields.io/badge/Backend-Render-green)](https://safeher-0x4u.onrender.com)
[![Firebase](https://img.shields.io/badge/Database-Firebase-orange)](https://firebase.google.com)

---

## 🌟 What is SafeHer?

SafeHer is an AI-powered Progressive Web App (PWA) designed to keep women safe. It combines real-time SOS alerts, Gemini AI risk scoring, voice distress detection, live location tracking, and community danger reporting — all completely free.

---

## ✨ Features

| Feature | Description | Status |
|---|---|---|
| 🆘 Smart SOS | Real phone calls + SMS to trusted contacts via Twilio | ✅ Live |
| 📍 Live Tracking | Real-time location sharing via Firebase | ✅ Live |
| 🤖 AI Risk Score | Gemini AI analyzes your safety based on location & time | ✅ Live |
| 🎙️ Voice Detection | Detects distress words like "help", "bachao" | ✅ Live |
| 🗺️ Safe Routes | AI-powered route safety analysis | ✅ Live |
| 🔴 Danger Heatmap | Community reported unsafe areas on map | ✅ Live |
| 🤫 Silent Mode | Fake calculator screen while secretly sending SOS | ✅ Live |
| 📵 Offline Mode | Core SOS works without internet via PWA | ✅ Live |
| 👥 Trusted Circle | Save emergency contacts with Firebase sync | ✅ Live |
| 🔐 Phone Login | OTP-based authentication via Firebase | ✅ Live |
| 📳 Shake Detection | 3 shakes triggers voice verification then SOS | ✅ Live |

---

## 🚀 Live Demo

🌐 **Web App:** https://safeher-28bb2.web.app  
📱 **Install as App:** Open in Chrome → Add to Home Screen  
🔧 **Backend API:** https://safeher-0x4u.onrender.com

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, PWA |
| Backend | Python, Flask, Gunicorn |
| Database | Firebase Realtime Database |
| Auth | Firebase Phone Authentication |
| AI | Google Gemini AI |
| Calls & SMS | Twilio |
| Hosting | Firebase Hosting + Render.com |

---

## 📁 Project Structure
```
SafeHer/
├── frontend/
│   ├── index.html      # Main app
│   ├── login.html      # Phone OTP login
│   ├── map.html        # Safety map + heatmap
│   ├── track.html      # Live location tracking
│   ├── script.js       # Core app logic
│   ├── style.css       # Styling
│   ├── manifest.json   # PWA manifest
│   └── sw.js          # Service worker
├── backend/
│   ├── app.py         # Flask API
│   ├── requirements.txt
│   └── Procfile
└── firebase.json
```

---

## ⚙️ How to Run Locally

### Backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend:
```bash
cd frontend
# Open index.html in browser
# Or use Live Server in VS Code
```

### Environment Variables (backend/.env):
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
GEMINI_API_KEY=your_key
```

---

## 🤖 How AI is Used

1. **Gemini AI Risk Scoring** — Analyzes location, time, and day to give real-time safety score
2. **Voice Distress Detection** — AI analyzes speech for distress words in Hindi & English
3. **Route Safety Analysis** — AI evaluates journey safety before travel
4. **Anomaly Detection** — Detects unusual movement patterns

---

## 💡 How SafeHer is Different

| Feature | SafeHer | Other Apps |
|---|---|---|
| Real phone calls | ✅ Twilio | ❌ |
| AI risk scoring | ✅ Gemini AI | ❌ |
| Voice detection | ✅ | ❌ |
| Works offline | ✅ PWA | ❌ |
| Free to use | ✅ | Paid |
| Community heatmap | ✅ | ❌ |

---

## 🔮 Future Plans

- 📱 Native Android app
- 🚔 Police department integration
- ⌚ Smartwatch support
- 🌍 Nationwide danger database
- 📡 True offline SMS

---

## 👩‍💻 Made with 💜 for women's safety

> SafeHer — Because every woman deserves to feel safe.

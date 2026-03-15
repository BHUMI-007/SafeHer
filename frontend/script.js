async function loadUserFromFirebase(uid) {
  try {
    const snapshot = await firebase.database()
      .ref(`users/${uid}`).once('value');
    if (snapshot.exists()) {
      const profile = snapshot.val();
      if (profile.contacts) {
        contacts = profile.contacts;
        localStorage.setItem('safeher_contacts',
          JSON.stringify(contacts));
        renderContacts();
        updateContactsStatus();
      }
    }
  } catch(err) {
    console.log('Error loading profile:', err);
  }
}
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_cFOpL7irYXrK27ImvlV2YTNQDifPYqM",
  authDomain: "safeher-28bb2.firebaseapp.com",
  databaseURL: "https://safeher-28bb2-default-rtdb.firebaseio.com",
  projectId: "safeher-28bb2",
  storageBucket: "safeher-28bb2.firebasestorage.app",
  messagingSenderId: "1093714755282",
  appId: "1:1093714755282:web:2095969d84ec69d088770b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Backend URL
const BACKEND_URL = 'https://safeher-0x4u.onrender.com';


// ===== CONTACTS SYSTEM =====
let contacts = JSON.parse(localStorage.getItem('safeher_contacts')) || [
  { name: "Mom", phone: "+91XXXXXXXXXX" },
  { name: "Dad", phone: "+91XXXXXXXXXX" },
  { name: "Best Friend", phone: "+91XXXXXXXXXX" }
];

function renderContacts() {
  const list = document.getElementById('contactsList');
  list.innerHTML = '';
  contacts.forEach((contact, index) => {
    list.innerHTML += `
      <div class="contact-card">
        <h4>👤 ${contact.name}</h4>
        <p>${contact.phone}</p>
        <button onclick="removeContact(${index})"
          style="background:none;border:none;color:red;cursor:pointer;margin-top:8px;">
          Remove
        </button>
      </div>`;
  });
}

function showAddContact() {
  document.getElementById('contactModal').classList.add('active');
}

function hideModal() {
  document.getElementById('contactModal').classList.remove('active');
}

function addContact() {
  const name = document.getElementById('contactName').value;
  const phone = document.getElementById('contactPhone').value;
  if (name && phone) {
    contacts.push({ name, phone });
    localStorage.setItem('safeher_contacts', JSON.stringify(contacts));
    renderContacts();
    hideModal();
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    showNotification('✅ Contact added successfully!');

    // Save to backend
    fetch(`${BACKEND_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: getUserId(), contacts })
    });

    updateContactsStatus();
  } else {
    showNotification('⚠️ Please fill all fields!');
  }
}

function removeContact(index) {
  contacts.splice(index, 1);
  localStorage.setItem('safeher_contacts', JSON.stringify(contacts));
  renderContacts();
  updateContactsStatus();
  showNotification('Contact removed!');
}

function updateContactsStatus() {
  const statusItems = document.querySelectorAll('.status-item');
  if (statusItems[2]) {
    statusItems[2].innerHTML = `👥 ${contacts.length} Contacts Ready`;
  }
}

function getUserId() {
  let userId = localStorage.getItem('safeher_user_id');
  if (!userId) {
    userId = 'user_' + Date.now();
    localStorage.setItem('safeher_user_id', userId);
  }
  return userId;
}

// ===== LOCATION =====
let userLocation = null;

navigator.geolocation.watchPosition(
  (pos) => {
    userLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    updateLocationStatus();
    trackMovement();
    getAIRiskScore();
  },
  (err) => console.log('Location error:', err),
  { enableHighAccuracy: true }
);

function updateLocationStatus() {
  const items = document.querySelectorAll('.status-item');
  if (userLocation && items[1]) {
    items[1].innerHTML = '📍 Location Active';
  }
}

// ===== MOVEMENT TRACKING =====
function trackMovement() {
  if (!userLocation) return;

  // Save to Firebase for live tracking
  db.ref('live_location').set({
    lat: userLocation.lat,
    lng: userLocation.lng,
    timestamp: new Date().toISOString(),
    userId: getUserId()
  });

  // Send to backend
  fetch(`${BACKEND_URL}/api/movement/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: getUserId(),
      location: userLocation
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.anomalyDetected) {
      showNotification('🤖 AI Alert: ' + data.message);
    }
  })
  .catch(err => console.log('Tracking error:', err));
}

// ===== LIVE LOCATION UPDATE EVERY 30 SECONDS =====
function startLiveTracking() {
  // Update immediately
  trackMovement();

  // Then every 30 seconds
  setInterval(() => {
    if (userLocation) {
      trackMovement();

      // Update location status
      const items = document.querySelectorAll('.status-item');
      if (items[1]) {
        items[1].innerHTML = `📍 Updated: ${new Date().toLocaleTimeString()}`;
      }

      console.log('📍 Location updated:', userLocation);
    }
  }, 30000);
}

// ===== AI RISK SCORING =====
let riskScoreInterval = null;

function getAIRiskScore() {
  if (!userLocation) return;
  fetch(`${BACKEND_URL}/api/ai/risk-score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: userLocation })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      updateSafetyStatus(data);
      if (data.shouldCheckin) {
        startAICheckin();
      }
    }
  })
  .catch(err => console.log('Risk score error:', err));
}

function updateSafetyStatus(riskData) {
  const statusItem = document.querySelector('.status-item');
  if (!statusItem) return;

  const colors = { LOW: 'green', MEDIUM: 'orange', HIGH: 'red' };
  const labels = { LOW: 'You are Safe', MEDIUM: 'Stay Alert', HIGH: 'High Risk Area!' };

  statusItem.innerHTML = `
    <span class="status-dot" style="background:${colors[riskData.riskLevel] || 'green'};
    box-shadow: 0 0 10px ${colors[riskData.riskLevel] || 'green'}"></span>
    <span>${labels[riskData.riskLevel] || 'You are Safe'}</span>
  `;

  if (riskData.safetyAdvice) {
    showNotification(`🤖 AI Safety Tip: ${riskData.safetyAdvice}`);
  }
  // Update AI panel
const aiScore = document.getElementById('aiRiskScore');
const aiStatus = document.getElementById('aiStatus');
if (aiScore) {
  aiScore.textContent = `${riskData.riskScore}/10 - ${riskData.riskLevel}`;
  aiScore.style.color = riskData.riskLevel === 'HIGH' ? '#e74c3c' : 
                        riskData.riskLevel === 'MEDIUM' ? 'orange' : '#2ecc71';
}
if (aiStatus) {
  aiStatus.textContent = riskData.aiPowered ? 'Gemini AI Active ✅' : 'AI Active ✅';
}
}

// ===== AI CHECK-IN =====
function startAICheckin() {
  fetch(`${BACKEND_URL}/api/ai/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: userLocation,
      userId: getUserId()
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.requiresResponse) {
      setTimeout(() => {
        const isSafe = window.confirm(
          `🤖 SafeHer AI: ${data.message}\n\nClick OK if you're safe, Cancel to send SOS!`
        );
        if (!isSafe) {
          activateSOS();
        } else {
          showNotification('✅ Glad you are safe! 💜');
        }
      }, 3000);
    }
  })
  .catch(err => console.log('Checkin error:', err));
}

// ===== VOICE DISTRESS DETECTION =====
let recognition = null;
let isListening = false;

function startVoiceDetection() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log('Speech recognition not supported');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'hi-IN';

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join(' ');

    // Send to AI for analysis
    analyzeVoiceDistress(transcript);
  };

  recognition.onerror = (err) => {
    console.log('Voice error:', err);
  };

  recognition.onend = () => {
    if (isListening) {
      recognition.start(); // Restart if still listening
    }
  };

  recognition.start();
  isListening = true;
  showNotification('🎙️ Voice protection active - SafeHer is listening');
}

function analyzeVoiceDistress(transcript) {
  if (!transcript || transcript.length < 3) return;

  fetch(`${BACKEND_URL}/api/ai/voice-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: transcript,
      location: userLocation,
      contacts: contacts
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.isDistress && data.confidence > 0.8) {
      showNotification('🆘 Distress detected! Activating SOS...');
      activateSOS();
    }
  })
  .catch(err => console.log('Voice analysis error:', err));
}

// ===== SOS SYSTEM =====
let sosTimer = null;
let sosActive = false;
let currentAlertId = null;

function triggerSOS() {
  if (sosActive) return;

  let count = 3;
  showNotification(`🆘 SOS in ${count} seconds... tap again to cancel`);

  sosTimer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(sosTimer);
      activateSOS();
    } else {
      showNotification(`🆘 SOS in ${count} seconds...`);
    }
  }, 1000);
}

function activateSOS() {
    // Check if offline
  if (!navigator.onLine) {
    // Queue SOS for when back online
    queueOfflineSOS({
      location: userLocation || { lat: 0, lng: 0 },
      contacts: contacts,
      victimName: "SafeHer User",
      userId: getUserId(),
      timestamp: new Date().toISOString()
    });
    showOfflinePanel();
    return;
  }
  sosActive = true;
  document.getElementById('sosOverlay').classList.add('active');

  // Send to backend - triggers REAL phone calls!
  fetch(`${BACKEND_URL}/api/sos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: userLocation || { lat: 0, lng: 0 },
      contacts: contacts,
      victimName: "SafeHer User",
      userId: getUserId()
    })
  })
  .then(res => res.json())
  .then(data => {
    currentAlertId = data.alertId;
    document.getElementById('sosStatus').textContent = data.message;
  })
  .catch(err => console.error('SOS Error:', err));

  // Save to Firebase
  db.ref('sos_alerts').push({
    timestamp: new Date().toISOString(),
    location: userLocation || { lat: 0, lng: 0 },
    contacts: contacts,
    status: 'ACTIVE'
  });
    // Save live location for tracking
  db.ref('live_location').set({
    lat: userLocation ? userLocation.lat : 0,
    lng: userLocation ? userLocation.lng : 0,
    timestamp: new Date().toISOString()
  });

  // Show tracking link
  const trackingUrl = `https://safeher-28bb2.web.app/track.html`;
  showNotification(`📍 Live tracking: ${trackingUrl}`);

  // Update status messages
  let step = 0;
  const messages = [
    '📍 Getting your location...',
    '📞 Calling your trusted circle...',
    '💬 Sending emergency SMS with location...',
    '✅ All contacts notified! Help is on the way!'
  ];

  const statusEl = document.getElementById('sosStatus');
  const interval = setInterval(() => {
    if (step < messages.length) {
      statusEl.textContent = messages[step];
      step++;
    } else {
      clearInterval(interval);
    }
  }, 1500);
}

function cancelSOS() {
  sosActive = false;
  clearInterval(sosTimer);
  document.getElementById('sosOverlay').classList.remove('active');
  showNotification('SOS Cancelled - Stay Safe! 💜');

  if (currentAlertId) {
    fetch(`${BACKEND_URL}/api/sos/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId: currentAlertId })
    });
  }

  db.ref('sos_alerts').limitToLast(1).once('value', (snapshot) => {
    snapshot.forEach((child) => {
      db.ref(`sos_alerts/${child.key}`).update({ status: 'CANCELLED' });
    });
  });
}

// ===== SHAKE + VOICE COMBO =====
let lastX, lastY, lastZ;
let shakeThreshold = 15;
let shakeCount = 0;
let shakeTimer = null;
let voiceActivated = false;
let comboActivated = false;

// STEP 1 — Shake Detection
window.addEventListener('devicemotion', (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  if (lastX !== undefined) {
    const deltaX = Math.abs(acc.x - lastX);
    const deltaY = Math.abs(acc.y - lastY);
    const deltaZ = Math.abs(acc.z - lastZ);
    const totalShake = deltaX + deltaY + deltaZ;

    if (totalShake > shakeThreshold) {
      shakeCount++;
      console.log(`Shake detected! Count: ${shakeCount}`);

      // Clear previous timer
      if (shakeTimer) clearTimeout(shakeTimer);

      // Reset shake count after 3 seconds
      shakeTimer = setTimeout(() => {
        shakeCount = 0;
      }, 3000);

      // 3 shakes = activate voice verification
      if (shakeCount >= 3 && !comboActivated) {
        comboActivated = true;
        startVoiceVerification();
      }
    }
  }

  lastX = acc.x;
  lastY = acc.y;
  lastZ = acc.z;
});

// STEP 2 — Voice Verification after Shake
function startVoiceVerification() {
  showNotification('📳 Shake detected! Say "HELP" or "BACHAO" to confirm SOS!');

  // Visual indicator
  const indicator = document.createElement('div');
  indicator.id = 'voiceIndicator';
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(231, 76, 60, 0.95);
    color: white;
    padding: 30px 40px;
    border-radius: 20px;
    text-align: center;
    z-index: 99998;
    font-size: 18px;
    animation: pulse 1s infinite;
  `;
  indicator.innerHTML = `
    <div style="font-size:40px">🎙️</div>
    <div style="margin:10px 0">Listening for distress word...</div>
    <div style="font-size:14px;opacity:0.8">Say "HELP" or "BACHAO"</div>
    <div style="font-size:12px;opacity:0.6;margin-top:5px">
      Auto cancel in 10 seconds
    </div>
  `;
  document.body.appendChild(indicator);

  // Start listening specifically for distress words
  listenForDistressWord();

  // Auto cancel after 10 seconds
  setTimeout(() => {
    const ind = document.getElementById('voiceIndicator');
    if (ind) ind.remove();
    comboActivated = false;
    voiceActivated = false;
    showNotification('✅ No distress detected. Stay safe! 💜');
  }, 10000);
}

// STEP 3 — Listen specifically for distress words
function listenForDistressWord() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    // Fallback if speech not supported
    showNotification('⚠️ Voice not supported! Tap SOS button if in danger!');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const verifyRecognition = new SpeechRecognition();
  verifyRecognition.lang = 'hi-IN';
  verifyRecognition.continuous = false;
  verifyRecognition.interimResults = true;

  const distressWords = [
    'help', 'bachao', 'bachao mujhe', 'help me',
    'chodo', 'mat karo', 'madad', 'madad karo',
    'help karo', 'danger', 'emergency', 'sos',
    'save me', 'let me go', 'leave me'
  ];

  verifyRecognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript.toLowerCase())
      .join(' ');

    console.log('Heard:', transcript);

    // Check for distress words
    const distressDetected = distressWords.some(word =>
      transcript.includes(word.toLowerCase())
    );

    if (distressDetected && !sosActive) {
      voiceActivated = true;

      // Remove indicator
      const ind = document.getElementById('voiceIndicator');
      if (ind) ind.remove();

      showNotification(`🆘 Distress word detected: "${transcript}"! Activating SOS!`);

      // Small delay then activate
      setTimeout(() => {
        activateSOS();
        comboActivated = false;
      }, 500);

      verifyRecognition.stop();
    }
  };

  verifyRecognition.onerror = (err) => {
    console.log('Voice error:', err);
    comboActivated = false;
  };

  verifyRecognition.onend = () => {
    comboActivated = false;
  };

  verifyRecognition.start();
}

// ===== BACKGROUND VOICE DETECTION =====
let recognition = null;
let isListening = false;

function startVoiceDetection() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log('Speech recognition not supported');
    return;
    
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'hi-IN';

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join(' ');
    analyzeVoiceDistress(transcript);
  };

  recognition.onerror = (err) => {
    console.log('Voice error:', err);
    isListening = false;
  };

  recognition.onend = () => {
    if (isListening) {
      setTimeout(() => {
        try { recognition.start(); } catch(e) {}
      }, 1000);
    }
  };

  try {
    recognition.start();
    isListening = true;

    // Update voice status
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus) {
      voiceStatus.textContent = 'Listening 🎙️';
      voiceStatus.style.color = '#2ecc71';
    }

    showNotification('🎙️ Voice + Shake protection active!');
  } catch(e) {
    console.log('Voice start error:', e);
  }
}

function analyzeVoiceDistress(transcript) {
  if (!transcript || transcript.length < 3) return;

  fetch(`${BACKEND_URL}/api/ai/voice-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: transcript,
      location: userLocation,
      contacts: contacts
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.isDistress && data.confidence > 0.8 && !sosActive) {
      showNotification(`🆘 AI detected distress! Activating SOS...`);
      activateSOS();
    }
  })
  .catch(err => console.log('Voice analysis error:', err));
}


window.addEventListener('devicemotion', (e) => {
  const acc = e.accelerationIncludingGravity;
  if (!acc) return;

  if (lastX !== undefined) {
    const deltaX = Math.abs(acc.x - lastX);
    const deltaY = Math.abs(acc.y - lastY);
    const deltaZ = Math.abs(acc.z - lastZ);

    if (deltaX + deltaY + deltaZ > shakeThreshold) {
      if (!sosActive) {
        showNotification('📳 Shake detected! Tap SOS to confirm');
        triggerSOS();
      }
    }
  }

  lastX = acc.x;
  lastY = acc.y;
  lastZ = acc.z;
});

// ===== SILENT DECOY SCREEN =====
function activateSilentMode() {
  // Show fake calculator screen
  const decoy = document.createElement('div');
  decoy.id = 'decoyScreen';
  decoy.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: #1a1a1a;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
  `;
  decoy.innerHTML = `
    <div style="color:white;font-size:48px;margin-bottom:20px;">🧮</div>
    <div style="color:white;font-size:24px;">Calculator</div>
    <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:10px;">
      Triple tap to exit
    </div>
  `;

  let tapCount = 0;
  decoy.addEventListener('click', () => {
    tapCount++;
    if (tapCount >= 3) {
      decoy.remove();
    }
  });

  document.body.appendChild(decoy);

  // Secretly activate SOS
  activateSOS();
  showNotification('🤫 Silent mode activated');
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.textContent = message;
  notif.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(155, 89, 182, 0.95);
    color: white;
    padding: 15px 30px;
    border-radius: 25px;
    font-size: 14px;
    z-index: 10000;
    max-width: 90%;
    text-align: center;
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 4000);
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  // Login check
  const userId = localStorage.getItem('safeher_user_id');
  if (!userId) {
    window.location.href = 'login.html';
    return;
  }

  // Show username in navbar
  const userName = localStorage.getItem('safeher_user_name');
  if (userName) {
    const logo = document.querySelector('.logo');
    if (logo) logo.textContent = `🛡️ Hi, ${userName}!`;
  }
  renderContacts();
  updateContactsStatus();
  updateOnlineStatus(); 
  showNotification('🛡️ SafeHer AI is protecting you!');

  // Start AI risk scoring every 5 minutes
  setInterval(getAIRiskScore, 300000);

  // Start voice detection
  startVoiceDetection();

  // Start live tracking
  startLiveTracking();

  // Start AI checkin every 30 minutes
  setInterval(startAICheckin, 1800000);
});
// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SafeHer SW registered:', registration);
        showNotification('📱 SafeHer installed! Works offline too!');
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// ===== OFFLINE SOS QUEUE =====
async function queueOfflineSOS(sosData) {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const cache = await caches.open('safeher-sos-queue');
    await cache.put(
      new Request(`/sos-queue-${Date.now()}`),
      new Response(JSON.stringify(sosData))
    );

    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sos-sync');
    showNotification('📵 SOS queued! Will send when online');
  }
}

// ===== ENHANCED OFFLINE DETECTION =====
window.addEventListener('online', () => {
  showNotification('✅ Back online! Full protection restored 💜');
  document.getElementById('offlinePanel')?.classList.add('hidden');

  // Sync any queued SOS alerts
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.sync.register('sos-sync');
    });
  }
});

window.addEventListener('offline', () => {
  showNotification('📵 Offline mode activated! Emergency features ready');
  showOfflinePanel();
});
// ===== OFFLINE PANEL FUNCTIONS =====
function showOfflinePanel() {
  const panel = document.getElementById('offlinePanel');
  if (panel) panel.classList.remove('hidden');
}

function dismissOfflinePanel() {
  const panel = document.getElementById('offlinePanel');
  if (panel) panel.classList.add('hidden');
}

function updateOnlineStatus() {
  if (!navigator.onLine) {
    showOfflinePanel();
  } else {
    dismissOfflinePanel();
  }
}
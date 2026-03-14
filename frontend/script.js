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

// ===== CONTACTS SYSTEM =====
let contacts = JSON.parse(localStorage.getItem('safeher_contacts')) || [
  { name: "Mom", phone: "+918816926841" },
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
  } else {
    showNotification('⚠️ Please fill all fields!');
  }
}

function removeContact(index) {
  contacts.splice(index, 1);
  localStorage.setItem('safeher_contacts', JSON.stringify(contacts));
  renderContacts();
  showNotification('Contact removed!');
}

// ===== SOS SYSTEM =====
let sosTimer = null;
let sosActive = false;
let userLocation = null;

// Get location on load
navigator.geolocation.watchPosition(
  (pos) => {
    userLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    updateLocationStatus();
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

function triggerSOS() {
  if (sosActive) return;

  // Show countdown
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
  sosActive = true;
  document.getElementById('sosOverlay').classList.add('active');

  // Save SOS to Firebase
  const sosData = {
    timestamp: new Date().toISOString(),
    location: userLocation || { lat: 0, lng: 0 },
    contacts: contacts,
    status: 'ACTIVE'
  };

  db.ref('sos_alerts').push(sosData);

  // Update status messages
  let step = 0;
  const messages = [
    '📍 Getting your location...',
    '📱 Alerting your trusted circle...',
    '💬 Sending emergency SMS...',
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

  // Update Firebase
  db.ref('sos_alerts').limitToLast(1).once('value', (snapshot) => {
    snapshot.forEach((child) => {
      db.ref(`sos_alerts/${child.key}`).update({ status: 'CANCELLED' });
    });
  });
}

// ===== SHAKE DETECTION =====
let lastX, lastY, lastZ;
let shakeThreshold = 15;

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
      }
    }
  }

  lastX = acc.x;
  lastY = acc.y;
  lastZ = acc.z;
});

// ===== NOTIFICATION SYSTEM =====
function showNotification(message) {
  // Remove existing notification
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
    animation: slideUp 0.3s ease;
    max-width: 90%;
    text-align: center;
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ===== AI CHECK-IN SYSTEM =====
function startAICheckin() {
  // Simulate AI routine check
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour <= 5;

  if (isNight) {
    setTimeout(() => {
      const confirm = window.confirm(
        '🤖 SafeHer AI: It\'s late night. Are you safe? Click OK if you\'re safe, Cancel to send SOS!'
      );
      if (!confirm) {
        activateSOS();
      } else {
        showNotification('✅ Glad you\'re safe! Goodnight 💜');
      }
    }, 5000);
  }
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
  renderContacts();
  startAICheckin();
  showNotification('🛡️ SafeHer is protecting you!');

  // Update contacts count in status bar
  const statusItems = document.querySelectorAll('.status-item');
  if (statusItems[2]) {
    statusItems[2].innerHTML = `👥 ${contacts.length} Contacts Ready`;
  }
});
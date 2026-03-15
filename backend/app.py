from flask import Flask, request, jsonify
from flask_cors import CORS
from twilio.rest import Client
from dotenv import load_dotenv
import google.generativeai as genai
import json
import os
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')

# Gemini AI Setup
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-pro')

# Initialize Twilio
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# ===== DATA STORAGE =====
DATA_FILE = 'data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {
        "sos_alerts": [],
        "danger_zones": [],
        "users": [],
        "movement_history": []
    }

def save_data(data):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Local save error: {e}")

# ===== MAKE EMERGENCY CALL =====
def make_emergency_call(to_number, victim_name, location):
    try:
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)
        maps_url = f"https://maps.google.com/?q={lat},{lng}"

        twiml_message = f"""
        <Response>
            <Say voice="alice" language="en-IN">
                Emergency Alert! Emergency Alert!
                {victim_name} has triggered an SOS emergency alert on SafeHer.
                She needs immediate help!
                Please call her or contact emergency services immediately.
                Her location has been sent to your phone via SMS.
                Repeating. {victim_name} needs your help immediately!
            </Say>
            <Pause length="1"/>
            <Say voice="alice" language="en-IN">
                Please check your messages for her live location link.
                Emergency number is 1 1 2.
            </Say>
        </Response>
        """

        call = twilio_client.calls.create(
            twiml=twiml_message,
            to=to_number,
            from_=TWILIO_PHONE_NUMBER
        )

        sms = twilio_client.messages.create(
            body=f"🆘 EMERGENCY ALERT!\n{victim_name} needs help!\n📍 Location: {maps_url}\nTrack live: https://safeher-28bb2.web.app/track.html\nCall her immediately or dial 112!",
            from_=TWILIO_PHONE_NUMBER,
            to=to_number
        )

        return {"call_sid": call.sid, "sms_sid": sms.sid, "success": True}

    except Exception as e:
        print(f"Error calling {to_number}: {str(e)}")
        return {"success": False, "error": str(e)}

# ===== HOME ROUTE =====
@app.route('/')
def home():
    return jsonify({
        "status": "SafeHer Backend Running! 🛡️",
        "version": "3.0.0",
        "twilio": "Connected" if TWILIO_ACCOUNT_SID else "Not configured",
        "ai": "Gemini AI Connected" if GEMINI_API_KEY else "Not configured",
        "endpoints": [
            "/api/sos - POST - Trigger SOS with real calls",
            "/api/sos/cancel - POST - Cancel SOS",
            "/api/danger-zones - GET - Get danger zones",
            "/api/danger-zones/report - POST - Report danger zone",
            "/api/ai/risk-score - POST - AI Risk Assessment",
            "/api/ai/checkin - POST - AI Check-in",
            "/api/ai/analyze-route - POST - AI Safe Route Analysis",
            "/api/ai/voice-alert - POST - AI Voice Distress",
            "/api/movement/track - POST - Track movement",
            "/api/contacts - POST - Save contacts"
        ]
    })

# ===== SOS ROUTE =====
@app.route('/api/sos', methods=['POST'])
def trigger_sos():
    try:
        data = request.get_json()
        location = data.get('location', {})
        contacts = data.get('contacts', [])
        victim_name = data.get('victimName', 'SafeHer User')
        user_id = data.get('userId', 'anonymous')

        alert = {
            "id": len(load_data()['sos_alerts']) + 1,
            "userId": user_id,
            "victimName": victim_name,
            "location": location,
            "contacts": contacts,
            "timestamp": datetime.now().isoformat(),
            "status": "ACTIVE",
            "calls": []
        }

        call_results = []
        for contact in contacts:
            phone = contact.get('phone', '')
            name = contact.get('name', '')
            if phone:
                print(f"📞 Calling {name} at {phone}...")
                result = make_emergency_call(phone, victim_name, location)
                call_results.append({
                    "contact": name,
                    "phone": phone,
                    "result": result
                })

        alert['calls'] = call_results
        db = load_data()
        db['sos_alerts'].append(alert)
        save_data(db)

        successful_calls = sum(1 for r in call_results if r['result']['success'])

        return jsonify({
            "success": True,
            "message": f"SOS activated! Called {successful_calls}/{len(contacts)} contacts!",
            "alertId": alert['id'],
            "location": location,
            "callResults": call_results
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== CANCEL SOS =====
@app.route('/api/sos/cancel', methods=['POST'])
def cancel_sos():
    try:
        data = request.get_json()
        alert_id = data.get('alertId')

        db = load_data()
        for alert in db['sos_alerts']:
            if alert['id'] == alert_id:
                alert['status'] = 'CANCELLED'
                alert['cancelledAt'] = datetime.now().isoformat()

        save_data(db)

        return jsonify({
            "success": True,
            "message": "SOS cancelled"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== DANGER ZONES =====
@app.route('/api/danger-zones', methods=['GET'])
def get_danger_zones():
    try:
        db = load_data()
        return jsonify({
            "success": True,
            "dangerZones": db['danger_zones']
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/danger-zones/report', methods=['POST'])
def report_danger_zone():
    try:
        data = request.get_json()
        zone = {
            "id": len(load_data()['danger_zones']) + 1,
            "location": data.get('location', {}),
            "description": data.get('description', ''),
            "severity": data.get('severity', 'medium'),
            "timestamp": datetime.now().isoformat(),
            "reports": 1
        }

        db = load_data()
        existing = False
        for z in db['danger_zones']:
            if (abs(z['location'].get('lat', 0) - zone['location'].get('lat', 0)) < 0.001 and
                abs(z['location'].get('lng', 0) - zone['location'].get('lng', 0)) < 0.001):
                z['reports'] += 1
                existing = True
                break

        if not existing:
            db['danger_zones'].append(zone)

        save_data(db)

        return jsonify({
            "success": True,
            "message": "Danger zone reported!",
            "zone": zone
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== AI RISK SCORING =====
@app.route('/api/ai/risk-score', methods=['POST'])
def ai_risk_score():
    try:
        data = request.get_json()
        location = data.get('location', {})
        hour = datetime.now().hour
        day = datetime.now().strftime('%A')
        lat = location.get('lat', 0)
        lng = location.get('lng', 0)

        prompt = f"""
        You are a women's safety AI assistant for India.
        Analyze the safety risk for a woman in this situation:
        - Current time: {hour}:00 hours
        - Day: {day}
        - Location coordinates: {lat}, {lng}
        - Country: India
        
        Based on general safety patterns in India, provide:
        1. Risk level: LOW, MEDIUM, or HIGH
        2. Risk score: 1-10
        3. Safety advice: One specific actionable tip
        4. Should trigger checkin: true or false
        
        Respond in this exact JSON format only:
        {{
            "riskLevel": "LOW/MEDIUM/HIGH",
            "riskScore": 5,
            "safetyAdvice": "your advice here",
            "shouldCheckin": false,
            "reasoning": "brief explanation"
        }}
        """

        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()

        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]

        ai_result = json.loads(response_text)

        return jsonify({
            "success": True,
            "aiPowered": True,
            "timestamp": datetime.now().isoformat(),
            **ai_result
        })

    except Exception as e:
        hour = datetime.now().hour
        is_night = hour >= 21 or hour <= 5
        return jsonify({
            "success": True,
            "aiPowered": False,
            "riskLevel": "HIGH" if is_night else "LOW",
            "riskScore": 8 if is_night else 2,
            "safetyAdvice": "Stay in well-lit areas and keep your phone charged",
            "shouldCheckin": is_night,
            "reasoning": "Based on time of day"
        })

# ===== AI CHECK-IN =====
@app.route('/api/ai/checkin', methods=['POST'])
def ai_checkin():
    try:
        data = request.get_json()
        hour = datetime.now().hour

        prompt = f"""
        You are SafeHer AI, a caring women's safety assistant in India.
        A woman is checking in at {hour}:00 hours.
        Generate a caring, concise check-in message that:
        1. Acknowledges the time
        2. Gives ONE safety tip relevant to this time
        3. Asks if she is safe
        Keep it under 2 sentences. Be warm and caring.
        Respond in JSON format:
        {{
            "message": "your message here",
            "requiresResponse": true/false,
            "urgency": "low/medium/high"
        }}
        """

        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()

        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]

        ai_result = json.loads(response_text)

        return jsonify({
            "success": True,
            "aiPowered": True,
            "timestamp": datetime.now().isoformat(),
            **ai_result
        })

    except Exception as e:
        return jsonify({
            "success": True,
            "aiPowered": False,
            "message": "Hey! Just checking in. Are you safe? 💜",
            "requiresResponse": True,
            "urgency": "low"
        })

# ===== AI ROUTE ANALYSIS =====
@app.route('/api/ai/analyze-route', methods=['POST'])
def analyze_route():
    try:
        data = request.get_json()
        destination = data.get('destination', '')
        hour = datetime.now().hour

        prompt = f"""
        You are a women's safety AI for India.
        A woman wants to travel to: {destination}
        Current time: {hour}:00 hours
        
        Provide safety analysis:
        1. Overall safety rating: 1-10
        2. Key safety concerns for this time
        3. Top 3 safety tips for this journey
        4. Recommended precautions
        
        Respond in JSON format:
        {{
            "safetyRating": 7,
            "concerns": ["concern1", "concern2"],
            "tips": ["tip1", "tip2", "tip3"],
            "precautions": "main precaution",
            "recommended": true/false
        }}
        """

        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()

        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]

        ai_result = json.loads(response_text)

        return jsonify({
            "success": True,
            "aiPowered": True,
            "destination": destination,
            "timestamp": datetime.now().isoformat(),
            **ai_result
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== AI VOICE DISTRESS =====
@app.route('/api/ai/voice-alert', methods=['POST'])
def voice_alert():
    try:
        data = request.get_json()
        transcript = data.get('transcript', '')
        location = data.get('location', {})
        contacts = data.get('contacts', [])

        prompt = f"""
        You are a women's safety AI.
        Analyze this voice transcript for distress signals:
        "{transcript}"
        
        Consider distress words in English and Hindi
        (help, bachao, chodo, mat karo, etc.)
        
        Respond in JSON format:
        {{
            "isDistress": true/false,
            "confidence": 0.95,
            "triggerSOS": true/false,
            "detectedWords": ["word1", "word2"],
            "reasoning": "explanation"
        }}
        """

        response = gemini_model.generate_content(prompt)
        response_text = response.text.strip()

        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]

        ai_result = json.loads(response_text)

        if ai_result.get('triggerSOS') and ai_result.get('confidence', 0) > 0.8:
            for contact in contacts:
                phone = contact.get('phone', '')
                if phone:
                    make_emergency_call(phone, "SafeHer User", location)

        return jsonify({
            "success": True,
            "aiPowered": True,
            "transcript": transcript,
            **ai_result
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== MOVEMENT TRACKING =====
@app.route('/api/movement/track', methods=['POST'])
def track_movement():
    try:
        data = request.get_json()
        user_id = data.get('userId', 'anonymous')
        location = data.get('location', {})

        db = load_data()

        movement = {
            "userId": user_id,
            "location": location,
            "timestamp": datetime.now().isoformat(),
            "hour": datetime.now().hour
        }

        db['movement_history'].append(movement)

        if len(db['movement_history']) > 100:
            db['movement_history'] = db['movement_history'][-100:]

        save_data(db)

        user_movements = [m for m in db['movement_history'] if m['userId'] == user_id]
        anomaly_detected = False

        if len(user_movements) > 10:
            current_hour = datetime.now().hour
            usual_hours = [m['hour'] for m in user_movements[:-1]]
            avg_hour = sum(usual_hours) / len(usual_hours)
            if abs(current_hour - avg_hour) > 4:
                anomaly_detected = True

        return jsonify({
            "success": True,
            "tracked": True,
            "anomalyDetected": anomaly_detected,
            "message": "Unusual activity detected! Are you safe?" if anomaly_detected else "Movement tracked"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== CONTACTS =====
@app.route('/api/contacts', methods=['POST'])
def save_contacts():
    try:
        data = request.get_json()
        user_id = data.get('userId', 'anonymous')
        contacts = data.get('contacts', [])

        db = load_data()
        user_found = False
        for user in db['users']:
            if user['id'] == user_id:
                user['contacts'] = contacts
                user_found = True
                break

        if not user_found:
            db['users'].append({
                "id": user_id,
                "contacts": contacts,
                "createdAt": datetime.now().isoformat()
            })

        save_data(db)

        return jsonify({
            "success": True,
            "message": f"Saved {len(contacts)} contacts!"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===== RUN SERVER =====
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print("🛡️ SafeHer Backend v3.0 Starting...")
    print("📞 Twilio Voice Calls: Enabled")
    print("🤖 Gemini AI: Enabled")
    print(f"📡 Server running on port {port}")
     app.run(host='0.0.0.0', port=port, debug=False)
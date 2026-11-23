# EcoTrack

EcoTrack is a modern Flask + MongoDB web application for verified environmental complaint reporting, resolution tracking, and sustainable civic action sharing.

## Project Overview

EcoTrack helps citizens submit verified complaints for issues like garbage overflow, sewage leaks, illegal dumping, and pollution. It also rewards eco-friendly actions, provides transparent tracking, and delivers an admin dashboard for smarter monitoring and faster resolution.

## Tech Stack

- Backend: `Flask`
- Database: `MongoDB` / `PyMongo`
- Authentication: session-based login, password hashing with `werkzeug.security`
- Email verification: `smtplib` or Gmail SMTP
- Frontend: `HTML`, `CSS`, `JavaScript`, `Bootstrap 5`
- Maps: `Leaflet.js` + OpenStreetMap
- Charts: `Chart.js`
- Environment management: `python-dotenv`

## Key Features

### Citizen Features

- Verified registration with email OTP
- Login only for verified users
- File complaints with image upload and map location
- Duplicate nearby complaint warning
- Complaint priority system (High / Medium / Low)
- Track complaint status via Complaint ID
- Submit eco actions and earn points
- Profile page with complaint history and eco score
- Leaderboard for top contributors
- Environmental awareness content

### Admin Features

- Secure admin login with `.env` credentials
- Dashboard with complaint analytics
- Filtering by status, issue type, area, and priority
- Charts for status and issue distribution
- Most affected area insights
- Update complaint status and resolution photo
- Delete fake or invalid complaints
- Reward verified users for resolved contributions

### Map & Visualization

- Home map with colored markers by complaint priority
- Popup cards with issue details and image previews
- Heatmap for complaint density
- Mobile-friendly responsive layout for WebView usage

## How It Works

1. A citizen registers with name, email, password, and ward.
2. The app sends a 6-digit OTP to the user's email.
3. The citizen verifies their account using the OTP.
4. Verified citizens log in and submit complaints or eco actions.
5. Complaints are saved to MongoDB with status, priority, and timeline.
6. Admin users review complaints, update status, and upload resolution proof.
7. Citizens can track complaints by ID and earn eco points for activity.
8. The leaderboard displays the most active verified contributors.

## Project Structure

```text
ecotrack/
|-- app.py
|-- requirements.txt
|-- .env.example
|-- render.yaml
|-- README.md
|-- ecotrack_app/
|   |-- __init__.py
|   |-- config.py
|   |-- db.py
|   |-- services.py
|   |-- utils.py
|   |-- models/
|   |   |-- __init__.py
|   |   |-- user.py
|   |   `-- complaint.py
|   |-- routes/
|   |   |-- admin.py
|   |   |-- auth.py
|   |   `-- public.py
|-- templates/
|   |-- base.html
|   |-- index.html
|   |-- complaint.html
|   |-- eco_actions.html
|   |-- track.html
|   |-- awareness.html
|   |-- admin.html
|   |-- admin_login.html
|   |-- login.html
|   |-- register.html
|   |-- verify_otp.html
|   |-- profile.html
|   `-- leaderboard.html
|-- static/
|   |-- css/
|   |   `-- main.css
|   |-- js/
|   |   |-- complaint.js
|   |   `-- map.js
|   `-- uploads/
```

## Setup Instructions

### 1. Install dependencies

```bash
python -m venv venv
# Windows
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and update values:

- `SECRET_KEY`
- `MONGO_URI`
- `MONGODB_DB_NAME`
- `ADMIN_USER`
- `ADMIN_PASS`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`

### 3. Run the app

```bash
python app.py
```

Open your browser at `http://localhost:5000`

## Important Routes

- `/` — Home page
- `/register` — Citizen registration
- `/verify-otp` - Email OTP verification
- `/login` — Verified citizen login
- `/logout` — Logout
- `/complaint` — Submit complaint
- `/track` — Track complaint status
- `/eco_actions` — Share eco actions
- `/awareness` — Awareness content
- `/profile` — User profile and history
- `/leaderboard` — Top eco contributors
- `/admin/login` — Admin login
- `/admin` — Admin dashboard
- `/map_data` — Complaint map data API
- `/score/<phone>` — Eco score API

## Deployment Notes

- This app can be hosted on Render or similar Python hosting platforms.
- Use `render.yaml` for Render deployment configuration.
- Keep `SECRET_KEY` and mail credentials secret.
- MongoDB Atlas is recommended for production.

## Notes for Friends

- The project is beginner-friendly and uses plain Flask routing with templates.
- The authentication flow is built without paid APIs.
- It uses MongoDB collections for users, complaints, eco actions, and counters.
- Images are stored under `static/uploads/` and served by Flask.
- The UI is responsive and suitable for mobile WebView.

## License

This repository is for learning and demonstration purposes.

# 💰 MoneyTrack

A personal expense tracking Progressive Web App (PWA) with budget management, built for iOS and web.

![MoneyTrack](https://img.shields.io/badge/PWA-Ready-brightgreen) ![Netlify](https://img.shields.io/badge/Hosted-Netlify-00C7B7) ![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248)

## ✨ Features

### Budget Management
- **Monthly Account Budget** - Set your total monthly spending limit
- **Monthly Card Budget** - Separate tracking for card expenses
- **Configurable Windows** - Choose 5, 10, or 15-day budget periods
- **Daily Limit Tracking** - Visual indicator for daily spending limit

### Expense Tracking
- **Quick Entry** - Built-in calculator for fast expense entry
- **Categorization** - Separate Account and Card expenses
- **Backdate Entries** - Add expenses for previous dates
- **Descriptions** - Optional notes for each expense

### Visual Reports
- **Monthly Overview** - See spending patterns by month
- **Period Summaries** - Budget vs actual for each window period
- **Overflow Alerts** - Red indicators when over budget
- **Savings Tracking** - Green indicators for under-budget periods

### Multi-User Support
- **Secure Login** - Username + 6-digit PIN authentication
- **Private Data** - Each user's data is completely isolated
- **Session Persistence** - Stay logged in until you logout

### PWA Features
- **Installable** - Add to home screen on iOS/Android
- **Offline Support** - Works without internet after initial load
- **Native Feel** - Full-screen app experience

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Netlify Functions (Serverless) |
| Database | MongoDB Atlas |
| Hosting | Netlify |
| Auth | Custom PIN-based authentication |

## 📁 Project Structure

```
money-tracking-app/
├── index.html          # Main app HTML
├── styles.css          # All styles
├── app.js              # Frontend JavaScript
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── netlify.toml        # Netlify configuration
├── package.json        # Dependencies
├── .gitignore          # Git ignore rules
├── icons/              # App icons
│   ├── icon-192.svg
│   └── icon-512.svg
└── netlify/
    └── functions/      # Serverless functions
        ├── db.js       # MongoDB connection
        ├── auth.js     # Authentication
        ├── expenses.js # Expense CRUD
        ├── settings.js # Settings CRUD
        └── clear.js    # Data clearing
```

## 🚀 Deployment

### Prerequisites
- [Node.js](https://nodejs.org/) installed
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) installed
- [MongoDB Atlas](https://www.mongodb.com/atlas) account

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd money-tracking-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create MongoDB Atlas cluster**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free cluster
   - Create a database user
   - Get your connection string

4. **Configure environment variables**
   
   Create a `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   ```

5. **Deploy to Netlify**
   ```bash
   netlify login
   netlify deploy --prod
   ```

6. **Add environment variable in Netlify**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add `MONGODB_URI` with your MongoDB connection string

### Local Development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally with Netlify Dev
netlify dev
```

## 📱 Installing on iOS

1. Open Safari on your iPhone
2. Navigate to your Netlify URL
3. Tap the **Share** button (square with arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Name it "MoneyTrack" and tap **Add**

## 🔐 Security

- PINs are hashed using SHA-256 before storage
- Session tokens are randomly generated (32 bytes)
- Each user's data is isolated by userId
- API endpoints require valid authentication tokens

## 📖 Usage

### First Time Setup
1. Open the app
2. Click "Create Account"
3. Enter a username and 6-digit PIN
4. Set your monthly budgets in Settings

### Adding Expenses
1. Tap "Add Account Expense" or "Add Card Expense"
2. Use the calculator to enter the amount
3. Select a date (defaults to today)
4. Add an optional description
5. Tap "Add Expense"

### Viewing Reports
1. Tap "Report" in the bottom navigation
2. Use arrows to navigate between months
3. See period summaries with budget vs actual

### Changing Settings
1. Tap the gear icon ⚙️
2. Update monthly budgets
3. Choose budget window (5/10/15 days)
4. Tap "Save Settings"

## 🎨 Customization

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
  --accent-gold: #d4a853;      /* Primary accent */
  --bg-primary: #0a0a0f;       /* Background */
  --success: #34c759;          /* Under budget */
  --danger: #ff453a;           /* Over budget */
}
```

### Changing Budget Windows
In Settings, choose between:
- **5 days** - More granular tracking (default)
- **10 days** - Medium tracking
- **15 days** - Bi-monthly tracking

## 📄 License

This project is for personal use.

## 🙏 Acknowledgments

- Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans), [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- Icons: Custom SVG
- Hosting: [Netlify](https://netlify.com)
- Database: [MongoDB Atlas](https://mongodb.com/atlas)

---

Made with ❤️ for personal expense tracking


# 🕒 Time Tracker - Browser Extension

A powerful browser extension to track and manage your time spent on websites. Monitor your digital habits, set time limits, and improve productivity with intelligent reminders and detailed analytics.

![Time Tracker Extension](timetracker.png)

## ✨ Features

### 🎯 **Core Time Tracking**
- **Automatic tracking** of time spent on each website
- **Real-time updates** with detailed statistics
- **Daily reports** showing your most visited sites
- **Cross-browser compatibility** (Chrome, Firefox, Edge)

### ⏰ **Smart Reminders**
- **General time limits** - Set a default time limit for all sites
- **Site-specific timers** - Custom time limits for individual websites
- **One-time notifications** - Get reminded once per day per site
- **Auto-cleanup** - Site timers are removed after use

### 🎛️ **Pause & Resume**
- **Instant pause/resume** - Stop tracking anytime without losing data
- **Smart time adjustment** - Seamlessly continue tracking after breaks
- **Persistent state** - Pause state survives browser restarts
- **Visual feedback** - Clear indicators when tracking is paused

### 🎨 **User Experience**
- **Dark mode support** - Easy on the eyes
- **Responsive design** - Works on all screen sizes
- **Intuitive interface** - Simple and easy to use
- **Customizable settings** - Tailor the extension to your needs

### 📊 **Analytics & Insights**
- **Today's statistics** - Total time, sites visited, most active site
- **Detailed breakdown** - Time spent on each website with percentages
- **Historical data** - Track your browsing patterns over time
- **Export capabilities** - Save your data for analysis

## 🚀 Installation

### Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "Time Tracker"
3. Click "Add to Chrome"
4. Confirm the installation

### Manual Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Time Tracker icon should appear in your toolbar

### Firefox Add-ons
1. Visit Firefox Add-ons
2. Search for "Time Tracker"
3. Click "Add to Firefox"
4. Confirm the installation

## 📖 How to Use

### Getting Started
1. **Click the Time Tracker icon** in your browser toolbar
2. **View your stats** - See today's browsing time and top sites
3. **Explore settings** - Click the gear icon to customize

### Setting Up Reminders
1. **Open Settings** - Click the gear icon in the popup
2. **Enable Reminders** - Toggle "Enable Reminders"
3. **Set Time Limit** - Choose your default time limit (e.g., 30 minutes)
4. **Save Settings** - Click "Save" to apply changes

### Using Site-Specific Timers
1. **Go to Settings** - Click the gear icon
2. **Select a Site** - Choose from your visited websites
3. **Set Custom Time** - Enter hours and minutes
4. **Add Timer** - Click "Add" to create the timer
5. **Get Notified** - Receive a notification when the limit is reached

### Pausing Tracking
1. **Click "PAUSE TRACKING"** - Stops all time tracking
2. **Browse normally** - No time will be recorded
3. **Click "RESUME TRACKING"** - Continues tracking with adjusted timing

### Managing Your Data
- **Clear Data** - Remove all tracking data
- **Exclude Sites** - Add domains you don't want to track
- **Time Format** - Choose how time is displayed (minutes, hours, etc.)

## ⚙️ Settings

### General Settings
- **Exclude Domains** - Comma-separated list of sites to ignore
- **Time Format** - Choose between minutes:seconds, minutes only, or hours:minutes
- **Dark Mode** - Toggle between light and dark themes

### Reminder Settings
- **Enable Reminders** - Turn on/off general time limit reminders
- **Default Time Limit** - Set the default reminder time (1-480 minutes)

### Site-Specific Timers
- **Add Custom Timers** - Set individual time limits for specific sites
- **Manage Active Timers** - View and remove existing timers
- **One-Time Use** - Timers are automatically removed after use

## 📱 Screenshots

### Main Interface
![Main Interface](readme%20image/front.png)
*Clean, modern interface showing today's statistics and site list*

### Settings Modal
![Settings](readme%20image/setting.png)
*Comprehensive settings with reminder configuration and site timers*

### Dark Mode
![Dark Mode](readme%20image/dark.png)
*Easy on the eyes with dark theme support*

### Pause State
![Pause State](screenshots/pause-state.png)
*Clear visual feedback when tracking is paused*

## 🔧 Technical Details

### Architecture
- **Background Script** - Handles time tracking and notifications
- **Popup Interface** - User interface and settings management
- **Storage** - Local storage for data persistence
- **Notifications** - Browser notifications for reminders

### Data Storage
- **Time Data** - Website visit times and statistics
- **Settings** - User preferences and configurations
- **Site Timers** - Custom time limits for specific sites
- **Pause State** - Current pause/resume status

### Browser Compatibility
- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Edge 88+
- ✅ Opera 74+

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Setup
1. Clone the repository
2. Install dependencies (if any)
3. Load the extension in developer mode
4. Make your changes
5. Test thoroughly
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Browser Extension APIs** - For making this possible
- **Open Source Community** - For inspiration and tools
- **Users** - For feedback and suggestions

## 📞 Support

If you encounter any issues or have suggestions:

1. **Check the Issues** - Look for existing solutions
2. **Create an Issue** - Report bugs or request features
3. **Contact Us** - Reach out for support

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Core time tracking functionality
- ✅ General and site-specific reminders
- ✅ Pause/resume functionality
- ✅ Dark mode support
- ✅ Comprehensive settings
- ✅ Daily statistics and reports
- ✅ Cross-browser compatibility

## 🎯 Roadmap

### Upcoming Features
- [ ] Data export (CSV/JSON)
- [ ] Weekly/monthly reports
- [ ] Goal setting and achievements
- [ ] Focus mode (site blocking)
- [ ] Pomodoro timer integration
- [ ] Advanced analytics dashboard
- [ ] Cloud sync (optional)
- [ ] Mobile app companion

---

**Made with ❤️ for better digital habits**

*Track your time, improve your productivity, and take control of your digital life!*

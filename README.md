# 📱 Instagram Unfollowers Checker

A simple, privacy-focused web application to find out who's not following you back on Instagram.

![Instagram Unfollowers Checker](https://img.shields.io/badge/Instagram-Unfollowers%20Checker-purple?style=for-the-badge&logo=instagram)

## ✨ Features

- 🔒 **100% Privacy** - All processing happens locally in your browser. No data is uploaded to any server.
- 📊 **Detailed Statistics** - View your total followers, following, and who's not following back
- 🔍 **Search Functionality** - Easily search through the list of unfollowers
- 📥 **Export to CSV** - Download the complete list for offline use
- 🎨 **Beautiful UI** - Modern, responsive design that works on all devices
- 🔗 **Direct Links** - Quick access to any user's Instagram profile

## 🚀 How to Use

### Step 1: Get Your Instagram Data

1. Open Instagram app or visit [Instagram.com](https://www.instagram.com)
2. Go to **Settings** → **Your Activity** → **Download Your Information**
3. Select **Some of your information**
4. Choose **Followers and following**
5. Select **JSON** as the format
6. Click **Create files**
7. Wait for Instagram to prepare your data (can take a few hours to a few days)
8. Download the zip file when ready
9. Extract the zip file

### Step 2: Upload Your Files

1. Open the [Instagram Unfollowers Checker](https://insta-unfollowers.netlify.app/)
2. Navigate to the extracted folder: `connections/followers_and_following/`
3. Upload `followers_1.json`
4. Upload `following.json`
5. Click **Analyze**

### Step 3: View Results

- See your statistics displayed in the dashboard
- Browse or search through people not following you back
- Click "View Profile" to visit any user's Instagram page
- Download the results as CSV if needed

## 🛠️ Technologies Used

- Pure HTML5
- CSS3 (with modern gradients and animations)
- Vanilla JavaScript (no frameworks required)

## 📦 Installation (For Local Use)

1. Clone this repository:
```bash
git clone https://github.com/yourusername/instagram-unfollowers-checker.git
```

2. Navigate to the project folder:
```bash
cd instagram-unfollowers-checker
```

3. Open `index.html` in your browser:
```bash
# Windows
start index.html

# Mac
open index.html

# Linux
xdg-open index.html
```

## 🌐 Deploy Your Own

### GitHub Pages (Recommended)

1. Fork this repository
2. Go to repository Settings → Pages
3. Select **main** branch as source
4. Your site will be available at `https://yourusername.github.io/instagram-unfollowers-checker`

### Other Hosting Options

You can also deploy to:
- [Netlify](https://www.netlify.com/) - Drag and drop deployment
- [Vercel](https://vercel.com/) - One-click deployment
- [Cloudflare Pages](https://pages.cloudflare.com/) - Fast global deployment

## 🔐 Privacy & Security

- **No Server Communication** - All data processing happens in your browser
- **No Data Storage** - Files are processed in memory and never saved
- **No Tracking** - No analytics or tracking scripts
- **Open Source** - Review the code yourself!

## 📝 File Structure

```
instagram-unfollowers-checker/
├── index.html          # Main HTML file
├── style.css           # Styling
├── script.js           # Application logic
├── README.md           # Documentation
└── .gitignore          # Git ignore file
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## ⚠️ Disclaimer

This tool is not affiliated with, endorsed by, or connected to Instagram or Meta Platforms, Inc. Use at your own discretion. Be respectful of others' privacy and Instagram's Terms of Service.

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 💖 Support

If you found this tool helpful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs
- 💡 Suggesting new features

## 📧 Contact

Created by [@yourusername](https://github.com/yourusername)

---

Made with ❤️ for the Instagram community

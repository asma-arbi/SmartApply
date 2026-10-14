# PWA Setup Documentation

## 🚀 Progressive Web App Features

SmartApply Tunisia is now a Progressive Web App (PWA) with the following capabilities:

### ✅ Implemented Features

1. **Installable**: Users can install the app on their devices (mobile, tablet, desktop)
2. **Offline Support**: Basic offline functionality with cached assets
3. **App-like Experience**: Runs in standalone mode without browser UI
4. **Responsive**: Works seamlessly across all device sizes
5. **Fast Loading**: Assets are cached for improved performance
6. **Auto Updates**: Service worker updates automatically

---

## 📱 Installation

### Desktop (Chrome, Edge, Brave)
1. Visit the website
2. Look for the install icon in the address bar
3. Click "Install" or "Add to Desktop"
4. Or use the install prompt that appears at the bottom

### Mobile (Android)
1. Open the website in Chrome or Edge
2. Tap the menu (⋮) 
3. Select "Add to Home screen" or "Install app"
4. Confirm installation

### Mobile (iOS/Safari)
1. Open the website in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Confirm

---

## 🛠️ Technical Implementation

### Files Created

```
public/
├── manifest.json              # PWA manifest configuration
├── icon.svg                   # Main app icon (SVG)
├── icon-192.svg              # Icon for Android (192x192)
├── icon-512.svg              # Icon for Android (512x512)
├── apple-touch-icon.svg      # Icon for iOS
├── offline.html              # Offline fallback page
├── sw.js                     # Service worker (auto-generated)
└── workbox-*.js              # Workbox files (auto-generated)

components/
└── pwa-install-prompt.tsx    # Custom install prompt component

scripts/
├── generate-icons.html       # Icon generator tool (browser-based)
└── create-icons.js           # Icon generator script (Node.js)
```

### Configuration Files Modified

- **next.config.mjs**: Added next-pwa configuration with caching strategies
- **app/layout.tsx**: Added PWA meta tags and manifest link
- **.gitignore**: Added service worker files to ignore list

---

## 🎨 App Icons

### Current Icons (SVG)
The app currently uses SVG icons which work in modern browsers. For better compatibility:

### Creating PNG Icons (Recommended)

**Option 1: Using the Browser Tool**
1. Open `scripts/generate-icons.html` in your browser
2. Click "Download All Icons"
3. Save the generated PNG files to the `public/` directory
4. Update `manifest.json` to use PNG icons

**Option 2: Using Design Tools**
1. Open the SVG icons in Figma, Adobe Illustrator, or Inkscape
2. Export as PNG at the following sizes:
   - 192x192 (required for Android)
   - 512x512 (required for Android)
   - 180x180 (required for iOS - save as apple-touch-icon.png)
3. Place PNG files in the `public/` directory

**Option 3: Using Online Tools**
1. Visit [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload your base icon
3. Generate all required sizes
4. Download and place in `public/` directory

---

## 🔧 Service Worker Caching

### Cache Strategies Configured

1. **Fonts**: CacheFirst (1 year)
2. **Images**: StaleWhileRevalidate (24 hours)
3. **JavaScript**: StaleWhileRevalidate (24 hours)
4. **CSS**: StaleWhileRevalidate (24 hours)
5. **Pages**: NetworkFirst (24 hours)
6. **API Routes**: NetworkFirst (5 minutes)

### Disabling in Development

Service worker is automatically disabled in development mode. To test PWA features:

```bash
npm run build
npm start
```

Then visit http://localhost:3000

---

## 🧪 Testing PWA

### Lighthouse Audit
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Generate report"

### PWA Checklist
- ✅ Manifest file present
- ✅ Service worker registered
- ✅ Icons in multiple sizes
- ✅ Offline fallback page
- ✅ HTTPS (required for production)
- ✅ Responsive design
- ✅ Fast loading time

### Testing Offline
1. Open DevTools (F12)
2. Go to "Network" tab
3. Select "Offline" from throttling dropdown
4. Reload the page
5. Verify offline page appears

### Testing Install Prompt
1. Clear browser cache and data for the site
2. Visit the site
3. Wait for the install banner at the bottom
4. Click "Install" to test the flow

---

## 🚀 Deployment Checklist

Before deploying to production:

1. **Icons**
   - [ ] Convert SVG icons to PNG (recommended)
   - [ ] Test icons on different devices
   - [ ] Verify maskable icon support

2. **HTTPS**
   - [ ] Ensure site is served over HTTPS (required for service worker)
   - [ ] Configure SSL certificate

3. **Manifest**
   - [ ] Update `start_url` if deploying to subdirectory
   - [ ] Add real screenshots (optional but recommended)
   - [ ] Update app name/description if needed

4. **Testing**
   - [ ] Test installation on Android
   - [ ] Test installation on iOS
   - [ ] Test offline functionality
   - [ ] Run Lighthouse PWA audit
   - [ ] Test on different browsers

5. **Optional Enhancements**
   - [ ] Add push notifications
   - [ ] Add background sync
   - [ ] Add share target API
   - [ ] Add shortcuts in manifest

---

## 📊 Browser Support

### Full PWA Support
- ✅ Chrome (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Samsung Internet
- ✅ Opera
- ✅ Brave

### Partial Support
- ⚠️ Safari (iOS): Supports installation but limited service worker features
- ⚠️ Firefox: Supports service workers but not installation on desktop

### Installation Methods by Platform

| Platform | Installation Method |
|----------|-------------------|
| Android Chrome | A2HS banner / Install button |
| iOS Safari | Share → Add to Home Screen |
| Desktop Chrome | Install icon in address bar |
| Desktop Edge | Install icon in address bar |

---

## 🔄 Updating the Service Worker

The service worker updates automatically when:
1. User visits the site after a new deployment
2. Code changes are detected
3. Cache expires (24 hours by default)

### Force Update
To force a service worker update:
1. Change version in `next.config.mjs`
2. Rebuild and redeploy
3. Users will get the update on next visit

### Clear Cache
Users can clear cache by:
1. Uninstalling and reinstalling the app
2. Clearing browser data
3. Or going to Application → Storage → Clear storage (DevTools)

---

## 🐛 Troubleshooting

### Install Prompt Not Showing
- Check if user already dismissed it (stored in localStorage)
- Verify HTTPS connection
- Check browser console for errors
- Try in incognito/private mode

### Service Worker Not Registering
- Ensure HTTPS (or localhost for development)
- Check browser console for errors
- Verify `sw.js` is accessible at `/sw.js`
- Check next-pwa configuration

### Icons Not Showing
- Verify icon paths in manifest.json
- Check icon files exist in public/ directory
- Clear browser cache
- Try PNG instead of SVG

### Offline Page Not Working
- Verify `/offline.html` exists
- Check service worker caching configuration
- Test in Network tab with "Offline" mode

---

## 📚 Resources

- [Next-PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA Checklist](https://web.dev/pwa-checklist/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)

---

## 📝 Notes

- Service worker is disabled in development mode for easier debugging
- Icons use SVG format for smaller file size; convert to PNG for better browser support
- Offline functionality is limited to cached pages and assets
- For full offline support, implement IndexedDB or other client-side storage
- Consider adding push notifications in a future update

---

## ✨ Future Enhancements

Potential PWA features to add:

1. **Push Notifications**: Notify users of new job postings
2. **Background Sync**: Save job applications offline and sync when online
3. **Share Target**: Allow sharing job links to the app
4. **Shortcuts**: Quick actions from app icon (e.g., "New Job", "My Jobs")
5. **Badges**: Show unread notifications count on app icon
6. **Periodic Background Sync**: Auto-update job listings
7. **Advanced Offline**: Cache job listings for offline viewing

---

**Need Help?** Check the browser console for detailed error messages or open an issue in the project repository.

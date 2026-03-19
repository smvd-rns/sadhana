const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const url = require('url');

// Define your custom protocol
const PROTOCOL = 'sadhana-app';

// Register the protocol early
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "VOICE Gurukul",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true
    }
  });

  // Load the live website
  const liveUrl = "https://sadhana-azure.vercel.app/";
  
  // Set a modern Chrome User-Agent to bypass Google Login "untrusted browser" blocks
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  win.loadURL(liveUrl, { userAgent });

  // Handle external links and auth popups
  win.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a google login or auth related, we might want to suggest opening in regular browser
    // or just allow it if the User-Agent fix works.
    if (url.startsWith('https://accounts.google.com')) {
      // Logic to potentially open in external browser if internal fails
      // For now, allow internal but we can switch to shell.openExternal(url) if needed.
      return { action: 'allow' };
    }
    
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Listen for the custom protocol callback
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    // Extract the URL from command line (Windows)
    const deepLinkUrl = commandLine.pop();
    handleDeepLink(deepLinkUrl);
  });

  // For macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Maximize on start
  win.maximize();
}

function handleDeepLink(link) {
  if (!link || !link.startsWith(`${PROTOCOL}://`)) return;
  
  // Example: sadhana-app://callback?access_token=...
  // We can forward this to our website inside the Electron window
  const parsedUrl = url.parse(link, true);
  if (mainWindow) {
    // You can redirect the internal window to the session handler
    const finalUrl = `https://sadhana-azure.vercel.app/auth/callback${parsedUrl.search || ''}`;
    mainWindow.loadURL(finalUrl);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

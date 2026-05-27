const { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

let mainWindow;
let views = new Map();
let activeViewId = null;
let viewIdCounter = 0;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.on('resize', () => {
    resizeViews();
  });
};

const createBrowserView = (url) => {
  const viewId = viewIdCounter++;
  
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'view-preload.js')
    }
  });

  view.webContents.loadURL(url);
  view.webContents.setWindowOpenHandler(({ url }) => {
    createNewTab(url);
    return { action: 'deny' };
  });

  views.set(viewId, {
    view,
    url,
    title: url,
    favicon: null,
    history: [url],
    historyIndex: 0
  });

  mainWindow.addBrowserView(view);
  setActiveView(viewId);

  view.webContents.on('page-title-updated', (event, title) => {
    const viewData = views.get(viewId);
    if (viewData) {
      viewData.title = title;
      mainWindow.webContents.send('tab-updated', { viewId, title });
    }
  });

  view.webContents.on('did-navigate', (event, url) => {
    const viewData = views.get(viewId);
    if (viewData) {
      viewData.url = url;
      viewData.history.splice(viewData.historyIndex + 1);
      viewData.history.push(url);
      viewData.historyIndex = viewData.history.length - 1;
    }
  });

  return viewId;
};

const setActiveView = (viewId) => {
  if (activeViewId !== null && views.has(activeViewId)) {
    const oldView = views.get(activeViewId).view;
    mainWindow.removeBrowserView(oldView);
  }

  activeViewId = viewId;
  
  if (views.has(viewId)) {
    const view = views.get(viewId).view;
    mainWindow.addBrowserView(view);
    resizeViews();
    mainWindow.webContents.send('active-tab-changed', { viewId });
  }
};

const resizeViews = () => {
  if (!mainWindow) return;

  const { width, height } = mainWindow.getContentBounds();
  const sidebarWidth = 70;
  const tabsHeight = 60;
  const addressBarHeight = 50;

  if (activeViewId !== null && views.has(activeViewId)) {
    const view = views.get(activeViewId).view;
    view.setBounds({
      x: sidebarWidth,
      y: tabsHeight + addressBarHeight,
      width: width - sidebarWidth,
      height: height - tabsHeight - addressBarHeight
    });
  }
};

const createNewTab = (url = 'about:blank') => {
  const viewId = createBrowserView(url);
  mainWindow.webContents.send('tab-created', { 
    viewId, 
    url,
    title: url 
  });
  return viewId;
};

// IPC Handlers
ipcMain.handle('create-tab', (event, url) => {
  return createNewTab(url);
});

ipcMain.handle('close-tab', (event, viewId) => {
  if (views.has(viewId)) {
    const viewData = views.get(viewId);
    mainWindow.removeBrowserView(viewData.view);
    views.delete(viewId);

    if (activeViewId === viewId) {
      const remainingViews = Array.from(views.keys());
      if (remainingViews.length > 0) {
        setActiveView(remainingViews[remainingViews.length - 1]);
      } else {
        activeViewId = null;
      }
    }
    mainWindow.webContents.send('tab-closed', { viewId });
  }
});

ipcMain.handle('set-active-tab', (event, viewId) => {
  setActiveView(viewId);
});

ipcMain.handle('navigate-to', (event, url) => {
  if (activeViewId !== null && views.has(activeViewId)) {
    const view = views.get(activeViewId).view;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    view.webContents.loadURL(url);
  }
});

ipcMain.handle('go-back', () => {
  if (activeViewId !== null && views.has(activeViewId)) {
    const viewData = views.get(activeViewId);
    if (viewData.historyIndex > 0) {
      viewData.historyIndex--;
      viewData.view.webContents.loadURL(viewData.history[viewData.historyIndex]);
    }
  }
});

ipcMain.handle('go-forward', () => {
  if (activeViewId !== null && views.has(activeViewId)) {
    const viewData = views.get(activeViewId);
    if (viewData.historyIndex < viewData.history.length - 1) {
      viewData.historyIndex++;
      viewData.view.webContents.loadURL(viewData.history[viewData.historyIndex]);
    }
  }
});

ipcMain.handle('reload', () => {
  if (activeViewId !== null && views.has(activeViewId)) {
    views.get(activeViewId).view.webContents.reload();
  }
});

ipcMain.handle('open-devtools', () => {
  if (activeViewId !== null && views.has(activeViewId)) {
    views.get(activeViewId).view.webContents.openDevTools();
  }
});

ipcMain.handle('save-tiles', (event, tiles) => {
  store.set('tiles', tiles);
  return true;
});

ipcMain.handle('get-tiles', () => {
  return store.get('tiles', []);
});

ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('get-settings', () => {
  return store.get('settings', getDefaultSettings());
});

ipcMain.handle('save-account', (event, account) => {
  const accounts = store.get('accounts', []);
  const exists = accounts.find(a => a.username === account.username);
  if (!exists) {
    accounts.push(account);
    store.set('accounts', accounts);
  }
  return true;
});

ipcMain.handle('get-accounts', () => {
  return store.get('accounts', []);
});

ipcMain.handle('get-current-account', () => {
  return store.get('currentAccount', null);
});

ipcMain.handle('set-current-account', (event, account) => {
  store.set('currentAccount', account);
  return true;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

const getDefaultSettings = () => ({
  theme: 'dark',
  glassIntensity: 80,
  blurIntensity: 10,
  wallpaper: 'aurora',
  language: 'ru',
  searchEngine: 'google',
  fontSize: 100,
  sidebarPosition: 'left',
  smoothScroll: true,
  gpuAcceleration: true,
  animations: true,
  voiceEnabled: true,
  accentColor: '#00d4ff'
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.whenReady().then(() => {
  setTimeout(() => {
    createNewTab('about:blank');
  }, 1000);
});
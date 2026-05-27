const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createTab: (url) => ipcRenderer.invoke('create-tab', url),
  closeTab: (viewId) => ipcRenderer.invoke('close-tab', viewId),
  setActiveTab: (viewId) => ipcRenderer.invoke('set-active-tab', viewId),
  navigateTo: (url) => ipcRenderer.invoke('navigate-to', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  openDevTools: () => ipcRenderer.invoke('open-devtools'),
  saveTiles: (tiles) => ipcRenderer.invoke('save-tiles', tiles),
  getTiles: () => ipcRenderer.invoke('get-tiles'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveAccount: (account) => ipcRenderer.invoke('save-account', account),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  getCurrentAccount: () => ipcRenderer.invoke('get-current-account'),
  setCurrentAccount: (account) => ipcRenderer.invoke('set-current-account', account),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  onTabCreated: (callback) => ipcRenderer.on('tab-created', callback),
  onTabClosed: (callback) => ipcRenderer.on('tab-closed', callback),
  onTabUpdated: (callback) => ipcRenderer.on('tab-updated', callback),
  onActiveTabChanged: (callback) => ipcRenderer.on('active-tab-changed', callback),
  removeListener: (channel) => ipcRenderer.removeAllListeners(channel)
});
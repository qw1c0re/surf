const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('viewAPI', {
  getSystemInfo: () => {
    return {
      platform: process.platform,
      arch: process.arch,
      userAgent: navigator.userAgent
    };
  }
});
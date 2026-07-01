const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('secureShareDesktop', {});

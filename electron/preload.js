const { contextBridge, ipcRenderer } = require('electron')

// Безопасный мост между Electron и React
contextBridge.exposeInMainWorld('electronAPI', {
  // Запуск приложений Windows
  launchApp: (appName) => ipcRenderer.invoke('launch-app', appName),

  // Управление вкладками браузера
  switchTab: (direction) => ipcRenderer.invoke('switch-tab', direction),
  closeTab: () => ipcRenderer.invoke('close-tab'),

  // Список открытых окон
  getWindows: () => ipcRenderer.invoke('get-windows'),

  // Управление окном Юки
  moveWindow: (delta) => ipcRenderer.send('window-move', delta),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  closeApp: () => ipcRenderer.send('window-close'),

  // Флаг — работаем внутри Electron
  isElectron: true,
})

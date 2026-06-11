const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const { exec, spawn } = require('child_process')
const path = require('path')

let mainWindow = null

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 340,
    height: 580,
    x: width - 360,
    y: height - 620,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Разрешаем микрофон без запроса разрешения
      permissions: ['microphone'],
    },
  })

  // Разрешаем доступ к микрофону автоматически
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      callback(true)
    } else {
      callback(false)
    }
  })

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      return true
    }
    return false
  })

  // Dev: загружаем Vite dev server, Prod: собранный dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC: Системные команды Windows ───────────────────────────────────────────

// Запуск приложения по имени или пути
ipcMain.handle('launch-app', async (event, appName) => {
  return new Promise((resolve) => {
    const commands = {
      browser:    'start chrome',
      firefox:    'start firefox',
      telegram:   'start "" "%APPDATA%\\Telegram Desktop\\Telegram.exe"',
      discord:    'start "" "%LOCALAPPDATA%\\Discord\\Update.exe" --processStart Discord.exe',
      notepad:    'notepad',
      explorer:   'explorer',
      terminal:   'start cmd',
      powershell: 'start powershell',
      settings:   'start ms-settings:',
      music:      'start "" "https://music.yandex.ru"',
      calc:       'calc',
      taskmgr:    'taskmgr',
    }
    const cmd = commands[appName] || `start ${appName}`
    exec(cmd, { shell: true }, (err) => {
      resolve({ success: !err, error: err?.message })
    })
  })
})

// Переключение вкладок Chrome через AutoHotkey (если установлен) или SendKeys
ipcMain.handle('switch-tab', async (event, direction) => {
  return new Promise((resolve) => {
    // Ctrl+Tab — следующая вкладка, Ctrl+Shift+Tab — предыдущая
    const key = direction === 'next' ? '^{Tab}' : '^+{Tab}'
    // Используем PowerShell + SendKeys
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('${key}')
    `
    exec(`powershell -Command "${ps}"`, (err) => {
      resolve({ success: !err })
    })
  })
})

// Закрыть вкладку Ctrl+W
ipcMain.handle('close-tab', async () => {
  return new Promise((resolve) => {
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait('^w')
    `
    exec(`powershell -Command "${ps}"`, (err) => {
      resolve({ success: !err })
    })
  })
})

// Получить список открытых окон
ipcMain.handle('get-windows', async () => {
  return new Promise((resolve) => {
    const ps = `Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object Name, MainWindowTitle | ConvertTo-Json`
    exec(`powershell -Command "${ps}"`, (err, stdout) => {
      if (err) { resolve([]); return }
      try {
        const data = JSON.parse(stdout)
        resolve(Array.isArray(data) ? data : [data])
      } catch {
        resolve([])
      }
    })
  })
})

// Переместить окно Юки (drag без frame)
ipcMain.on('window-move', (event, { deltaX, deltaY }) => {
  if (!mainWindow) return
  const [x, y] = mainWindow.getPosition()
  mainWindow.setPosition(x + deltaX, y + deltaY)
})

// Свернуть в трей
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

// Закрыть приложение
ipcMain.on('window-close', () => {
  app.quit()
})

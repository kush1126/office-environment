const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV === 'development'
let backendProcess = null

function spawnBackend() {
  // Use the local venv python directly for now.
  // In a full production bundle, this would point to a bundled pyinstaller exe.
  const backendDir = path.join(__dirname, '../../backend')
  const pythonExe = path.join(backendDir, '.venv', 'Scripts', 'python.exe')
  
  backendProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
  })

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`)
  })

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Office OS',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For easier dev, ideally true in prod with preload
      webSecurity: false // allow local files if needed
    },
    autoHideMenuBar: true
  })

  if (isDev) {
    win.loadURL('http://localhost:3000')
    win.webContents.openDevTools()
  } else {
    // In production, we load the vite built index.html
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  spawnBackend()
  
  // Give the backend a couple seconds to start
  setTimeout(createWindow, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if (backendProcess) {
    console.log('Killing backend process...')
    backendProcess.kill('SIGINT')
  }
})

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 750,
        minWidth: 600,
        minHeight: 500,
        title: 'RPGM Cheat Tool',
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        backgroundColor: '#0b0d13',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

// ========================================
// IPC Handlers - xử lý yêu cầu từ renderer
// ========================================

// Mở dialog chọn thư mục game
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Chọn thư mục game RPG Maker',
        properties: ['openDirectory']
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

// Lấy đường dẫn www (hoặc root nếu không có www)
function getWwwPath(gamePath) {
    if (fs.existsSync(path.join(gamePath, 'www'))) {
        return path.join(gamePath, 'www');
    }
    return gamePath;
}

// Kiểm tra game có folder js/ không
function hasJsFolder(gamePath) {
    return fs.existsSync(path.join(getWwwPath(gamePath), 'js'));
}

// Detect engine (MV hay MZ)
ipcMain.handle('detect-engine', async (event, gamePath) => {
    const wwwPath = getWwwPath(gamePath);
    const jsDir = path.join(wwwPath, 'js');

    // Có folder js → kiểm tra file engine
    if (fs.existsSync(jsDir)) {
        if (fs.existsSync(path.join(jsDir, 'rmmz_core.js'))) return 'MZ';
        if (fs.existsSync(path.join(jsDir, 'rpg_core.js'))) return 'MV';
        return 'MZ'; // Có js/ nhưng không rõ version → assume MZ
    }

    // Không có folder js/ → vẫn tiến hành, detect qua data/
    // Thử đọc System.json để xác nhận đây là RPGM game
    const systemPath = path.join(wwwPath, 'data', 'System.json');
    if (!fs.existsSync(systemPath)) {
        throw new Error('Không tìm thấy data/System.json. Chọn đúng thư mục game!');
    }

    // Game không có js/ thường là MZ với NW.js bundled
    return 'MZ (Bundled)';
});

// Đọc thông tin game
ipcMain.handle('load-game-info', async (event, gamePath) => {
    const dataDir = path.join(getWwwPath(gamePath), 'data');
    const info = { title: 'Unknown Game', maps: 0, items: 0, weapons: 0, armors: 0 };

    try {
        const system = JSON.parse(fs.readFileSync(path.join(dataDir, 'System.json'), 'utf8'));
        info.title = system.gameTitle || 'Unknown Game';
    } catch {}

    try {
        const mapInfos = JSON.parse(fs.readFileSync(path.join(dataDir, 'MapInfos.json'), 'utf8'));
        info.maps = mapInfos.filter(m => m !== null).length;
    } catch {}

    try {
        const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'Items.json'), 'utf8'));
        info.items = items.filter(i => i !== null).length;
    } catch {}

    try {
        const weapons = JSON.parse(fs.readFileSync(path.join(dataDir, 'Weapons.json'), 'utf8'));
        info.weapons = weapons.filter(w => w !== null).length;
    } catch {}

    try {
        const armors = JSON.parse(fs.readFileSync(path.join(dataDir, 'Armors.json'), 'utf8'));
        info.armors = armors.filter(a => a !== null).length;
    } catch {}

    return info;
});

// Phát hiện mode inject của game:
// - 'normal'   : có www/js/ và www/index.html  → inject vào index.html, để cheat trong js/
// - 'no-js'    : không có www/js/ nhưng có www/index.html → inject vào index.html, để cheat cạnh index.html
// - 'bundled'  : không có www/index.html (exe chứa toàn bộ) → dùng NW.js --inject-js-end flag
function getInjectMode(gamePath) {
    const wwwPath = getWwwPath(gamePath);
    const hasIndex = fs.existsSync(path.join(wwwPath, 'index.html'));
    const hasJs = fs.existsSync(path.join(wwwPath, 'js'));

    if (hasIndex && hasJs) return 'normal';
    if (hasIndex && !hasJs) return 'no-js';
    return 'bundled'; // Không có index.html → bundled vào exe
}

// File marker để track trạng thái "bundled hack"
function getBundledMarkerPath(gamePath) {
    return path.join(getWwwPath(gamePath), '.cheat-active');
}

// Kiểm tra game đã hack chưa
ipcMain.handle('check-hacked', async (event, gamePath) => {
    try {
        const mode = getInjectMode(gamePath);
        if (mode === 'bundled') {
            // Kiểm tra marker file
            return fs.existsSync(getBundledMarkerPath(gamePath));
        }
        // Mode normal / no-js: kiểm tra index.html
        const indexPath = path.join(getWwwPath(gamePath), 'index.html');
        const content = fs.readFileSync(indexPath, 'utf8');
        return content.includes('rpgm-cheat-engine.js');
    } catch {
        return false;
    }
});

// Hack game - inject cheat engine
ipcMain.handle('hack-game', async (event, gamePath) => {
    const cheatSrc = path.join(__dirname, 'rpgm-cheat-engine.js');
    const wwwPath = getWwwPath(gamePath);
    const mode = getInjectMode(gamePath);

    if (mode === 'bundled') {
        // ── BUNDLED MODE ──────────────────────────────────────────────────────
        // Game không có index.html → copy cheat vào www/ và tạo marker
        // Khi launch sẽ dùng --inject-js-end để inject tự động
        const cheatDest = path.join(wwwPath, 'rpgm-cheat-engine.js');
        fs.copyFileSync(cheatSrc, cheatDest);
        fs.writeFileSync(getBundledMarkerPath(gamePath), cheatDest, 'utf8');
        return true;
    }

    // ── NORMAL / NO-JS MODE ───────────────────────────────────────────────────
    const indexPath = path.join(wwwPath, 'index.html');
    const backupPath = path.join(wwwPath, 'index.html.backup');

    let cheatDest, scriptTag;
    if (mode === 'normal') {
        cheatDest = path.join(wwwPath, 'js', 'rpgm-cheat-engine.js');
        scriptTag = '<script src="js/rpgm-cheat-engine.js"></script>';
    } else {
        // no-js: copy cạnh index.html
        cheatDest = path.join(wwwPath, 'rpgm-cheat-engine.js');
        scriptTag = '<script src="rpgm-cheat-engine.js"></script>';
    }

    // 1. Copy cheat engine vào game
    fs.copyFileSync(cheatSrc, cheatDest);

    // 2. Đọc & backup index.html
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(indexPath, backupPath);
    }

    // 3. Inject script tag
    if (!indexContent.includes('rpgm-cheat-engine.js')) {
        indexContent = indexContent.replace('</body>', `${scriptTag}\n</body>`);
        fs.writeFileSync(indexPath, indexContent, 'utf8');
    }

    return true;
});

// Gỡ hack
ipcMain.handle('unhack-game', async (event, gamePath) => {
    const wwwPath = getWwwPath(gamePath);
    const mode = getInjectMode(gamePath);
    const markerPath = getBundledMarkerPath(gamePath);

    // Luôn xóa marker nếu có
    if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);

    if (mode === 'bundled') {
        // Bundled mode: chỉ cần xóa file cheat + marker
        const cheatFile = path.join(wwwPath, 'rpgm-cheat-engine.js');
        if (fs.existsSync(cheatFile)) fs.unlinkSync(cheatFile);
        return true;
    }

    // Normal / no-js mode: restore index.html
    const indexPath = path.join(wwwPath, 'index.html');
    const backupPath = path.join(wwwPath, 'index.html.backup');

    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, indexPath);
        fs.unlinkSync(backupPath);
    } else if (fs.existsSync(indexPath)) {
        let content = fs.readFileSync(indexPath, 'utf8');
        content = content.replace('<script src="js/rpgm-cheat-engine.js"></script>\n', '');
        content = content.replace('<script src="js/rpgm-cheat-engine.js"></script>', '');
        content = content.replace('<script src="rpgm-cheat-engine.js"></script>\n', '');
        content = content.replace('<script src="rpgm-cheat-engine.js"></script>', '');
        fs.writeFileSync(indexPath, content, 'utf8');
    }

    // Xóa file cheat ở cả 2 vị trí có thể
    const cheatInJs = path.join(wwwPath, 'js', 'rpgm-cheat-engine.js');
    const cheatInRoot = path.join(wwwPath, 'rpgm-cheat-engine.js');
    if (fs.existsSync(cheatInJs)) fs.unlinkSync(cheatInJs);
    if (fs.existsSync(cheatInRoot)) fs.unlinkSync(cheatInRoot);

    return true;
});

// ================================================
// CDP Helpers — inject vào NW.js/Electron game
// ================================================

function httpGet(url) {
    return new Promise((resolve, reject) => {
        require('http').get(url, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// Tạo WebSocket text frame với mask (client → server bắt buộc có mask)
function buildWsTextFrame(text) {
    const { randomBytes } = require('crypto');
    const payload = Buffer.from(text, 'utf8');
    const len = payload.length;
    const mask = randomBytes(4);
    let hdr;

    if (len < 126) {
        hdr = Buffer.alloc(6);
        hdr[0] = 0x81; hdr[1] = 0x80 | len;
        mask.copy(hdr, 2);
    } else if (len < 65536) {
        hdr = Buffer.alloc(8);
        hdr[0] = 0x81; hdr[1] = 0xFE;
        hdr.writeUInt16BE(len, 2); mask.copy(hdr, 4);
    } else {
        hdr = Buffer.alloc(14);
        hdr[0] = 0x81; hdr[1] = 0xFF;
        hdr.writeBigUInt64BE(BigInt(len), 2); mask.copy(hdr, 10);
    }

    const masked = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
    return Buffer.concat([hdr, masked]);
}

// Inject cheat engine vào game đang chạy qua Chrome DevTools Protocol
async function injectViaCDP(port, cheatFilePath) {
    // Thử kết nối CDP tới khi game start xong (tối đa 20 giây)
    let targetsJson = null;
    for (let i = 0; i < 20; i++) {
        try {
            targetsJson = await httpGet(`http://127.0.0.1:${port}/json/list`);
            break;
        } catch {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    if (!targetsJson) {
        console.error('[CDP] Timeout: game không expose debug port. Game có thể không phải NW.js.');
        return;
    }

    let targets;
    try { targets = JSON.parse(targetsJson); } catch { return; }

    // Tìm page target (cửa sổ game chính)
    const target = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!target) { console.error('[CDP] Không tìm thấy page target.'); return; }

    const wsUrl = target.webSocketDebuggerUrl;
    const m = wsUrl.match(/ws:\/\/([^:/]+):(\d+)(\/.*)/);
    if (!m) return;
    const [, host, portStr, wsPath] = m;
    const wsPort = parseInt(portStr);

    // Inject bằng cách thêm <script src="file:///..."> vào document
    const fileUrl = 'file:///' + cheatFilePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const expr = `(function(){var s=document.createElement('script');s.src=${JSON.stringify(fileUrl)};document.head.appendChild(s);})()`;
    const msg = JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr } });

    await new Promise((resolve) => {
        const net = require('net');
        const { randomBytes } = require('crypto');
        const key = randomBytes(16).toString('base64');
        const sock = net.connect(wsPort, host);
        let buf = Buffer.alloc(0);
        let upgraded = false;
        const done = () => { try { sock.destroy(); } catch {} resolve(); };

        sock.on('connect', () => {
            sock.write(
                `GET ${wsPath} HTTP/1.1\r\n` +
                `Host: ${host}:${wsPort}\r\n` +
                `Upgrade: websocket\r\nConnection: Upgrade\r\n` +
                `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
            );
        });

        sock.on('data', chunk => {
            buf = Buffer.concat([buf, chunk]);
            if (!upgraded) {
                const idx = buf.indexOf('\r\n\r\n');
                if (idx === -1) return;
                upgraded = true;
                buf = buf.slice(idx + 4);
                // Gửi lệnh CDP Runtime.evaluate
                sock.write(buildWsTextFrame(msg));
                // Đóng sau khi nhận response (không cần parse)
                setTimeout(done, 2000);
            }
        });

        sock.on('error', () => resolve()); // Không throw — lỗi được log ở trên
        setTimeout(done, 25000); // Safety timeout 25s
    });

    console.log('[CDP] Inject thành công vào', wsUrl);
}

// Chơi game — hỗ trợ CDP inject cho bundled games
ipcMain.handle('launch-game', async (event, gamePath) => {
    const { spawn } = require('child_process');

    // Danh sách tên exe phổ biến theo thứ tự ưu tiên
    const commonExeNames = ['Game.exe', 'nw.exe', 'Start_Game.exe', 'Play.exe', 'RPGGame.exe'];
    let exePath = null;

    for (const name of commonExeNames) {
        const candidate = path.join(gamePath, name);
        if (fs.existsSync(candidate)) { exePath = candidate; break; }
    }

    // Fallback: quét tất cả *.exe (bỏ qua Uninstall*)
    if (!exePath) {
        const files = fs.readdirSync(gamePath);
        const exe = files.find(f =>
            f.toLowerCase().endsWith('.exe') &&
            !f.toLowerCase().startsWith('uninstall')
        );
        if (exe) exePath = path.join(gamePath, exe);
    }

    if (!exePath) throw new Error('Không tìm thấy file .exe nào trong thư mục game!');

    // Kiểm tra bundled-hack mode
    const markerPath = getBundledMarkerPath(gamePath);
    const args = [];
    let cheatPath = null;

    if (fs.existsSync(markerPath)) {
        cheatPath = fs.readFileSync(markerPath, 'utf8').trim();
        if (fs.existsSync(cheatPath)) {
            // Mở debug port để CDP có thể kết nối sau
            args.push('--remote-debugging-port=9222');
        }
    }

    const child = spawn(exePath, args, { cwd: gamePath, detached: true, stdio: 'ignore' });
    child.unref();

    // Inject cheat engine qua CDP (async — không block UI)
    if (cheatPath && fs.existsSync(cheatPath)) {
        injectViaCDP(9222, cheatPath).catch(e => console.error('[CDP inject error]', e));
    }

    return true;
});

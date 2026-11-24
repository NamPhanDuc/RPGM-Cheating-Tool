(function() {
    // Không chạy lại nếu đã được inject
    if (window.CheatEngine) return;

    // Detect RPG Maker MV vs MZ
    const isRMMZ = typeof ColorManager !== 'undefined';

    // Default keybindings config object
    const defaultKeybinds = {
        togglePanel: { key: 'KeyF', label: 'Toggle Panel' },
        godMode: { key: '', label: 'God Mode' },
        infGold: { key: '', label: 'Infinite Gold' },
        maxStats: { key: '', label: 'Max Stats' },
        charSpeedUp: { key: 'BracketRight', label: 'Char Speed +' },
        charSpeedDown: { key: 'BracketLeft', label: 'Char Speed -' },
        noClip: { key: 'KeyH', label: 'No Walls' },
        noEncounter: { key: '', label: 'No Encounter' },
        gameSpeedUp: { key: 'Equal', label: 'Game Speed +' },
        gameSpeedDown: { key: 'Minus', label: 'Game Speed -' },
        quickSave: { key: '', label: 'Quick Save' },
        quickLoad: { key: '', label: 'Quick Load' },
        teleportPanel: { key: 'KeyT', label: 'Teleport Panel' },
        savePos: { key: 'KeyG', label: 'Save Position' },
        forceSkip: { key: '', label: 'Force Skip (Ctrl)' },
        timeForward: { key: '', label: 'Time Skip ⏩' },
        timeBackward: { key: '', label: 'Time Skip ⏪' },
        winBattle: { key: '', label: 'Win Battle Now' }
    };

    // Generate unique prefix for this game
    function computeGamePrefix() {
        let gameTitle = 'default';
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', 'data/System.json', false);
            xhr.send();
            if (xhr.status === 200 || xhr.status === 0) {
                const sys = JSON.parse(xhr.responseText);
                if (sys && sys.gameTitle) gameTitle = sys.gameTitle;
            }
        } catch(e) {
            try {
                const xhr2 = new XMLHttpRequest();
                xhr2.open('GET', 'www/data/System.json', false);
                xhr2.send();
                if (xhr2.status === 200 || xhr2.status === 0) {
                    const sys = JSON.parse(xhr2.responseText);
                    if (sys && sys.gameTitle) gameTitle = sys.gameTitle;
                }
            } catch(e2) {}
        }
        
        // Hash đầy đủ đường dẫn game để đảm bảo 100% unique cho từng game riêng biệt
        const rawPath = decodeURIComponent(window.location.pathname || window.location.href || '');
        let hash = 5381;
        for (let i = 0; i < rawPath.length; i++) {
            hash = ((hash << 5) + hash) + rawPath.charCodeAt(i);
            hash = hash & hash;
        }
        const cleanTitle = (gameTitle || 'RPGM').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
        return 'ce_' + cleanTitle + '_' + Math.abs(hash).toString(36) + '_';
    }

    const PREFIX = computeGamePrefix();
    window.CE_PREFIX = PREFIX;

    function readStorageJson(storageKey, fallback) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw === null || raw === undefined || raw === '') return fallback;
            const parsed = JSON.parse(raw);
            return parsed !== null && parsed !== undefined ? parsed : fallback;
        } catch (e) {
            return fallback;
        }
    }

    let savedKeybinds = readStorageJson(PREFIX + 'keybinds', null);
    if (savedKeybinds && (!savedKeybinds.togglePanel || savedKeybinds.togglePanel.key === 'F1' || (savedKeybinds.godMode && savedKeybinds.godMode.key === 'F2'))) {
        savedKeybinds = null;
    }

    let savedState = readStorageJson(PREFIX + 'state', {});

    // State của Cheat Engine - hoàn toàn độc lập cho từng game
    window.CheatEngine = {
        godMode: savedState.godMode || false,
        infGold: savedState.infGold || false,
        maxStats: savedState.maxStats || false,
        speedBoost: savedState.speedBoost || 0,
        noClip: savedState.noClip || false,
        noEncounter: savedState.noEncounter || false,
        forceSkip: savedState.forceSkip || false,
        gameSpeed: savedState.gameSpeed || 1,
        autoWin: savedState.autoWin || false,
        oneHitKill: savedState.oneHitKill || false,
        autoSaveEnabled: savedState.autoSaveEnabled || false,
        autoSaveMinutes: savedState.autoSaveMinutes || 5,
        showFloatingTp: savedState.showFloatingTp !== undefined ? savedState.showFloatingTp : false,
        pinnedVars: readStorageJson(PREFIX + 'pinned-vars', []),
        timeHack: readStorageJson(PREFIX + 'time', { varId: 0, dayVarId: 0, minVal: 0, maxVal: 23, step: 1, autoReload: true, changeDay: true }),
        visible: true,
        minimized: false,
        initialized: false,
        togglesHidden: readStorageJson(PREFIX + 'toggles-hidden', false),
        keybinds: savedKeybinds || JSON.parse(JSON.stringify(defaultKeybinds)),
        savedPositions: readStorageJson(PREFIX + 'positions', []),
        activeTags: readStorageJson(PREFIX + 'active-tags', []),
        allTags: readStorageJson(PREFIX + 'all-tags', []),
        tagFilterMode: localStorage.getItem(PREFIX + 'tag-filter-mode') || 'OR',
        macros: readStorageJson(PREFIX + 'macros', []),
        lastPos: readStorageJson(PREFIX + 'lastpos', null),
        panelRect: readStorageJson(PREFIX + 'rect', { w: 340, h: null, x: 20, y: 20 })
    };
    const CE = window.CheatEngine;
    if (!CE.keybinds.savePos) CE.keybinds.savePos = { key: 'KeyG', label: 'Save Position' };
    if (!CE.keybinds.forceSkip) CE.keybinds.forceSkip = { key: '', label: 'Force Skip (Ctrl)' };
    if (!CE.keybinds.timeForward) CE.keybinds.timeForward = { key: '', label: 'Time Skip ⏩' };
    if (!CE.keybinds.timeBackward) CE.keybinds.timeBackward = { key: '', label: 'Time Skip ⏪' };
    if (!CE.keybinds.charSpeedUp) CE.keybinds.charSpeedUp = { key: 'BracketRight', label: 'Char Speed +' };
    if (!CE.keybinds.charSpeedDown) CE.keybinds.charSpeedDown = { key: 'BracketLeft', label: 'Char Speed -' };
    if (!CE.keybinds.gameSpeedUp) CE.keybinds.gameSpeedUp = { key: 'Equal', label: 'Game Speed +' };
    if (!CE.keybinds.gameSpeedDown) CE.keybinds.gameSpeedDown = { key: 'Minus', label: 'Game Speed -' };
    if (!CE.keybinds.winBattle) CE.keybinds.winBattle = { key: '', label: 'Win Battle Now' };
    
    // Cleanup old keybinds if they exist
    delete CE.keybinds.moveSpeed;
    delete CE.keybinds.gameSpeed;
    
    if (CE.showFloatingTp === undefined) {
        CE.showFloatingTp = savedState.showFloatingTp !== undefined ? savedState.showFloatingTp : false;
    }

    // Migration cho các phiên bản trước
    if (CE.timeHack.dayVarId === undefined) CE.timeHack.dayVarId = 0;
    if (CE.timeHack.minVal === undefined) CE.timeHack.minVal = 0;
    if (CE.timeHack.changeDay === undefined) CE.timeHack.changeDay = true;
    if (CE.timeHack.weekdayVarId === undefined) CE.timeHack.weekdayVarId = 0;
    if (CE.timeHack.minWeekday === undefined) CE.timeHack.minWeekday = 1;
    if (CE.timeHack.maxWeekday === undefined) CE.timeHack.maxWeekday = 7;

    // Khởi tạo engine sau khi scripts load xong (1.5s là đủ an toàn)
    setTimeout(() => {
        if (!CE.initialized) {
            initEngine();
        }
    }, 1500);

    function initEngine() {
        CE.initialized = true;
        injectCSS();
        buildUI();
        initHooks();
        initEvents();
        initKeybindingSystem();
        initResizeSystem();
        loadState();
        startStatusBarUpdater();
        const toggleKeyLabel = keyCodeToLabel(CE.keybinds.togglePanel.key) || 'F';
        showToast(`🚀 Cheat Engine đã sẵn sàng! (Nút ${toggleKeyLabel} để ẩn/hiện)`, 'success');
    }

    // ==========================================
    // 1. CSS INJECTION
    // ==========================================
    function injectCSS() {
        const style = document.createElement('style');
        style.id = 'ce-styles';
        style.innerHTML = `
            :root {
                --ce-bg: rgba(15, 15, 35, 0.92);
                --ce-accent: #667eea;
                --ce-accent-hover: #764ba2;
                --ce-success: #4ade80;
                --ce-danger: #ef4444;
                --ce-warning: #f59e0b;
                --ce-text: #f3f4f6;
                --ce-text-muted: #9ca3af;
                --ce-border: rgba(255, 255, 255, 0.1);
            }

            #ce-panel {
                position: fixed;
                background: var(--ce-bg);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px rgba(102, 126, 234, 0.3);
                border: 1px solid var(--ce-border);
                color: var(--ce-text);
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 14px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                transition: opacity 0.3s;
                overflow: hidden;
                max-height: 90vh; /* Ngăn panel vượt quá 90% màn hình */
            }

            #ce-panel.ce-hidden {
                opacity: 0;
                pointer-events: none;
            }

            /* Custom Scrollbar for Panel */
            #ce-panel ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            #ce-panel ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
            }
            #ce-panel ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
            }
            #ce-panel ::-webkit-scrollbar-thumb:hover {
                background: var(--ce-accent);
            }

            #ce-panel.ce-minimized #ce-body,
            #ce-panel.ce-minimized #ce-footer {
                display: none;
            }

            /* Header */
            #ce-header {
                padding: 12px 16px;
                background: linear-gradient(135deg, var(--ce-accent), var(--ce-accent-hover));
                cursor: grab;
                display: flex;
                justify-content: space-between;
                align-items: center;
                user-select: none;
                flex-shrink: 0; /* Không co lại */
            }
            #ce-header:active {
                cursor: grabbing;
            }
            #ce-title {
                font-weight: bold;
                font-size: 16px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
            .ce-btn-group {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            .ce-btn-group button {
                background: transparent;
                border: none;
                color: white;
                font-size: 16px;
                cursor: pointer;
                padding: 0 4px;
                opacity: 0.8;
                transition: opacity 0.2s;
            }
            .ce-btn-group button:hover {
                opacity: 1;
            }

            /* Body */
            #ce-body {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
            }

            /* Toggles */
            #ce-toggles-header {
                font-size: 11px;
                color: var(--ce-accent);
                cursor: pointer;
                padding: 4px 0;
                margin-bottom: 4px;
                display: flex;
                justify-content: space-between;
                text-transform: uppercase;
                letter-spacing: 1px;
                user-select: none;
                flex-shrink: 0;
            }
            #ce-toggles-container {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 12px;
                flex-shrink: 0;
            }
            #ce-toggles-container.collapsed {
                display: none;
            }
            .ce-toggle-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                min-height: 38px;
                flex-shrink: 0;
            }
            .ce-toggle-label {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ce-hotkey {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                color: var(--ce-text-muted);
            }

            /* Switch (iOS style) */
            .ce-switch {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
            }
            .ce-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .ce-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(255,255,255,0.2);
                transition: .3s;
                border-radius: 20px;
            }
            .ce-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .3s;
                border-radius: 50%;
            }
            input:checked + .ce-slider {
                background-color: var(--ce-success);
            }
            input:checked + .ce-slider:before {
                transform: translateX(16px);
            }

            /* Universal Box-Sizing & Reset for Panel */
            #ce-panel, #ce-panel * {
                box-sizing: border-box;
            }
            #ce-panel button, #ce-panel input, #ce-panel select {
                font-family: inherit;
            }

            /* Main Navigation Tabs */
            #ce-tabs {
                display: flex;
                gap: 4px;
                border-bottom: 1px solid var(--ce-border);
                padding-bottom: 8px;
                flex-shrink: 0;
            }
            #ce-tabs .ce-tab-btn {
                flex: 1;
                min-width: 0;
                height: 46px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid var(--ce-border);
                color: var(--ce-text-muted);
                padding: 4px 2px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 11px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2px;
                flex-shrink: 0;
                overflow: hidden;
            }
            #ce-tabs .ce-tab-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }
            #ce-tabs .ce-tab-btn.active {
                background: var(--ce-accent);
                color: white;
                border-color: var(--ce-accent);
            }
            #ce-tabs .ce-tab-btn .ce-tab-icon {
                font-size: 14px;
                line-height: 1;
                pointer-events: none;
            }
            #ce-tabs .ce-tab-btn .ce-tab-name {
                font-size: 10px;
                line-height: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                pointer-events: none;
            }

            /* Sub Tabs (within individual panels) */
            .ce-sub-tabs .ce-tab-btn, #tab-saves .ce-tab-btn {
                flex: 1;
                background: transparent;
                border: 1px solid var(--ce-border);
                color: var(--ce-text-muted);
                padding: 4px 6px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 11px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .ce-sub-tabs .ce-tab-btn:hover, #tab-saves .ce-tab-btn:hover {
                background: rgba(255, 255, 255, 0.08);
            }
            .ce-sub-tabs .ce-tab-btn.active, #tab-saves .ce-tab-btn.active {
                background: var(--ce-accent);
                color: white;
                border-color: var(--ce-accent);
            }

            /* Tab Content */
            .ce-tab-content {
                display: none;
                flex-direction: column;
                gap: 8px;
                flex: 1;
                min-height: 0;
            }
            .ce-tab-content.active {
                display: flex;
            }
            .ce-search {
                width: 100%;
                padding: 8px;
                background: rgba(0,0,0,0.2);
                border: 1px solid var(--ce-border);
                border-radius: 6px;
                color: white;
                outline: none;
                box-sizing: border-box;
                flex-shrink: 0;
            }
            .ce-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding-right: 4px;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
            }
            /* Scrollbar */
            .ce-list::-webkit-scrollbar { width: 6px; }
            .ce-list::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
            .ce-list::-webkit-scrollbar-thumb { background: var(--ce-accent); border-radius: 4px; }

            .ce-list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 8px;
                background: rgba(255,255,255,0.03);
                border-radius: 6px;
                font-size: 12px;
                line-height: 1.4;
                min-height: 34px;
                flex-shrink: 0;
            }
            .ce-list-item:hover {
                background: rgba(255,255,255,0.08);
            }
            .ce-item-name {
                flex: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-right: 8px;
            }
            .ce-action-btn {
                background: var(--ce-accent);
                border: none;
                color: white;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                line-height: 1.2;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.2s;
            }
            .ce-action-btn:hover:not(:disabled) { background: var(--ce-accent-hover); }
            .ce-action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                filter: grayscale(1);
            }

            /* Footer */
            #ce-footer {
                padding: 10px 12px;
                background: rgba(0,0,0,0.3);
                border-top: 1px solid var(--ce-border);
                display: flex;
                flex-direction: column;
                gap: 8px;
                flex-shrink: 0;
            }
            .ce-quick-saves {
                display: flex;
                gap: 8px;
            }
            .ce-quick-saves button {
                flex: 1;
                background: rgba(255,255,255,0.1);
                border: 1px solid var(--ce-border);
                color: white;
                padding: 6px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
            }
            .ce-quick-saves button:hover {
                background: rgba(255,255,255,0.2);
            }
            #ce-statusbar {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: var(--ce-text-muted);
            }

            /* Toasts */
            #ce-toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }
            .ce-toast {
                background: rgba(15, 15, 35, 0.95);
                color: white;
                padding: 10px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 10px;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 13px;
                border-left: 4px solid var(--ce-accent);
                animation: ceSlideIn 0.3s ease-out forwards;
                opacity: 0;
                transform: translateX(100%);
            }
            .ce-toast.success { border-left-color: var(--ce-success); }
            .ce-toast.error { border-left-color: var(--ce-danger); }
            .ce-toast.warning { border-left-color: var(--ce-warning); }
            .ce-toast.ce-fadeout {
                animation: ceFadeOut 0.3s ease-in forwards;
            }

            @keyframes ceSlideIn {
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes ceFadeOut {
                to { opacity: 0; transform: translateY(-10px); }
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .ce-sub-tabs {
                display: flex;
                gap: 4px;
                margin-bottom: 4px;
                flex-shrink: 0;
            }
            .ce-map-label {
                font-size: 11px;
                color: var(--ce-text-muted);
                margin-bottom: 4px;
                flex-shrink: 0;
            }
            .ce-speed-btn {
                width: 36px;
                padding: 2px;
            }
            .ce-var-input {
                width: 60px;
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--ce-border);
                color: white;
                border-radius: 4px;
                padding: 2px;
            }

            /* Multi-Directional Resize Handles */
            .ce-resizer {
                position: absolute;
                z-index: 100;
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            /* 4 Edges */
            .ce-resizer-t {
                top: 0;
                left: 10px;
                right: 10px;
                height: 6px;
                cursor: ns-resize;
            }
            .ce-resizer-b {
                bottom: 0;
                left: 10px;
                right: 10px;
                height: 6px;
                cursor: ns-resize;
            }
            .ce-resizer-l {
                top: 10px;
                bottom: 10px;
                left: 0;
                width: 6px;
                cursor: ew-resize;
            }
            .ce-resizer-r {
                top: 10px;
                bottom: 10px;
                right: 0;
                width: 6px;
                cursor: ew-resize;
            }
            .ce-resizer-t:hover, .ce-resizer-b:hover,
            .ce-resizer-l:hover, .ce-resizer-r:hover {
                background: rgba(102, 126, 234, 0.35);
                border-radius: 3px;
            }
            /* 4 Corners */
            .ce-resizer-nw {
                top: 0;
                left: 0;
                width: 14px;
                height: 14px;
                cursor: nwse-resize;
                z-index: 101;
            }
            .ce-resizer-ne {
                top: 0;
                right: 0;
                width: 14px;
                height: 14px;
                cursor: nesw-resize;
                z-index: 101;
            }
            .ce-resizer-sw {
                bottom: 0;
                left: 0;
                width: 14px;
                height: 14px;
                cursor: nesw-resize;
                z-index: 101;
            }
            .ce-resizer-se, .ce-resize-handle {
                bottom: 0;
                right: 0;
                width: 18px;
                height: 18px;
                cursor: nwse-resize;
                z-index: 101;
                background: linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.2) 50%, transparent 50%, transparent 60%, var(--ce-accent) 60%);
                border-radius: 0 0 12px 0;
                opacity: 0.7;
                transition: opacity 0.2s, transform 0.1s;
                touch-action: none;
            }
            .ce-resize-handle:hover, .ce-resizer-se:hover {
                opacity: 1;
                filter: brightness(1.25);
            }

            /* Settings Panel */
            .ce-settings-panel {
                display: none;
                flex-direction: column;
                gap: 6px;
                padding: 8px;
                background: rgba(0,0,0,0.2);
                border-radius: 8px;
                margin-bottom: 8px;
                flex-shrink: 0;
            }
            .ce-settings-panel.active {
                display: flex;
            }
            .ce-keybind-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 8px;
                font-size: 12px;
                min-height: 32px;
                flex-shrink: 0;
            }
            .ce-keybind-btn {
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--ce-border);
                color: var(--ce-accent);
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-family: monospace;
                min-width: 50px;
                text-align: center;
                transition: all 0.2s;
            }
            .ce-keybind-btn:hover {
                border-color: var(--ce-accent);
            }
            .ce-keybind-btn.listening {
                background: var(--ce-accent);
                color: white;
                animation: pulse 1s infinite;
            }
            .ce-keybind-btn.empty {
                color: var(--ce-text-muted);
                border-style: dashed;
            }
            .ce-keybind-clear-btn {
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--ce-border);
                color: var(--ce-text-muted);
                border-radius: 4px;
                padding: 3px 6px;
                cursor: pointer;
                font-size: 11px;
                line-height: 1;
                transition: all 0.2s;
            }
            .ce-keybind-clear-btn:hover {
                border-color: var(--ce-danger);
                color: var(--ce-danger);
                background: rgba(239, 68, 68, 0.15);
            }

            /* Remap Game Keys Styles */
            .ce-remap-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid var(--ce-border);
                border-radius: 8px;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                transition: border-color 0.2s, background 0.2s;
                flex-shrink: 0;
            }
            .ce-remap-card:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(99, 102, 241, 0.35);
            }
            .ce-remap-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }
            .ce-remap-info {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                min-width: 0;
            }
            .ce-remap-icon {
                font-size: 16px;
                flex-shrink: 0;
            }
            .ce-remap-text {
                flex: 1;
                min-width: 0;
            }
            .ce-remap-title-row {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ce-remap-label {
                font-weight: 600;
                font-size: 12px;
                color: #fff;
            }
            .ce-remap-action-tag {
                font-size: 9px;
                background: rgba(0,0,0,0.3);
                color: var(--ce-text-muted);
                padding: 1px 5px;
                border-radius: 3px;
                font-family: monospace;
            }
            .ce-remap-desc {
                font-size: 10px;
                color: var(--ce-text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .ce-btn-remap-add {
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 4px;
            }
            .ce-btn-remap-add.listening {
                background: var(--ce-accent);
                color: white;
                animation: pulse 1s infinite;
            }
            .ce-remap-keys-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 5px;
                padding-top: 5px;
                border-top: 1px dashed rgba(255, 255, 255, 0.07);
            }
            .ce-key-chip {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 5px;
                padding: 2px 6px;
                font-size: 11px;
                color: #f1f5f9;
            }
            .ce-key-chip.custom {
                border-color: var(--ce-accent);
                background: rgba(99, 102, 241, 0.18);
                color: #e0e7ff;
            }
            .ce-key-chip-name {
                font-weight: 600;
                font-family: monospace, sans-serif;
            }
            .ce-key-chip-badge {
                font-size: 9px;
                background: var(--ce-accent);
                color: white;
                padding: 0 4px;
                border-radius: 3px;
                text-transform: uppercase;
                font-weight: 500;
            }
            .ce-key-chip-remove {
                background: none;
                border: none;
                color: var(--ce-text-muted);
                cursor: pointer;
                padding: 0 2px;
                font-size: 11px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 3px;
                transition: color 0.15s, background 0.15s;
            }
            .ce-key-chip-remove:hover {
                color: var(--ce-danger);
                background: rgba(239, 68, 68, 0.2);
            }
            .ce-no-keys-hint {
                font-size: 10px;
                color: var(--ce-text-muted);
                font-style: italic;
            }

            /* Saved Positions */
            .ce-saved-section {
                margin-bottom: 8px;
                border-bottom: 1px solid var(--ce-border);
                padding-bottom: 8px;
                flex-shrink: 0;
            }
            .ce-saved-title {
                font-size: 11px;
                color: var(--ce-accent);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .ce-tag {
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--ce-border);
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 10px;
                cursor: pointer;
                color: var(--ce-text-muted);
                user-select: none;
            }
            .ce-tag.active {
                background: var(--ce-accent);
                color: white;
                border-color: var(--ce-accent);
            }
            .ce-tag-filter-mode {
                background: transparent;
                border: 1px solid var(--ce-border);
                color: white;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                padding: 0 4px;
                user-select: none;
            }
            .ce-tag-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 12px;
                padding: 0 4px;
                opacity: 0.6;
                transition: opacity 0.2s;
            }
            .ce-tag-btn:hover {
                opacity: 1;
            }
            .ce-saved-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 8px;
                background: rgba(102, 126, 234, 0.1);
                border-radius: 6px;
                font-size: 12px;
                margin-bottom: 2px;
                min-height: 30px;
                flex-shrink: 0;
            }
            .ce-delete-btn, .ce-edit-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 14px;
                padding: 0 4px;
                opacity: 0.7;
                transition: opacity 0.2s, transform 0.1s;
            }
            .ce-delete-btn { color: var(--ce-danger); }
            .ce-edit-btn { color: var(--ce-accent); font-size: 13px; }
            .ce-delete-btn:hover, .ce-edit-btn:hover {
                opacity: 1;
                transform: scale(1.15);
            }

            /* Quick Teleport Mode (Chỉ hiện Saved Positions) */
            .teleport-mode-quick #ce-map-list-container {
                display: none !important;
            }
            .teleport-mode-quick #ce-btn-new-tag,
            .teleport-mode-quick #ce-btn-bulk-tag {
                display: none !important;
            }
            .teleport-mode-quick #ce-saved-positions-section {
                display: flex !important;
                flex: 1 !important;
                max-height: none !important;
                height: 100% !important;
                border-bottom: none !important;
            }
            .teleport-mode-quick #ce-list-saved-positions {
                max-height: none !important;
                flex: 1 !important;
            }
            #ce-panel:has(.teleport-mode-quick) #ce-footer {
                display: none !important;
            }

            /* Number Badge for Teleport */
            .ce-number-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                background: var(--ce-accent);
                color: white;
                border-radius: 4px;
                font-size: 10px;
                font-weight: bold;
                margin-right: 6px;
                flex-shrink: 0;
            }

            /* Settings button in header */
            .ce-settings-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 14px;
                cursor: pointer;
                padding: 0 4px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .ce-settings-btn:hover {
                opacity: 1;
            }
            .ce-settings-btn.active {
                opacity: 1;
                color: var(--ce-accent);
            }

            /* Macros */
            .ce-macro-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid var(--ce-border);
                border-radius: 8px;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 6px;
                flex-shrink: 0;
                transition: border-color 0.2s, background 0.2s;
            }
            .ce-macro-item:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(99, 102, 241, 0.35);
            }
            .ce-macro-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 6px;
            }
            .ce-macro-title {
                font-size: 13px;
                font-weight: bold;
                color: var(--ce-accent);
            }
            .ce-macro-row {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
            }
            .ce-macro-input {
                background: rgba(0,0,0,0.35);
                border: 1px solid var(--ce-border);
                color: white;
                padding: 4px 6px;
                border-radius: 4px;
                font-size: 11px;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.2s;
            }
            .ce-macro-input:focus {
                border-color: var(--ce-accent);
            }

            /* Var Watcher Overlay */
            #ce-var-watcher {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(15, 15, 35, 0.85);
                backdrop-filter: blur(8px);
                border: 1px solid var(--ce-border);
                border-radius: 8px;
                padding: 6px 10px;
                color: var(--ce-text);
                font-size: 11px;
                font-family: monospace;
                z-index: 99998;
                min-width: 150px;
                max-width: 300px;
                pointer-events: none;
                display: none;
            }
            #ce-var-watcher.active {
                display: block;
            }
            .ce-watcher-item {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .ce-watcher-name {
                color: var(--ce-text-muted);
                margin-right: 10px;
            }
            .ce-watcher-val {
                color: var(--ce-accent);
                font-weight: bold;
            }

            /* Pin button for vars */
            .ce-pin-btn {
                background: transparent;
                border: none;
                color: var(--ce-text-muted);
                cursor: pointer;
                font-size: 12px;
                padding: 0 4px;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            .ce-pin-btn:hover, .ce-pin-btn.pinned {
                opacity: 1;
                color: var(--ce-warning);
            }

            /* Item quantity controls */
            .ce-qty-controls {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .ce-qty-input {
                width: 45px;
                background: #111;
                border: 1px solid var(--ce-border);
                color: white;
                text-align: center;
                padding: 3px;
                border-radius: 4px;
                font-size: 11px;
            }
            .ce-qty-btn {
                background: var(--ce-accent);
                border: none;
                color: white;
                width: 28px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: background 0.2s;
            }
            .ce-qty-btn:hover {
                background: var(--ce-accent-hover);
            }
            .ce-qty-btn.remove {
                background: var(--ce-danger);
            }

            /* Event viewer */
            .ce-event-section {
                border-top: 1px solid var(--ce-border);
                padding-top: 6px;
                margin-top: 6px;
            }
            .ce-event-toggle {
                font-size: 11px;
                color: var(--ce-accent);
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            /* Auto-save indicator */
            .ce-autosave-row {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--ce-text-muted);
                padding: 4px 0;
            }
            .ce-autosave-row input[type="number"] {
                width: 40px;
            }

            /* Performance optimization for dragging/resizing */
            #ce-panel.ce-is-interacting {
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                box-shadow: 0 8px 30px rgba(0,0,0,0.85), 0 0 15px rgba(102, 126, 234, 0.4) !important;
                background: rgba(15, 15, 35, 0.98) !important;
                transition: none !important;
                will-change: left, top, width, height;
            }
            #ce-panel.ce-is-interacting * {
                pointer-events: none !important;
                user-select: none !important;
                -webkit-user-select: none !important;
            }
            #ce-panel.ce-is-interacting .ce-resizer,
            #ce-panel.ce-is-interacting .ce-resize-handle {
                pointer-events: auto !important;
            }

            /* Floating TP Icon */
            #ce-floating-tp {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 44px;
                height: 44px;
                background: rgba(15, 15, 35, 0.85);
                border: 2px solid var(--ce-accent);
                border-radius: 50%;
                color: white;
                font-size: 22px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                z-index: 99998;
                backdrop-filter: blur(5px);
                transition: transform 0.2s, background 0.2s;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                user-select: none;
            }
            #ce-floating-tp:hover {
                transform: scale(1.1);
                background: var(--ce-accent);
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // 2. UI CONSTRUCTION
    // ==========================================
    function buildUI() {
        const container = document.createElement('div');
        container.id = 'ce-panel';
        
        // Clamp to screen safely
        const winW = window.innerWidth || 800;
        const winH = window.innerHeight || 600;
        let px = (typeof CE.panelRect.x === 'number') ? CE.panelRect.x : 20;
        let py = (typeof CE.panelRect.y === 'number') ? CE.panelRect.y : 20;
        let pw = Math.max(280, Math.min(CE.panelRect.w || 340, winW - 20));
        
        if (px < 0) px = 10;
        if (py < 0) py = 10;
        if (px > winW - 60) px = Math.max(10, winW - pw - 10);
        if (py > winH - 40) py = Math.max(10, winH - 100);

        container.style.left = px + 'px';
        container.style.top = py + 'px';
        container.style.width = pw + 'px';
        if (CE.panelRect.h) {
            const ph = Math.max(180, Math.min(CE.panelRect.h, winH - 20));
            container.style.height = ph + 'px';
        }

        container.innerHTML = `
            <div id="ce-header">
                <div id="ce-title">🎮 RPGM CHEATS</div>
                <div class="ce-btn-group">
                    <button class="ce-settings-btn" id="ce-btn-settings">⚙️</button>
                    <button id="ce-btn-min">_</button>
                    <button id="ce-btn-close">✕</button>
                </div>
            </div>
            <div id="ce-body">
                <!-- Settings Panel -->
                <div class="ce-settings-panel" id="ce-settings-panel">
                    <div style="font-size: 11px; color: var(--ce-warning); margin-bottom: 4px;">KEYBINDINGS</div>
                    <div id="ce-keybinds-list"></div>
                </div>

                <div id="ce-toggles-header">
                    <span>▼ Active Cheats</span>
                </div>
                <div id="ce-toggles-container">
                    ${buildToggle('God Mode', keyCodeToLabel(CE.keybinds.godMode.key), 'godMode')}
                    ${buildToggle('Infinite Gold', keyCodeToLabel(CE.keybinds.infGold.key), 'infGold')}
                    ${buildToggle('Max Stats', keyCodeToLabel(CE.keybinds.maxStats.key), 'maxStats')}
                    ${buildNumberInput('Move Speed (+)', keyCodeToLabel(CE.keybinds.charSpeedUp.key)+'/'+keyCodeToLabel(CE.keybinds.charSpeedDown.key), 'speedBoost', 0, 5, 0.5, CE.speedBoost)}
                    ${buildToggle('No Walls', keyCodeToLabel(CE.keybinds.noClip.key), 'noClip')}
                    ${buildToggle('No Encounter', keyCodeToLabel(CE.keybinds.noEncounter.key), 'noEncounter')}
                    ${buildToggle('Force Skip Text', keyCodeToLabel(CE.keybinds.forceSkip.key), 'forceSkip')}
                    ${buildToggle('Auto-Win Battle', '', 'autoWin')}
                    ${buildToggle('One-Hit Kill', '', 'oneHitKill')}
                    ${buildNumberInput('Game Speed (x)', keyCodeToLabel(CE.keybinds.gameSpeedUp.key)+'/'+keyCodeToLabel(CE.keybinds.gameSpeedDown.key), 'gameSpeed', 1, 10, 1, CE.gameSpeed)}
                    ${buildToggle('Floating TP Icon', '', 'showFloatingTp')}
                </div>
                
                <div id="ce-tabs">
                    <button class="ce-tab-btn active" data-tab="items"><span class="ce-tab-icon">🎒</span><span class="ce-tab-name">Items</span></button>
                    <button class="ce-tab-btn" data-tab="vars"><span class="ce-tab-icon">🔧</span><span class="ce-tab-name">Vars</span></button>
                    <button class="ce-tab-btn" data-tab="teleport"><span class="ce-tab-icon">🗺️</span><span class="ce-tab-name">Map</span></button>
                    <button class="ce-tab-btn" data-tab="time"><span class="ce-tab-icon">⏳</span><span class="ce-tab-name">Time</span></button>
                    <button class="ce-tab-btn" data-tab="macros"><span class="ce-tab-icon">🚀</span><span class="ce-tab-name">Macros</span></button>
                    <button class="ce-tab-btn" data-tab="keys"><span class="ce-tab-icon">⌨️</span><span class="ce-tab-name">Keys</span></button>
                    <button class="ce-tab-btn" data-tab="saves"><span class="ce-tab-icon">💾</span><span class="ce-tab-name">Saves</span></button>
                </div>

                <!-- Saves Tab -->
                <div id="tab-saves" class="ce-tab-content" style="flex-direction:column; height:100%;">
                    
                    
                    <div style="display:flex; gap:4px; margin-bottom:8px;">
                        <button class="ce-tab-btn active" id="ce-cat-normal" style="flex:1; padding:4px;">Normal (21-80)</button>
                        <button class="ce-tab-btn" id="ce-cat-quick" style="flex:1; padding:4px;">Quick (81-90)</button>
                        <button class="ce-tab-btn" id="ce-cat-auto" style="flex:1; padding:4px;">Auto (91-100)</button>
                    </div>
                    
                    <div class="ce-list" id="ce-list-saves-combined" style="flex:1; overflow-y:auto; padding-right:4px;"></div>
                </div>

                <!-- Radar Tab -->
                  <div id="tab-radar" class="ce-tab-content">
                      <div style="display:flex; gap:8px; margin-bottom:8px;">
                          <input type="text" id="ce-radar-input" class="ce-search" placeholder="Enter NPC Name..." style="flex:1;">
                          <button id="ce-radar-btn" class="ce-action-btn" style="padding:4px 12px; background:var(--ce-accent);">Scan</button>
                      </div>
                      <div id="ce-radar-status" style="font-size:11px; color:var(--ce-warning); margin-bottom:8px; text-align:center;"></div>
                      <div class="ce-list" id="ce-radar-results" style="flex:1; max-height:280px;"></div>
                  </div>

                  <!-- Time Tab -->
                <div id="tab-time" class="ce-tab-content">
                    <div class="ce-settings-panel active" style="display:flex; padding:0; background:none; margin-bottom:0">
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Auto-reload Map</div>
                            <label class="ce-switch">
                                <input type="checkbox" id="ce-time-reload" ${CE.timeHack.autoReload ? 'checked' : ''}>
                                <span class="ce-slider"></span>
                            </label>
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Enable Day Loop</div>
                            <label class="ce-switch">
                                <input type="checkbox" id="ce-time-changeday" ${CE.timeHack.changeDay ? 'checked' : ''}>
                                <span class="ce-slider"></span>
                            </label>
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Time Var ID</div>
                            <input type="number" id="ce-time-varid" value="${CE.timeHack.varId}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Min Time</div>
                            <input type="number" id="ce-time-min" value="${CE.timeHack.minVal}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Max Time</div>
                            <input type="number" id="ce-time-max" value="${CE.timeHack.maxVal}" class="ce-var-input" min="1" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Day Var ID (Optional)</div>
                            <input type="number" id="ce-time-dayvar" value="${CE.timeHack.dayVarId}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Weekday Var ID (Optional)</div>
                            <input type="number" id="ce-time-weekdayvar" value="${CE.timeHack.weekdayVarId}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Min Weekday</div>
                            <input type="number" id="ce-time-minweekday" value="${CE.timeHack.minWeekday}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Max Weekday</div>
                            <input type="number" id="ce-time-maxweekday" value="${CE.timeHack.maxWeekday}" class="ce-var-input" min="0" style="width: 60px;">
                        </div>
                        <div class="ce-toggle-row">
                            <div class="ce-toggle-label">Step (+/-)</div>
                            <input type="number" id="ce-time-step" value="${CE.timeHack.step}" class="ce-var-input" min="1" style="width: 60px;">
                        </div>
                        <div style="display:flex; gap: 8px; margin-top: 10px;">
                            <button id="ce-btn-time-back" class="ce-action-btn" style="flex:1; background:var(--ce-danger)">⏪ Back [${keyCodeToLabel(CE.keybinds.timeBackward.key)}]</button>
                            <button id="ce-btn-time-fwd" class="ce-action-btn" style="flex:1; background:var(--ce-success)">Skip ⏩ [${keyCodeToLabel(CE.keybinds.timeForward.key)}]</button>
                        </div>
                    </div>
                </div>

                <!-- Macros Tab -->
                <div id="tab-macros" class="ce-tab-content">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                        <span class="ce-saved-title" style="margin-bottom:0">🚀 AUTO-CHEAT MACROS</span>
                        <button id="ce-btn-add-macro" class="ce-action-btn" style="background:var(--ce-success)">+ Add Macro</button>
                    </div>
                    <div class="ce-list" id="ce-list-macros" style="display:flex; flex-direction:column;"></div>
                </div>

                <!-- Game Keys Tab -->
                <div id="tab-keys" class="ce-tab-content" style="flex-direction:column; height:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-shrink:0;">
                        <div>
                            <span class="ce-saved-title" style="margin-bottom:0">🎮 REMAP PHÍM GAME</span>
                            <div style="font-size:10px; color:var(--ce-text-muted)">Gán hoặc gỡ phím trong game. Có hiệu lực ngay!</div>
                        </div>
                        <button id="ce-btn-reset-game-keys" class="ce-action-btn" style="background:var(--ce-danger);" title="Khôi phục toàn bộ phím về mặc định">🔄 Reset Mặc Định</button>
                    </div>
                    <div id="ce-game-keys-listening-banner" style="display:none; padding:6px 10px; background:rgba(99,102,241,0.2); border:1px solid var(--ce-accent); border-radius:6px; font-size:11px; margin-bottom:8px; text-align:center; color:white; flex-shrink:0;">
                        ⏳ Đang chờ nhấn phím cho: <b id="ce-listening-action-name">-</b><br>
                        <span style="font-size:10px; color:var(--ce-text-muted);">Nhấn phím bạn muốn gán. Nhấn <b>ESC</b> để hủy.</span>
                    </div>
                    <div class="ce-list" id="ce-game-keys-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; padding-right:4px;"></div>
                </div>

                <!-- Items Tab -->
                <div id="tab-items" class="ce-tab-content active">
                    <div class="ce-sub-tabs">
                        <button class="ce-tab-btn active" id="ce-filter-item">Items</button>
                        <button class="ce-tab-btn" id="ce-filter-weapon">Weapons</button>
                        <button class="ce-tab-btn" id="ce-filter-armor">Armors</button>
                    </div>
                    <input type="text" class="ce-search" id="ce-search-items" placeholder="Search...">
                    <div class="ce-list" id="ce-list-items"></div>
                    <div class="ce-pagination" id="ce-page-items" style="display:none; justify-content:center; align-items:center; gap:10px; margin-top:4px; flex-shrink:0;">
                        <button class="ce-action-btn" id="ce-btn-prev-items">◀</button>
                        <span id="ce-page-info-items" style="font-size:12px;">1/1</span>
                        <button class="ce-action-btn" id="ce-btn-next-items">▶</button>
                    </div>
                </div>

                <!-- Vars/Switches Tab -->
                <div id="tab-vars" class="ce-tab-content">
                    <div class="ce-sub-tabs">
                        <button class="ce-tab-btn active" id="ce-filter-switch">Switches</button>
                        <button class="ce-tab-btn" id="ce-filter-var">Variables</button>
                    </div>
                    <input type="text" class="ce-search" id="ce-search-vars" placeholder="Search ID/Name, or =10, >5, <100">
                    <div class="ce-list" id="ce-list-vars"></div>
                    <div class="ce-pagination" id="ce-page-vars" style="display:none; justify-content:center; align-items:center; gap:10px; margin-top:4px; flex-shrink:0;">
                        <button class="ce-action-btn" id="ce-btn-prev-vars">◀</button>
                        <span id="ce-page-info-vars" style="font-size:12px;">1/1</span>
                        <button class="ce-action-btn" id="ce-btn-next-vars">▶</button>
                    </div>
                </div>

                <!-- Teleport Tab -->
                <div id="tab-teleport" class="ce-tab-content">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-shrink:0; gap:4px;">
                        <div id="ce-current-map" class="ce-map-label" style="margin-bottom:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Current: ...</div>
                        <div style="display:flex; gap:4px; flex-shrink:0;">
                            <button id="ce-btn-new-tag" class="ce-action-btn" style="padding:2px 6px; font-size:11px; background:rgba(0,180,80,0.2); color:var(--ce-success); border:1px solid var(--ce-success);">+ Tag</button>
                            <button id="ce-btn-bulk-tag" class="ce-action-btn" style="padding:2px 6px; font-size:11px; background:rgba(200,150,0,0.2); color:var(--ce-warning); border:1px solid var(--ce-warning);">Gắn nhanh</button>
                            <button id="ce-btn-undo-tp" class="ce-action-btn" style="background:var(--ce-warning); padding:2px 6px; font-size:11px;" ${CE.lastPos ? '' : 'disabled'}>🔙 Undo TP</button>
                        </div>
                    </div>
                    
                    <div class="ce-saved-section" id="ce-saved-positions-section" style="display:none; flex-direction:column; flex-shrink:0; max-height:150px;">
                        <div class="ce-saved-title" style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Saved Positions</span>
                        </div>
                        <div id="ce-tag-filter-section" style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; padding: 2px 0;"></div>
                        <div class="ce-list" id="ce-list-saved-positions" style="flex:1; overflow-y:auto;"></div>
                    </div>

                    

                    <div id="ce-map-list-container" style="display:flex; flex-direction:column; flex:1; min-height:0;">
                        <input type="text" class="ce-search" id="ce-search-map" placeholder="Search map..." style="flex-shrink:0;">
                        <div class="ce-list" id="ce-list-maps"></div>
                        <div class="ce-pagination" id="ce-page-maps" style="display:none; justify-content:center; align-items:center; gap:10px; margin-top:4px; flex-shrink:0;">
                            <button class="ce-action-btn" id="ce-btn-prev-maps">◀</button>
                            <span id="ce-page-info-maps" style="font-size:12px;">1/1</span>
                            <button class="ce-action-btn" id="ce-btn-next-maps">▶</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="ce-footer">
                <div class="ce-quick-saves">
                    <button id="ce-btn-savepos">📍 Save Pos [${keyCodeToLabel(CE.keybinds.savePos.key)}]</button>
                    <button id="ce-btn-qsave">💾 Q.Save [${keyCodeToLabel(CE.keybinds.quickSave.key)}]</button>
                    <button id="ce-btn-qload">📂 Q.Load [${keyCodeToLabel(CE.keybinds.quickLoad.key)}]</button>
                </div>
                <div class="ce-autosave-row">
                    <label class="ce-switch" style="transform:scale(0.8)">
                        <input type="checkbox" id="ce-autosave-toggle" ${CE.autoSaveEnabled ? 'checked' : ''}>
                        <span class="ce-slider"></span>
                    </label>
                    <span>Auto Save every</span>
                    <input type="number" id="ce-autosave-minutes" value="${CE.autoSaveMinutes}" min="1" max="60" class="ce-var-input" style="width:40px;"> 
                    <span>min</span>
                </div>
                <div id="ce-statusbar">
                    <span id="ce-st-hp">HP: -/-</span>
                    <span id="ce-st-mp">MP: -/-</span>
                    <span id="ce-st-gold">Gold: 0</span>
                    <button id="ce-btn-add-gold" title="+100,000 Gold" style="background:var(--ce-success); border:none; color:white; font-size:10px; padding:0 4px; border-radius:4px; cursor:pointer;">+100K 💰</button>
                </div>
            </div>
            <!-- Multi-Directional Resize Handles -->
            <div class="ce-resizer ce-resizer-t" data-dir="t"></div>
            <div class="ce-resizer ce-resizer-b" data-dir="b"></div>
            <div class="ce-resizer ce-resizer-l" data-dir="l"></div>
            <div class="ce-resizer ce-resizer-r" data-dir="r"></div>
            <div class="ce-resizer ce-resizer-nw" data-dir="nw"></div>
            <div class="ce-resizer ce-resizer-ne" data-dir="ne"></div>
            <div class="ce-resizer ce-resizer-sw" data-dir="sw"></div>
            <div class="ce-resize-handle ce-resizer-se" id="ce-resize-handle" data-dir="se" title="Kéo để đổi kích thước"></div>
        `;
        document.body.appendChild(container);

        // Floating Teleport Icon
        const floatTp = document.createElement('div');
        floatTp.id = 'ce-floating-tp';
        floatTp.innerHTML = '🗺️';
        floatTp.title = 'Quick Teleport';
        floatTp.style.display = CE.showFloatingTp && !CE.visible ? 'flex' : 'none';
        floatTp.addEventListener('mousedown', (e) => e.stopPropagation());
        floatTp.addEventListener('mouseup', (e) => e.stopPropagation());
        floatTp.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!CE.visible) togglePanel(true);
            const mapTabBtn = document.querySelector('.ce-tab-btn[data-tab="teleport"]');
            if (mapTabBtn) {
                mapTabBtn.click();
                document.getElementById('tab-teleport').classList.add('teleport-mode-quick');
                document.getElementById('ce-footer').style.display = 'none';
                if (!CE.togglesHidden) {
                    CE.togglesHidden = true;
                    localStorage.setItem(PREFIX + 'toggles-hidden', true);
                    document.getElementById('ce-toggles-container').classList.add('collapsed');
                    document.getElementById('ce-toggles-header').innerHTML = '<span>▶ Active Cheats</span>';
                }
                document.getElementById('ce-settings-panel').classList.remove('active');
            }
        });
        document.body.appendChild(floatTp);

        // Chống click lọt xuống game (prevent passthrough)
        const preventPassThrough = (e) => e.stopPropagation();
        ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'wheel', 'touchstart', 'touchmove', 'touchend'].forEach(type => {
            container.addEventListener(type, preventPassThrough);
        });

        // Ngăn RPG Maker chặn các phím Backspace, Arrow keys khi đang gõ vào ô Input
        container.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') {
                e.stopPropagation();
            }
        });

        // Toast Container
        // Bulk Tag Assignment Modal
        const bulkModal = document.createElement('div');
        bulkModal.id = 'ce-bulk-modal';
        bulkModal.style.cssText = 'display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(15,15,25,0.95); z-index:9999; flex-direction:column; padding:15px; backdrop-filter:blur(5px); border-radius:8px;';
        bulkModal.innerHTML = `
            <div style="font-weight:bold; margin-bottom:10px; color:var(--ce-accent); font-size:14px;">Gắn Tag Nhanh</div>
            <div style="display:flex; gap:8px; margin-bottom:10px;">
                <select id="ce-bulk-tag-select" style="flex:1; background:rgba(0,0,0,0.5); color:white; border:1px solid var(--ce-border); padding:4px; border-radius:4px; outline:none;"></select>
            </div>
            <div id="ce-bulk-modal-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; justify-content:space-between; margin-top:10px;">
                <button id="ce-btn-bulk-modal-close" class="ce-action-btn" style="width:100%;">Xong (Close)</button>
            </div>
        `;
        container.appendChild(bulkModal);

        // Tag Assignment Modal
        const tagModal = document.createElement('div');
        tagModal.id = 'ce-tag-modal';
        tagModal.style.cssText = 'display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(15,15,25,0.95); z-index:9999; flex-direction:column; padding:15px; backdrop-filter:blur(5px); border-radius:8px;';
        tagModal.innerHTML = `
            <div style="font-weight:bold; margin-bottom:10px; color:var(--ce-accent); font-size:14px;" id="ce-tag-modal-title">Assign Tags</div>
            <div id="ce-tag-modal-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px;"></div>
            <div style="display:flex; justify-content:space-between; margin-top:10px;">
                <button id="ce-btn-tag-modal-close" class="ce-action-btn" style="width:100%;">Xong (Close)</button>
            </div>
        `;
        container.appendChild(tagModal);

        const toastContainer = document.createElement('div');
        toastContainer.id = 'ce-toast-container';
        document.body.appendChild(toastContainer);

        // Var Watcher Overlay
        const watcherOverlay = document.createElement('div');
        watcherOverlay.id = 'ce-var-watcher';
        document.body.appendChild(watcherOverlay);

        setupDraggable();
        setupTabs();
        setupEditors();
        setupGameKeys();

        // Toggles Header logic
        const toggleHeader = document.getElementById('ce-toggles-header');
        const toggleContainer = document.getElementById('ce-toggles-container');
        
        function updateTogglesVisibility() {
            if (CE.togglesHidden) {
                toggleContainer.classList.add('collapsed');
                toggleHeader.innerHTML = '<span>▶ Active Cheats</span>';
            } else {
                toggleContainer.classList.remove('collapsed');
                toggleHeader.innerHTML = '<span>▼ Active Cheats</span>';
            }
        }
        
        toggleHeader.addEventListener('click', () => {
            CE.togglesHidden = !CE.togglesHidden;
            localStorage.setItem(PREFIX + 'toggles-hidden', CE.togglesHidden);
            updateTogglesVisibility();
        });
        updateTogglesVisibility();
    }

    function buildNumberInput(label, hotkey, stateKey, min, max, step, val) {
        return `
            <div class="ce-toggle-row">
                <div class="ce-toggle-label">
                    <span>${label}</span>
                    <span class="ce-hotkey" id="ce-hotkey-${stateKey}">${hotkey}</span>
                </div>
                <input type="number" class="ce-var-input" id="ce-input-${stateKey}" min="${min}" max="${max}" step="${step}" value="${val}" style="width: 50px; text-align: center;">
            </div>
        `;
    }

    function buildToggle(label, hotkey, stateKey, isSwitch = true, isCycle = false) {
        if (isCycle) {
            return `
                <div class="ce-toggle-row">
                    <div class="ce-toggle-label">
                        <span>${label.replace(' x1', '')}</span>
                        <span class="ce-hotkey" id="ce-hotkey-${stateKey}">${hotkey}</span>
                    </div>
                    <button class="ce-action-btn ce-speed-btn" id="ce-btn-${stateKey}">x1</button>
                </div>
            `;
        }
        return `
            <div class="ce-toggle-row">
                <div class="ce-toggle-label">
                    <span>${label}</span>
                    <span class="ce-hotkey" id="ce-hotkey-${stateKey}">${hotkey}</span>
                </div>
                <label class="ce-switch">
                    <input type="checkbox" id="ce-toggle-${stateKey}" ${CE[stateKey] ? 'checked' : ''}>
                    <span class="ce-slider"></span>
                </label>
            </div>
        `;
    }

    // ==========================================
    // 3. EVENT LISTENERS
    // ==========================================
    function initEvents() {
        // Toggles
        const bindToggle = (key, msg) => {
            const el = document.getElementById(`ce-toggle-${key}`);
            if (el) {
                el.addEventListener('change', (e) => {
                    CE[key] = e.target.checked;
                    showToast(`${msg} ${CE[key] ? 'ON' : 'OFF'}`, CE[key] ? 'success' : 'warning');
                    if (key === 'infGold' && CE[key] && typeof $gameParty !== 'undefined' && $gameParty) $gameParty._gold = 9999999;
                    if (key === 'showFloatingTp') {
                        const floatTp = document.getElementById('ce-floating-tp');
                        if (floatTp) floatTp.style.display = CE.showFloatingTp && !CE.visible ? 'flex' : 'none';
                    }
                    saveState();
                });
            }
        };

        bindToggle('godMode', 'God Mode');
        bindToggle('infGold', 'Infinite Gold');
        bindToggle('maxStats', 'Max Stats');
        bindToggle('noClip', 'Walk Through Walls');
        bindToggle('noEncounter', 'No Encounter');
        bindToggle('forceSkip', 'Force Skip Text');
        bindToggle('autoWin', 'Auto-Win Battle');
        bindToggle('oneHitKill', 'One-Hit Kill');
        bindToggle('showFloatingTp', 'Floating TP Icon');

        // Speed Inputs
        const speedInput = document.getElementById('ce-input-speedBoost');
        if (speedInput) {
            speedInput.addEventListener('change', (e) => {
                CE.speedBoost = parseFloat(e.target.value) || 0;
                saveState();
                showToast(`Move Speed +${CE.speedBoost}`, 'info');
            });
        }

        const gameSpeedInput = document.getElementById('ce-input-gameSpeed');
        if (gameSpeedInput) {
            gameSpeedInput.addEventListener('change', (e) => {
                CE.gameSpeed = parseInt(e.target.value, 10) || 1;
                if (CE._applyGameSpeed) CE._applyGameSpeed(CE.gameSpeed);
                saveState();
                showToast(`Game Speed x${CE.gameSpeed}`, 'info');
            });
        }

        // Window Controls
        document.getElementById('ce-btn-min').addEventListener('click', toggleMinimize);
        document.getElementById('ce-btn-close').addEventListener('click', () => togglePanel(false));
        
        // Settings panel
        document.getElementById('ce-btn-settings').addEventListener('click', function() {
            const panel = document.getElementById('ce-settings-panel');
            this.classList.toggle('active');
            panel.classList.toggle('active');
        });

        // Time Tab Events
        const updateTimeHack = () => {
            CE.timeHack.autoReload = document.getElementById('ce-time-reload').checked;
            CE.timeHack.changeDay = document.getElementById('ce-time-changeday').checked;
            CE.timeHack.varId = parseInt(document.getElementById('ce-time-varid').value) || 0;
            CE.timeHack.minVal = parseInt(document.getElementById('ce-time-min').value) || 0;
            CE.timeHack.maxVal = parseInt(document.getElementById('ce-time-max').value) || 24;
            CE.timeHack.dayVarId = parseInt(document.getElementById('ce-time-dayvar').value) || 0;
            CE.timeHack.weekdayVarId = parseInt(document.getElementById('ce-time-weekdayvar').value) || 0;
            CE.timeHack.minWeekday = parseInt(document.getElementById('ce-time-minweekday').value) || 1;
            CE.timeHack.maxWeekday = parseInt(document.getElementById('ce-time-maxweekday').value) || 7;
            CE.timeHack.step = parseInt(document.getElementById('ce-time-step').value) || 1;
            localStorage.setItem(PREFIX + 'time', JSON.stringify(CE.timeHack));
        };
        document.getElementById('ce-time-reload').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-changeday').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-varid').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-min').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-max').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-dayvar').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-weekdayvar').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-minweekday').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-maxweekday').addEventListener('change', updateTimeHack);
        document.getElementById('ce-time-step').addEventListener('change', updateTimeHack);
        document.getElementById('ce-btn-time-back').addEventListener('click', () => skipTime(-1));
        document.getElementById('ce-btn-time-fwd').addEventListener('click', () => skipTime(1));

        // Quick Save/Load / Save Pos
        document.getElementById('ce-btn-qsave').addEventListener('click', quickSave);
        document.getElementById('ce-btn-qload').addEventListener('click', quickLoad);
        document.getElementById('ce-btn-savepos').addEventListener('click', saveCurrentPosition);
        
        const btnNewTag = document.getElementById('ce-btn-new-tag');
        if (btnNewTag) {
            btnNewTag.addEventListener('click', () => {
                const newTag = prompt('Nhập tên Tag mới:');
                if (newTag && newTag.trim() && !CE.allTags.includes(newTag.trim())) {
                    CE.allTags.push(newTag.trim());
                    localStorage.setItem(PREFIX + 'all-tags', JSON.stringify(CE.allTags));
                    renderMapList(document.getElementById('ce-search-map').value);
                }
            });
        }
        
        // Saves category buttons
        ['ce-cat-normal', 'ce-cat-quick', 'ce-cat-auto'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    document.getElementById('ce-cat-normal').classList.remove('active');
                    document.getElementById('ce-cat-quick').classList.remove('active');
                    document.getElementById('ce-cat-auto').classList.remove('active');
                    e.target.classList.add('active');
                    renderSavesTab();
                });
            }
        });
        
        const btnBulkTag = document.getElementById('ce-btn-bulk-tag');
        if (btnBulkTag) {
            btnBulkTag.addEventListener('click', () => {
                if (CE.allTags.length === 0) {
                    showToast('Chưa có Tag nào! Hãy tạo trước.', 'warning');
                    return;
                }
                const modal = document.getElementById('ce-bulk-modal');
                const select = document.getElementById('ce-bulk-tag-select');
                const list = document.getElementById('ce-bulk-modal-list');
                
                select.innerHTML = CE.allTags.map(t => `<option value="${t}">${t}</option>`).join('');
                
                const renderList = () => {
                    const tag = select.value;
                    list.innerHTML = '';
                    CE.savedPositions.forEach((p, idx) => {
                        const row = document.createElement('label');
                        row.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; color:white; padding:4px; background:rgba(255,255,255,0.05); border-radius:4px;';
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.checked = p.tags && p.tags.includes(tag);
                        cb.onchange = () => {
                            if (!p.tags) p.tags = [];
                            if (cb.checked) {
                                if (!p.tags.includes(tag)) p.tags.push(tag);
                            } else {
                                p.tags = p.tags.filter(t => t !== tag);
                            }
                            localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
                        };
                        row.appendChild(cb);
                        row.appendChild(document.createTextNode(`${p.mapName} (${p.x}, ${p.y})`));
                        list.appendChild(row);
                    });
                };
                
                select.onchange = renderList;
                renderList();
                
                modal.style.display = 'flex';
                document.getElementById('ce-btn-bulk-modal-close').onclick = () => {
                    modal.style.display = 'none';
                    renderMapList(document.getElementById('ce-search-map').value);
                };
            });
        }
        
        const addGoldBtn = document.getElementById('ce-btn-add-gold');
        if (addGoldBtn) {
            addGoldBtn.addEventListener('click', () => {
                if (typeof $gameParty !== 'undefined' && $gameParty) {
                    $gameParty.gainGold(100000);
                    showToast('+100,000 Gold!', 'success');
                }
            });
        }
        
        const undoBtn = document.getElementById('ce-btn-undo-tp');
        if(undoBtn) undoBtn.addEventListener('click', undoTeleport);

        document.getElementById('ce-btn-add-macro').addEventListener('click', () => {
            CE.macros.push({
                id: Date.now(),
                name: 'New Macro',
                key: '',
                itemId: 0,
                choices: ''
            });
            saveMacros();
            renderMacros();
        });

        

        // Auto-Save controls
        let autoSaveTimer = null;
        function startAutoSave() {
            if (autoSaveTimer) clearInterval(autoSaveTimer);
            if (CE.autoSaveEnabled && CE.autoSaveMinutes > 0) {
                autoSaveTimer = setInterval(() => {
                    if (typeof DataManager !== 'undefined' && typeof $gameMap !== 'undefined' && $gameMap) {
                        quickSave(true);
                    }
                }, CE.autoSaveMinutes * 60 * 1000);
            }
        }
        
        const autoSaveToggle = document.getElementById('ce-autosave-toggle');
        const autoSaveMinInput = document.getElementById('ce-autosave-minutes');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', () => {
                CE.autoSaveEnabled = autoSaveToggle.checked;
                saveState();
                startAutoSave();
            });
        }
        if (autoSaveMinInput) {
            autoSaveMinInput.addEventListener('change', () => {
                CE.autoSaveMinutes = parseInt(autoSaveMinInput.value) || 5;
                saveState();
                if (CE.autoSaveEnabled) startAutoSave();
            });
        }
        startAutoSave();

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Prevent interference if typing in an input
            if (e.target.tagName === 'INPUT') return;
            
            // Prevent auto-repeat when holding down keys
            if (e.repeat) return;

            // If we are currently listening for a new macro keybind
            if (isListeningMacro !== null) {
                e.preventDefault();
                if (e.code === 'Escape') {
                    // Canceled
                } else {
                    const m = CE.macros.find(x => x.id === isListeningMacro);
                    if (m) {
                        m.key = e.code;
                        saveMacros();
                    }
                }
                isListeningMacro = null;
                renderMacros();
                return;
            }

            // Check Macros Execution
            if (CE.macros && CE.macros.length > 0) {
                for (let i = 0; i < CE.macros.length; i++) {
                    const m = CE.macros[i];
                    if (m.key && m.key === e.code) {
                        e.preventDefault();
                        executeMacro(m);
                        return; // Found a macro, stop checking
                    }
                }
            }

            // If we are currently listening for a new cheat keybind
            if (window.ceListeningKey) {
                e.preventDefault();
                e.stopPropagation();
                if (e.code === 'Escape') {
                    window.ceListeningKey = null;
                    renderKeybinds();
                    showToast('Đã hủy đổi phím tắt.', 'info');
                    return;
                }
                if (e.code === 'Backspace' || e.code === 'Delete') {
                    if (window.ceListeningKey !== 'togglePanel') {
                        setNewKeybind(window.ceListeningKey, '');
                        showToast('Đã bỏ phím tắt!', 'info');
                        return;
                    }
                }
                setNewKeybind(window.ceListeningKey, e.code);
                return;
            }

            const k = CE.keybinds;
            const isTeleportTabActive = document.getElementById('tab-teleport').classList.contains('active');
            
            // Handle number keys in teleport tab
            if (CE.visible && isTeleportTabActive) {
                if (e.code.startsWith('Digit')) {
                    const num = parseInt(e.code.replace('Digit', ''));
                    if (num >= 1 && num <= 9) {
                        e.preventDefault();
                        triggerTeleportNumber(num);
                        return;
                    }
                    if (num === 0) {
                        e.preventDefault();
                        const mapList = document.getElementById('ce-list-maps');
                        if(mapList) mapList.scrollBy(0, 150);
                        return;
                    }
                }
            }

            if (e.code === k.togglePanel.key) { e.preventDefault(); togglePanel(); }
            else if (e.code === k.godMode.key) { e.preventDefault(); toggleCheat('godMode'); }
            else if (e.code === k.infGold.key) { e.preventDefault(); toggleCheat('infGold'); }
            else if (e.code === k.maxStats.key) { e.preventDefault(); toggleCheat('maxStats'); }
            else if (e.code === k.charSpeedUp.key) { e.preventDefault(); adjustSpeed(0.5); }
            else if (e.code === k.charSpeedDown.key) { e.preventDefault(); adjustSpeed(-0.5); }
            else if (e.code === k.noClip.key) { e.preventDefault(); toggleCheat('noClip'); }
            else if (e.code === k.noEncounter.key) { e.preventDefault(); toggleCheat('noEncounter'); }
            else if (e.code === k.forceSkip.key) { e.preventDefault(); toggleCheat('forceSkip'); }
            else if (e.code === k.gameSpeedUp.key) { e.preventDefault(); adjustGameSpeed(1); }
            else if (e.code === k.gameSpeedDown.key) { e.preventDefault(); adjustGameSpeed(-1); }
            else if (e.code === k.quickSave.key) { e.preventDefault(); quickSave(); }
            else if (e.code === k.quickLoad.key) { e.preventDefault(); quickLoad(); }
            else if (e.code === k.savePos.key) { e.preventDefault(); saveCurrentPosition(); }
            else if (e.code === k.timeForward.key) { e.preventDefault(); skipTime(1); }
            else if (e.code === k.timeBackward.key) { e.preventDefault(); skipTime(-1); }
            else if (e.code === k.winBattle.key) { e.preventDefault(); winBattleNow(); }
            else if (e.code === k.teleportPanel.key) { 
                e.preventDefault();
                const mapTabBtn = document.querySelector('.ce-tab-btn[data-tab="teleport"]');
                const teleTab = document.getElementById('tab-teleport');
                const isQuickTeleOpen = CE.visible && mapTabBtn && mapTabBtn.classList.contains('active') && teleTab && teleTab.classList.contains('teleport-mode-quick');
                if (isQuickTeleOpen) {
                    togglePanel(false);
                } else {
                    if (!CE.visible) togglePanel(true);
                    
                    document.querySelectorAll('#ce-tabs .ce-tab-btn[data-tab]').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.ce-tab-content').forEach(c => c.classList.remove('active'));
                    
                    if (mapTabBtn) mapTabBtn.classList.add('active');
                    if (teleTab) {
                        teleTab.classList.add('active');
                        teleTab.classList.add('teleport-mode-quick');
                    }
                    
                    const ceFooter = document.getElementById('ce-footer');
                    if (ceFooter) ceFooter.style.display = 'none';
                    
                    if (!CE.togglesHidden) {
                        CE.togglesHidden = true;
                        localStorage.setItem(PREFIX + 'toggles-hidden', true);
                        const togglesContainer = document.getElementById('ce-toggles-container');
                        if (togglesContainer) togglesContainer.classList.add('collapsed');
                        const togglesHeader = document.getElementById('ce-toggles-header');
                        if (togglesHeader) togglesHeader.innerHTML = '<span>▶ Active Cheats</span>';
                    }
                    const settingsPanel = document.getElementById('ce-settings-panel');
                    if (settingsPanel) settingsPanel.classList.remove('active');
                    
                    renderMapList('');
                }
            }
        });
    }

    function saveState() {
        const s = {
            godMode: CE.godMode,
            infGold: CE.infGold,
            maxStats: CE.maxStats,
            speedBoost: CE.speedBoost,
            noClip: CE.noClip,
            noEncounter: CE.noEncounter,
            forceSkip: CE.forceSkip,
            gameSpeed: CE.gameSpeed,
            autoWin: CE.autoWin,
            oneHitKill: CE.oneHitKill,
            autoSaveEnabled: CE.autoSaveEnabled,
            autoSaveMinutes: CE.autoSaveMinutes,
            showFloatingTp: CE.showFloatingTp
        };
        localStorage.setItem(PREFIX + 'state', JSON.stringify(s));
    }

    function toggleCheat(key) {
        CE[key] = !CE[key];
        const el = document.getElementById(`ce-toggle-${key}`);
        if (el) el.checked = CE[key];
        
        let msg = key;
        if(key==='godMode') msg='God Mode';
        if(key==='infGold') { msg='Infinite Gold'; if(CE.infGold && typeof $gameParty !== 'undefined' && $gameParty) $gameParty._gold = 9999999; }
        if(key==='maxStats') msg='Max Stats';
        if(key==='noClip') msg='No Walls';
        if(key==='noEncounter') msg='No Encounter';
        if(key==='forceSkip') msg='Force Skip Text';
        
        saveState();
        showToast(`${msg} ${CE[key] ? 'ON' : 'OFF'}`, CE[key] ? 'success' : 'warning');
    }

    function winBattleNow() {
        if (typeof BattleManager === 'undefined' || !BattleManager._phase || BattleManager._phase === '') {
            showToast('Not in battle!', 'warning');
            return;
        }
        if (typeof $gameTroop !== 'undefined' && $gameTroop) {
            $gameTroop.members().forEach(function(enemy) {
                if (enemy && enemy.isAlive()) {
                    enemy.setHp(0);
                }
            });
            if (typeof BattleManager.checkBattleEnd === 'function') {
                BattleManager.checkBattleEnd();
            }
            showToast('⚔️ Battle Won!', 'success');
        }
    }

    function adjustSpeed(amount) {
        CE.speedBoost += amount;
        if (CE.speedBoost < 0) CE.speedBoost = 0;
        if (CE.speedBoost > 5) CE.speedBoost = 5;
        const input = document.getElementById('ce-input-speedBoost');
        if (input) input.value = CE.speedBoost;
        saveState();
        showToast(`Move Speed +${CE.speedBoost}`, 'info');
    }

    function adjustGameSpeed(amount) {
        CE.gameSpeed += amount;
        if (CE.gameSpeed < 1) CE.gameSpeed = 1;
        if (CE.gameSpeed > 10) CE.gameSpeed = 10;
        const input = document.getElementById('ce-input-gameSpeed');
        if (input) input.value = CE.gameSpeed;
        if (CE._applyGameSpeed) CE._applyGameSpeed(CE.gameSpeed);
        saveState();
        showToast(`Game Speed x${CE.gameSpeed}`, 'info');
    }

    function skipTime(direction) {
        if (!CE.timeHack.varId || typeof $gameVariables === 'undefined') return;
        let current = $gameVariables.value(CE.timeHack.varId);
        let max = CE.timeHack.maxVal || 24;
        let min = CE.timeHack.minVal || 0;
        let step = CE.timeHack.step || 1;
        let dayVarId = CE.timeHack.dayVarId || 0;
        
        let newVal = current + (direction * step);
        let daysToChange = 0;
        
        if (CE.timeHack.changeDay) {
            let range = max - min + 1;
            if (range <= 0) range = 24; // Phân giải lỗi nhập liệu
            
            while (newVal > max) {
                newVal -= range;
                daysToChange++;
            }
            while (newVal < min) {
                newVal += range;
                daysToChange--;
            }
        } else {
            if (newVal > max) newVal = max;
            if (newVal < min) newVal = min;
        }
        
        $gameVariables.setValue(CE.timeHack.varId, newVal);
                let msgParts = [`⌚ Time: ${newVal}`];
        
        if (daysToChange !== 0) {
            if (dayVarId > 0) {
                let currentDay = $gameVariables.value(dayVarId) || 0;
                let newDay = currentDay + daysToChange;
                $gameVariables.setValue(dayVarId, newDay);
                msgParts.push(`Day: ${newDay}`);
            }

            let wdVarId = CE.timeHack.weekdayVarId || 0;
            if (wdVarId > 0) {
                let currentWd = $gameVariables.value(wdVarId);
                let wMin = CE.timeHack.minWeekday || 1;
                let wMax = CE.timeHack.maxWeekday || 7;
                let wRange = wMax - wMin + 1;
                if (wRange <= 0) wRange = 7;
                
                let offset = currentWd - wMin;
                offset = (offset + daysToChange) % wRange;
                if (offset < 0) offset += wRange;
                let newWd = wMin + offset;
                
                $gameVariables.setValue(wdVarId, newWd);
                msgParts.push(`Weekday: ${newWd}`);
            }
        }
        
        showToast(msgParts.join(' | '), 'success');
        
        if (CE.timeHack.autoReload && typeof $gamePlayer !== 'undefined' && typeof $gameMap !== 'undefined') {
            $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), 2);
        }
    }

    // ==========================================
    // 4. RPG MAKER HOOKS (THE CHEATS)
    // ==========================================
    function initHooks() {
        try {
            // 4.1. God Mode Hook
            const _die = Game_BattlerBase.prototype.die;
            Game_BattlerBase.prototype.die = function() {
                if (this.isActor() && CE.godMode) return;
                _die.call(this);
            };

            const _addState = Game_BattlerBase.prototype.addState;
            Game_BattlerBase.prototype.addState = function(stateId) {
                if (stateId === this.deathStateId() && this.isActor() && CE.godMode) return;
                _addState.call(this, stateId);
            };

            // Recover actors every frame in battle if god mode
            const _updateBattle = Game_Party.prototype.update;
            if (_updateBattle) {
                Game_Party.prototype.update = function() {
                    _updateBattle.call(this);
                    if (CE.godMode && $gameParty.inBattle()) {
                        $gameParty.members().forEach(actor => {
                            actor.setHp(actor.mhp);
                            actor.setMp(actor.mmp);
                            actor.setTp(actor.maxTp());
                        });
                    }
                };
            }

            // 4.2. Infinite Gold Hook
            const _loseGold = Game_Party.prototype.loseGold;
            Game_Party.prototype.loseGold = function(amount) {
                if (CE.infGold) return;
                _loseGold.call(this, amount);
            };

            // 4.3. Max Stats Hook
            const _param = Game_BattlerBase.prototype.param;
            Game_BattlerBase.prototype.param = function(paramId) {
                if (this.isActor() && CE.maxStats) {
                    if (paramId === 0) return 99999; // MHP
                    if (paramId === 1) return 9999;  // MMP
                    return 999; // ATK, DEF, MAT, MDF, AGI, LUK
                }
                return _param.call(this, paramId);
            };

            // 4.4. Speed Hack Hook
            const _realMoveSpeed = Game_CharacterBase.prototype.realMoveSpeed;
            Game_CharacterBase.prototype.realMoveSpeed = function() {
                const base = _realMoveSpeed.call(this);
                if (this === $gamePlayer && CE.speedBoost > 0) {
                    return base + CE.speedBoost;
                }
                return base;
            };

            // 4.5. Walk Through Walls (NoClip)
            const _isMapPassable = Game_CharacterBase.prototype.isMapPassable;
            Game_CharacterBase.prototype.isMapPassable = function(x, y, d) {
                if (this === $gamePlayer && CE.noClip) return true;
                return _isMapPassable.call(this, x, y, d);
            };

            const _isCollidedWithCharacters = Game_CharacterBase.prototype.isCollidedWithCharacters;
            Game_CharacterBase.prototype.isCollidedWithCharacters = function(x, y) {
                if (this === $gamePlayer && CE.noClip) return false;
                return _isCollidedWithCharacters.call(this, x, y);
            };

            // 4.6. No Encounter
            const _encounterProgressValue = Game_Player.prototype.encounterProgressValue;
            Game_Player.prototype.encounterProgressValue = function() {
                if (CE.noEncounter) return 0;
                return _encounterProgressValue.call(this);
            };

            const _executeEncounter = Game_Player.prototype.executeEncounter;
            Game_Player.prototype.executeEncounter = function() {
                if (CE.noEncounter) return false;
                return _executeEncounter.call(this);
            };

            // 4.5b. Auto-Win Battle
            if (typeof BattleManager !== 'undefined') {
                const _BM_startBattle = BattleManager.startBattle;
                BattleManager.startBattle = function() {
                    _BM_startBattle.call(this);
                    if (CE.autoWin) {
                        $gameTroop.members().forEach(enemy => {
                            enemy.setHp(0);
                        });
                    }
                };
            }

            // 4.5c. One-Hit Kill
            if (typeof Game_Action !== 'undefined') {
                const _makeDamageValue = Game_Action.prototype.makeDamageValue;
                Game_Action.prototype.makeDamageValue = function(target, critical) {
                    if (CE.oneHitKill && target.isEnemy()) {
                        return target.mhp + 1;
                    }
                    return _makeDamageValue.call(this, target, critical);
                };
            }

            // 4.7. Game Speed Hack
            // Dùng PixiJS ticker speed thay vì brute-force loop để tránh lag
            function applyGameSpeed(speed) {
                // Phương án 1: PixiJS ticker (MZ và MV mới hơn dùng PIXI.Application)
                if (typeof Graphics !== 'undefined' && Graphics._app && Graphics._app.ticker) {
                    Graphics._app.ticker.speed = speed;
                    return;
                }
                // Phương án 2: MV cũ dùng Graphics.frameRate
                if (typeof Graphics !== 'undefined' && Graphics.frameRate !== undefined) {
                    Graphics.frameRate = 60 * speed;
                    return;
                }
            }
            // Expose để các hàm khác gọi lại khi cần
            CE._applyGameSpeed = applyGameSpeed;
            // Áp dụng ngay khi init (nếu đã có speed được lưu)
            if (CE.gameSpeed !== 1) applyGameSpeed(CE.gameSpeed);

            // 4.8. Force Skip Text & Macro Auto-Skip
            if (typeof Window_Message !== 'undefined') {
                const _Window_Message_isTriggered = Window_Message.prototype.isTriggered;
                Window_Message.prototype.isTriggered = function() {
                    if ((CE.forceSkip && Input.isPressed('control')) || window.ceActiveMacro) return true;
                    return _Window_Message_isTriggered.call(this);
                };

                const _Window_Message_updateWait = Window_Message.prototype.updateWait;
                Window_Message.prototype.updateWait = function() {
                    if ((CE.forceSkip && Input.isPressed('control')) || window.ceActiveMacro) {
                        this._waitCount = 0;
                        return false;
                    }
                    return _Window_Message_updateWait.call(this);
                };

                const _Window_Message_terminateMessage = Window_Message.prototype.terminateMessage;
                Window_Message.prototype.terminateMessage = function() {
                    if (_Window_Message_terminateMessage) _Window_Message_terminateMessage.call(this);
                    if (window.ceActiveMacro && window.ceActiveMacro.choices.length === 0) {
                        window.ceActiveMacro = null; // Kết thúc Macro sau khi đã chọn xong hết
                    }
                };
            }

            // 4.9. Macro Auto-Choice
            if (typeof Window_ChoiceList !== 'undefined') {
                const _Window_ChoiceList_start = Window_ChoiceList.prototype.start;
                Window_ChoiceList.prototype.start = function() {
                    _Window_ChoiceList_start.call(this);
                    if (window.ceActiveMacro && window.ceActiveMacro.choices.length > 0) {
                        const choiceStr = window.ceActiveMacro.choices.shift().trim();
                        const choiceIdx = parseInt(choiceStr) - 1; // 1-based to 0-based
                        
                        if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < $gameMessage.choices().length) {
                            this.select(choiceIdx);
                            this.processOk();
                            this.hide(); // Ẩn cửa sổ để không bị nháy màn hình
                        } else {
                            window.ceActiveMacro = null; // Hủy macro nếu lựa chọn không hợp lệ
                            showToast('Macro aborted: Invalid choice index', 'danger');
                        }
                    }
                };
            }
        } catch(e) {
            console.error("Cheat Engine Hook Error:", e);
        }
    }

    // ==========================================
    // 5. QUICK SAVE / LOAD
    // ==========================================
    function formatTimestamp(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    function renderSavesTab() {
        try {
            function renderSlots(infoArray) {
                const listContainer = document.getElementById('ce-list-saves-combined');
                if (!listContainer) return;
                
                let min = 21, max = 80;
                const catNormal = document.getElementById('ce-cat-normal');
                const catQuick = document.getElementById('ce-cat-quick');
                const catAuto = document.getElementById('ce-cat-auto');
                
                if (catQuick && catQuick.classList.contains('active')) { min = 81; max = 90; }
                else if (catAuto && catAuto.classList.contains('active')) { min = 91; max = 100; }
                
                listContainer.innerHTML = '';
                
                function buildSaveItem(slot) {
                    const data = infoArray[slot];
                    const isEmpty = !data;
                    const time = !isEmpty && data.timestamp ? formatTimestamp(data.timestamp) : 'Empty';
                    const playTime = !isEmpty && data.playtime ? data.playtime : '';
                    const title = !isEmpty && data.title ? data.title : '';
                    
                    const bg = isEmpty ? 'rgba(0,0,0,0.3)' : 'rgba(102, 126, 234, 0.1)';
                    const opacity = isEmpty ? '0.6' : '1';
                    
                    return `
                        <div class="ce-saved-item" style="flex-direction:row; align-items:center; padding:8px; background:${bg}; margin-bottom:6px; border-radius:6px; opacity:${opacity};">
                            <div style="flex:1; cursor:pointer;" onclick="window.ceLoadSpecificSave(${slot})">
                                <div style="display:flex; justify-content:space-between; width:100%;">
                                    <div style="font-weight:bold; color:var(--ce-accent); font-size:13px;">Slot ${slot}</div>
                                    ${playTime ? `<div style="font-size:11px; color:var(--ce-warning);">${playTime}</div>` : ''}
                                </div>
                                <div style="font-size:11px; color:var(--ce-text-muted); margin-top:2px;">${time}</div>
                                ${title ? `<div style="font-size:11px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${title}</div>` : ''}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px; margin-left:8px;">
                                <button class="ce-action-btn" style="background:var(--ce-success); font-size:10px; padding:4px 8px;" onclick="window.ceSaveToSlot(${slot})">💾 Save</button>
                                ${!isEmpty ? `<button class="ce-action-btn" style="background:var(--ce-danger); font-size:10px; padding:4px 8px;" onclick="window.ceDeleteSlot(${slot})">🗑️ Del</button>` : ''}
                            </div>
                        </div>
                    `;
                }
                
                let html = '';
                for(let i = min; i <= max; i++) {
                    html += buildSaveItem(i);
                }
                listContainer.innerHTML = html;
            }

            if (typeof DataManager === 'undefined') {
                renderSlots([]);
                return;
            }
            
            // Fixed race condition: always trust memory over disk
            if (DataManager._globalInfo) {
                renderSlots(DataManager._globalInfo);
            } else if (typeof $dataGlobalInfo !== 'undefined') {
                renderSlots($dataGlobalInfo);
            } else if (DataManager.loadGlobalInfo) {
                try {
                    const res = DataManager.loadGlobalInfo();
                    if (res && res instanceof Promise) {
                        res.then(data => renderSlots(data || [])).catch(() => renderSlots([]));
                    } else {
                        renderSlots(res || []);
                    }
                } catch(e) {
                    renderSlots([]);
                }
            } else {
                renderSlots([]);
            }
        } catch (e) {
            const list = document.getElementById('ce-list-saves-combined');
            if (list) list.innerHTML = '<div style="color:red">Error: ' + e.message + '<br>' + e.stack + '</div>';
        }
    }

    function getNextSaveSlot(type) {
        let key = PREFIX + (type === 'auto' ? 'as-idx' : 'qs-idx');
        let current = parseInt(localStorage.getItem(key));
        let min = type === 'auto' ? 91 : 81;
        let max = type === 'auto' ? 100 : 90;
        
        if (isNaN(current) || current < min || current >= max) {
            current = min;
        } else {
            current++;
        }
        localStorage.setItem(key, current);
        return current;
    }

    function getMostRecentSaveSlot(type, infoArray) {
        let min = type === 'auto' ? 91 : 81;
        let max = type === 'auto' ? 100 : 90;
        let bestSlot = 99;
        let bestTime = 0;
        
        let slotsToCheck = [];
        for(let i=min; i<=max; i++) slotsToCheck.push(i);
        if (type === 'quick') slotsToCheck.push(99);
        
        if (!infoArray) {
            let key = PREFIX + (type === 'auto' ? 'as-idx' : 'qs-idx');
            let current = parseInt(localStorage.getItem(key));
            if (!isNaN(current)) return current;
            return type === 'auto' ? 100 : 90;
        }

        slotsToCheck.forEach(i => {
            if (infoArray[i] && infoArray[i].timestamp) {
                if (infoArray[i].timestamp > bestTime) {
                    bestTime = infoArray[i].timestamp;
                    bestSlot = i;
                }
            }
        });
        
        if (bestTime === 0) {
            let key = PREFIX + (type === 'auto' ? 'as-idx' : 'qs-idx');
            let current = parseInt(localStorage.getItem(key));
            if (!isNaN(current)) return current;
            return 99;
        }
        return bestSlot;
    }

    function loadSpecificSave(slot) {
        if (typeof DataManager === 'undefined') return;
        try {
            if (isRMMZ) {
                DataManager.loadGame(slot).then(() => {
                    if (SceneManager._scene instanceof Scene_Map) {
                        SceneManager._scene.fadeOutAll();
                        SceneManager.goto(Scene_Map);
                    }
                    showToast(`📂 Loaded Slot ${slot}!`, 'success');
                }).catch(() => showToast('❌ Load Failed (No Save?)', 'error'));
            } else {
                if (DataManager.loadGame(slot)) {
                    if (SceneManager._scene instanceof Scene_Map) {
                        $gameSystem.onAfterLoad();
                        SceneManager.goto(Scene_Map);
                    }
                    showToast(`📂 Loaded Slot ${slot}!`, 'success');
                } else showToast('❌ Load Failed!', 'error');
            }
        } catch(e) { showToast('❌ Error Loading!', 'error'); }
    }

    window.ceLoadSpecificSave = loadSpecificSave;
    
    window.ceSaveToSlot = function(slot) {
        if (typeof DataManager === 'undefined') return;
        try {
            if (isRMMZ) {
                DataManager.saveGame(slot).then(() => {
                    showToast(`💾 Đã lưu vào Slot ${slot}!`, 'success');
                    if (typeof renderSavesTab === 'function') renderSavesTab();
                }).catch(() => showToast('❌ Save Failed!', 'error'));
            } else {
                if (DataManager.saveGame(slot)) {
                    showToast(`💾 Đã lưu vào Slot ${slot}!`, 'success');
                    if (typeof renderSavesTab === 'function') renderSavesTab();
                } else showToast('❌ Save Failed!', 'error');
            }
        } catch(e) { showToast('❌ Error Saving!', 'error'); }
    };

    window.ceDeleteSlot = function(slot) {
        if (!confirm(`Bạn có chắc muốn XÓA Slot ${slot} không?`)) return;
        if (typeof StorageManager !== 'undefined') {
            if (isRMMZ) {
                StorageManager.remove(slot).then(() => {
                    if (DataManager._globalInfo) {
                        delete DataManager._globalInfo[slot];
                        DataManager.saveGlobalInfo();
                    }
                    showToast(`🗑️ Đã xóa Slot ${slot}`, 'success');
                    if (typeof renderSavesTab === 'function') renderSavesTab();
                });
            } else {
                StorageManager.remove(slot);
                if (DataManager.loadGlobalInfo) {
                    let info = DataManager.loadGlobalInfo();
                    if (info) {
                        delete info[slot];
                        DataManager.saveGlobalInfo(info);
                    }
                }
                showToast(`🗑️ Đã xóa Slot ${slot}`, 'success');
                if (typeof renderSavesTab === 'function') renderSavesTab();
            }
        }
    };

    function quickSave(isAuto = false) {
        if (typeof DataManager === 'undefined') return;
        const slot = getNextSaveSlot(isAuto ? 'auto' : 'quick');
        window.ceSaveToSlot(slot);
    }

    function quickLoad() {
        if (typeof DataManager === 'undefined') return;
        let info = DataManager._globalInfo;
        if (info) {
            loadSpecificSave(getMostRecentSaveSlot('quick', info));
        } else if (DataManager.loadGlobalInfo) {
            const res = DataManager.loadGlobalInfo();
            if (res instanceof Promise) {
                res.then(data => loadSpecificSave(getMostRecentSaveSlot('quick', data))).catch(() => loadSpecificSave(99));
            } else {
                loadSpecificSave(getMostRecentSaveSlot('quick', res));
            }
        } else {
            loadSpecificSave(99);
        }
    }

    
// 6. EDITORS (ITEMS, VARS, MAPS)
    // ==========================================
    function setupTabs() {
        const tabs = document.querySelectorAll('#ce-tabs .ce-tab-btn[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const tabId = btn.dataset.tab;
                if (!tabId) return;

                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.ce-tab-content').forEach(c => c.classList.remove('active'));
                
                // Khi người dùng bấm tab thủ công bằng chuột: tắt quick mode và khôi phục footer
                const teleTab = document.getElementById('tab-teleport');
                if (teleTab) teleTab.classList.remove('teleport-mode-quick');
                const ceFooter = document.getElementById('ce-footer');
                if (ceFooter) ceFooter.style.display = '';

                btn.classList.add('active');
                const targetContent = document.getElementById(`tab-${tabId}`);
                if (targetContent) targetContent.classList.add('active');
                
                refreshCurrentTab();
            });
        });
    }

    let currentItemType = 'item';
    let currentVarType = 'switch';

    function setupEditors() {
        // Items
        const renderItems = () => renderItemList(document.getElementById('ce-search-items').value);
        document.getElementById('ce-filter-item').addEventListener('click', (e) => { setItemTabActive(e); currentItemType='item'; renderItems(); });
        document.getElementById('ce-filter-weapon').addEventListener('click', (e) => { setItemTabActive(e); currentItemType='weapon'; renderItems(); });
        document.getElementById('ce-filter-armor').addEventListener('click', (e) => { setItemTabActive(e); currentItemType='armor'; renderItems(); });
        document.getElementById('ce-search-items').addEventListener('input', renderItems);

        // Vars
        const renderVars = () => renderVarList(document.getElementById('ce-search-vars').value);
        document.getElementById('ce-filter-switch').addEventListener('click', (e) => { setVarTabActive(e); currentVarType='switch'; renderVars(); });
        document.getElementById('ce-filter-var').addEventListener('click', (e) => { setVarTabActive(e); currentVarType='var'; renderVars(); });
        document.getElementById('ce-search-vars').addEventListener('input', renderVars);

        // Map
        document.getElementById('ce-search-map').addEventListener('input', (e) => renderMapList(e.target.value));
    }

    function setItemTabActive(e) {
        ['ce-filter-item', 'ce-filter-weapon', 'ce-filter-armor'].forEach(id => document.getElementById(id).classList.remove('active'));
        e.target.classList.add('active');
    }
    function setVarTabActive(e) {
        ['ce-filter-switch', 'ce-filter-var'].forEach(id => document.getElementById(id).classList.remove('active'));
        e.target.classList.add('active');
    }

    function refreshCurrentTab() {
        const activeTab = document.querySelector('.ce-tab-btn[data-tab].active').dataset.tab;
        if (activeTab === 'items') renderItemList(document.getElementById('ce-search-items').value);
        if (activeTab === 'vars') renderVarList(document.getElementById('ce-search-vars').value);
        if (activeTab === 'teleport') renderMapList(document.getElementById('ce-search-map').value);
        if (activeTab === 'macros') renderMacros();
        if (activeTab === 'keys') renderGameKeys();
        if (activeTab === 'saves') renderSavesTab();
    }

    function renderItemList(search) {
        const container = document.getElementById('ce-list-items');
        container.innerHTML = '';
        
        let data = [];
        if (currentItemType === 'item') data = $dataItems;
        if (currentItemType === 'weapon') data = $dataWeapons;
        if (currentItemType === 'armor') data = $dataArmors;
        
        if (!data) return;

        const searchLower = (search || '').trim().toLowerCase();
        let count = 0;

        for (let i = 1; i < data.length; i++) {
            const item = data[i];
            if (!item) continue;
            const itemId = item.id !== undefined ? item.id : i;
            const itemName = item.name || `(Không tên #${itemId})`;

            if (searchLower) {
                const matchName = itemName.toLowerCase().includes(searchLower);
                const matchId = String(itemId) === searchLower || String(itemId).includes(searchLower);
                if (!matchName && !matchId) continue;
            }

            const div = document.createElement('div');
            div.className = 'ce-list-item';
            div.innerHTML = `
                <div class="ce-item-name" title="${item.description || ''}">
                    <span style="color:var(--ce-accent); font-weight:bold; margin-right:6px; font-family:monospace;">[#${itemId}]</span>
                    <span>${itemName}</span>
                </div>
                <button class="ce-action-btn">+99</button>
            `;
            div.querySelector('button').addEventListener('click', () => {
                $gameParty.gainItem(item, 99);
                showToast(`+99 [#${itemId}] ${itemName}`, 'success');
            });
            container.appendChild(div);
            count++;
            if (count >= 150) break; // Limit render for perf
        }
    }

    function renderVarList(search) {
        const container = document.getElementById('ce-list-vars');
        container.innerHTML = '';
        
        if (!$dataSystem) return;
        
        const data = currentVarType === 'switch' ? $dataSystem.switches : $dataSystem.variables;
        if (!data) return;

        const rawSearch = (search || '').trim();
        const searchLower = rawSearch.toLowerCase();

        // Kiểm tra toán tử so sánh cho biến số (ví dụ =10, >5, <100, >=20, <=50, !=0)
        let opMode = null;
        let opTarget = 0;
        if (currentVarType === 'var' && rawSearch) {
            const opMatch = rawSearch.match(/^([=><!]=?|<|>)\s*(-?\d+)$/);
            if (opMatch) {
                opMode = opMatch[1];
                opTarget = parseInt(opMatch[2], 10);
            }
        }

        let count = 0;

        for (let i = 1; i < data.length; i++) {
            const rawName = data[i];
            const hasName = !!(rawName && rawName.trim().length > 0);
            const displayName = hasName ? rawName : (currentVarType === 'switch' ? `(Switch #${i})` : `(Variable #${i})`);
            
            // Lấy giá trị hiện tại
            let currentVal = false;
            if (currentVarType === 'switch') {
                if (typeof $gameSwitches !== 'undefined' && $gameSwitches) {
                    currentVal = $gameSwitches.value(i);
                }
            } else {
                if (typeof $gameVariables !== 'undefined' && $gameVariables) {
                    currentVal = $gameVariables.value(i);
                }
            }

            // Lọc tìm kiếm
            if (opMode !== null) {
                const valNum = Number(currentVal);
                if (opMode === '=' || opMode === '==') { if (valNum !== opTarget) continue; }
                else if (opMode === '>') { if (valNum <= opTarget) continue; }
                else if (opMode === '>=') { if (valNum < opTarget) continue; }
                else if (opMode === '<') { if (valNum >= opTarget) continue; }
                else if (opMode === '<=') { if (valNum > opTarget) continue; }
                else if (opMode === '!=' || opMode === '<>') { if (valNum === opTarget) continue; }
            } else if (searchLower) {
                const matchName = displayName.toLowerCase().includes(searchLower);
                const matchId = String(i) === searchLower || String(i).includes(searchLower);
                if (!matchName && !matchId) continue;
            }

            const div = document.createElement('div');
            div.className = 'ce-list-item';
            
            if (currentVarType === 'switch') {
                div.innerHTML = `
                    <div class="ce-item-name" style="flex:1;">
                        <span style="color:var(--ce-accent); font-weight:bold; margin-right:6px; font-family:monospace;">[#${i}]</span>
                        <span style="${!hasName ? 'color:var(--ce-text-muted); font-style:italic;' : ''}">${displayName}</span>
                    </div>
                    <button class="ce-action-btn" style="background:${currentVal ? 'var(--ce-success)' : 'var(--ce-danger)'}; min-width:48px;">${currentVal ? 'ON' : 'OFF'}</button>
                `;
                div.querySelector('button').addEventListener('click', (e) => {
                    if (typeof $gameSwitches === 'undefined' || !$gameSwitches) return;
                    const newVal = !$gameSwitches.value(i);
                    $gameSwitches.setValue(i, newVal);
                    e.target.innerText = newVal ? 'ON' : 'OFF';
                    e.target.style.background = newVal ? 'var(--ce-success)' : 'var(--ce-danger)';
                    showToast(`Switch #${i} → ${newVal ? 'ON' : 'OFF'}`, newVal ? 'success' : 'warning');
                });
            } else {
                div.innerHTML = `
                    <div class="ce-item-name" style="flex:1;">
                        <span style="color:var(--ce-accent); font-weight:bold; margin-right:6px; font-family:monospace;">[#${i}]</span>
                        <span style="${!hasName ? 'color:var(--ce-text-muted); font-style:italic;' : ''}">${displayName}</span>
                    </div>
                    <input type="number" class="ce-var-input" value="${currentVal}" style="width:70px; text-align:center;" />
                `;
                div.querySelector('input').addEventListener('change', (e) => {
                    if (typeof $gameVariables === 'undefined' || !$gameVariables) return;
                    const newVal = parseInt(e.target.value, 10) || 0;
                    $gameVariables.setValue(i, newVal);
                    showToast(`Var #${i} (${displayName}) = ${newVal}`, 'info');
                });
            }
            
            container.appendChild(div);
            count++;
            if (count >= 150) break; // Limit render for perf
        }
    }

    function renderTagFilter() {
        const container = document.getElementById('ce-tag-filter-section');
        if (!container) return;
        container.innerHTML = '';
        
        if (CE.allTags.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        
        // Mode toggle button (AND/OR)
        const modeBtn = document.createElement('button');
        modeBtn.className = 'ce-tag-filter-mode';
        modeBtn.innerText = CE.tagFilterMode;
        modeBtn.title = CE.tagFilterMode === 'OR' ? 'Hiển thị nếu có MỘT TRONG các tag' : 'Hiển thị nếu có TẤT CẢ các tag';
        modeBtn.onclick = () => {
            CE.tagFilterMode = CE.tagFilterMode === 'OR' ? 'AND' : 'OR';
            localStorage.setItem(PREFIX + 'tag-filter-mode', CE.tagFilterMode);
            renderTagFilter();
            renderSavedPositions();
        };
        container.appendChild(modeBtn);
        
        CE.allTags.forEach(tag => {
            const btn = document.createElement('div');
            btn.className = 'ce-tag' + (CE.activeTags.includes(tag) ? ' active' : '');
            
            const textSpan = document.createElement('span');
            textSpan.innerText = tag;
            textSpan.onclick = () => {
                if (CE.activeTags.includes(tag)) {
                    CE.activeTags = CE.activeTags.filter(t => t !== tag);
                } else {
                    CE.activeTags.push(tag);
                }
                localStorage.setItem(PREFIX + 'active-tags', JSON.stringify(CE.activeTags));
                renderTagFilter();
                renderSavedPositions();
            };
            btn.appendChild(textSpan);
            
            // Nút xóa tag
            const delSpan = document.createElement('span');
            delSpan.innerHTML = ' &times;';
            delSpan.style.color = 'var(--ce-danger)';
            delSpan.style.marginLeft = '4px';
            delSpan.style.fontWeight = 'bold';
            delSpan.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Xóa tag "${tag}"?`)) {
                    CE.allTags = CE.allTags.filter(t => t !== tag);
                    CE.activeTags = CE.activeTags.filter(t => t !== tag);
                    localStorage.setItem(PREFIX + 'all-tags', JSON.stringify(CE.allTags));
                    localStorage.setItem(PREFIX + 'active-tags', JSON.stringify(CE.activeTags));
                    
                    // Remove this tag from all saved positions
                    CE.savedPositions.forEach(p => {
                        if (p.tags) p.tags = p.tags.filter(t => t !== tag);
                    });
                    localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
                    
                    renderTagFilter();
                    renderSavedPositions();
                }
            };
            btn.appendChild(delSpan);
            
            container.appendChild(btn);
        });
    }

    function renameSavedPosition(index) {
        const pos = CE.savedPositions[index];
        if (!pos) return;
        const currentTitle = pos.customName || pos.name || pos.mapName;
        const newTitle = prompt(`Đổi tên vị trí [${currentTitle}]:`, currentTitle);
        if (newTitle !== null) {
            const trimmed = newTitle.trim();
            if (trimmed.length > 0) {
                pos.name = trimmed;
                pos.customName = trimmed;
                localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
                localStorage.setItem('rpgm-cheat-positions', JSON.stringify(CE.savedPositions));
                showToast(`Đã đổi tên thành: ${trimmed}`, 'success');
                renderSavedPositions();
            }
        }
    }

    function renderSavedPositions() {
        window.ceTeleportableItems = [];
        renderTagFilter();
        const savedContainer = document.getElementById('ce-list-saved-positions');
        const savedSection = document.getElementById('ce-saved-positions-section');
        if(!savedContainer || !savedSection) return;
        savedContainer.innerHTML = '';
        
        const isQuickTele = document.getElementById('tab-teleport').classList.contains('teleport-mode-quick');
        const headerTitle = document.querySelector('#ce-saved-positions-section .ce-saved-title span');
        if (headerTitle) {
            headerTitle.textContent = isQuickTele ? '📍 Vị trí đã lưu (Nhấn 1-9 để đến)' : 'Saved Positions';
        }

        if (CE.savedPositions.length > 0) {
            savedSection.style.display = 'flex';
            CE.savedPositions.forEach((pos, idx) => {
                // Apply Tag Filter
                if (CE.activeTags.length > 0) {
                    const posTags = pos.tags || [];
                    if (CE.tagFilterMode === 'OR') {
                        if (!CE.activeTags.some(t => posTags.includes(t))) return;
                    } else { // AND
                        if (!CE.activeTags.every(t => posTags.includes(t))) return;
                    }
                }

                const div = document.createElement('div');
                div.className = 'ce-saved-item';
                
                let badgeHtml = '';
                if (window.ceTeleportableItems.length < 9) {
                    window.ceTeleportableItems.push({ type: 'saved', mapId: pos.mapId, x: pos.x, y: pos.y });
                    badgeHtml = `<span class="ce-number-badge">${window.ceTeleportableItems.length}</span>`;
                }

                const displayName = pos.customName || pos.name || pos.mapName || `Map ${pos.mapId}`;

                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
                        <div style="display:flex; align-items:center; overflow:hidden;">
                            ${badgeHtml}
                            <span class="ce-item-name ce-pos-name" style="margin-right:8px; cursor:pointer;" title="Nhấp đúp hoặc bấm ✏️ để đổi tên: ${displayName} (${pos.x},${pos.y})">${displayName} <span style="font-size:10px; color:var(--ce-text-muted);">(${pos.x},${pos.y})</span></span>
                        </div>
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <button class="ce-action-btn ce-go-btn">Go</button>
                        <button class="ce-edit-btn" title="Đổi tên vị trí">✏️</button>
                        <button class="ce-action-btn ce-tag-btn" style="color:var(--ce-success); font-size:10px;">+ Tag</button>
                        <button class="ce-delete-btn" title="Xóa">✕</button>
                    </div>
                `;

                div.querySelector('.ce-go-btn').addEventListener('click', () => teleportTo(pos.mapId, pos.x, pos.y));
                div.querySelector('.ce-edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameSavedPosition(idx);
                });
                div.querySelector('.ce-pos-name').addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    renameSavedPosition(idx);
                });
                div.querySelector('.ce-delete-btn').addEventListener('click', () => deleteSavedPosition(idx));
                div.querySelector('.ce-tag-btn').addEventListener('click', () => {
                    const modal = document.getElementById('ce-tag-modal');
                    const title = document.getElementById('ce-tag-modal-title');
                    const list = document.getElementById('ce-tag-modal-list');
                    
                    if (CE.allTags.length === 0) {
                        showToast('Chưa có Tag nào! Hãy tạo trước.', 'warning');
                        return;
                    }
                    
                    title.innerText = 'Assign Tags: ' + displayName;
                    list.innerHTML = '';
                    
                    CE.allTags.forEach(tag => {
                        const row = document.createElement('label');
                        row.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer; color:white; padding:4px; background:rgba(255,255,255,0.05); border-radius:4px;';
                        
                        const cb = document.createElement('input');
                        cb.type = 'checkbox';
                        cb.checked = pos.tags && pos.tags.includes(tag);
                        cb.onchange = () => {
                            if (!pos.tags) pos.tags = [];
                            if (cb.checked) {
                                if (!pos.tags.includes(tag)) pos.tags.push(tag);
                            } else {
                                pos.tags = pos.tags.filter(t => t !== tag);
                            }
                            localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
                            localStorage.setItem('rpgm-cheat-positions', JSON.stringify(CE.savedPositions));
                        };
                        
                        row.appendChild(cb);
                        row.appendChild(document.createTextNode(tag));
                        list.appendChild(row);
                    });
                    
                    modal.style.display = 'flex';
                    document.getElementById('ce-btn-tag-modal-close').onclick = () => {
                        modal.style.display = 'none';
                        renderTagFilter();
                        renderSavedPositions();
                    };
                });
                savedContainer.appendChild(div);
            });
        } else {
            if (isQuickTele) {
                savedSection.style.display = 'flex';
                savedContainer.innerHTML = '<div style="padding:20px 10px; text-align:center; color:var(--ce-text-muted); font-size:12px;">📍 Chưa có vị trí nào được lưu.<br><span style="font-size:11px;">Bấm nút <b>Save Pos</b> (hoặc phím tắt) để lưu vị trí hiện tại!</span></div>';
            } else {
                savedSection.style.display = 'none';
            }
        }
    }

    // Render Maps
    function renderMapList(search = '') {
        window.ceTeleportableItems = [];
        renderSavedPositions();

        const isQuickTele = document.getElementById('tab-teleport').classList.contains('teleport-mode-quick');
        const mapListContainer = document.getElementById('ce-map-list-container');
        if (isQuickTele) {
            if (mapListContainer) mapListContainer.style.display = 'none';
            return;
        } else {
            if (mapListContainer) mapListContainer.style.display = 'flex';
        }

        const mapContainer = document.getElementById('ce-list-maps');
        if (!mapContainer) return;
        mapContainer.innerHTML = '';
        if(!$dataMapInfos) return;
        search = search.toLowerCase();
        let count = 0;

        for (let i = 1; i < $dataMapInfos.length; i++) {
            const map = $dataMapInfos[i];
            if (!map || !map.name) continue;
            if (search && !map.name.toLowerCase().includes(search)) continue;

            const div = document.createElement('div');
            div.className = 'ce-list-item';
            
            let badgeHtml = '';
            if (window.ceTeleportableItems.length < 9) {
                window.ceTeleportableItems.push({ type: 'map', mapId: i });
                badgeHtml = `<span class="ce-number-badge">${window.ceTeleportableItems.length}</span>`;
            }

            div.innerHTML = `
                <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                    ${badgeHtml}
                    <div class="ce-item-name">[${i}] ${map.name}</div>
                </div>
                <button class="ce-action-btn">Go</button>
            `;
            div.querySelector('.ce-action-btn').addEventListener('click', () => teleportTo(i, 0, 0));
            mapContainer.appendChild(div);
            count++;
            if(count > 100) break;
        }
    }

    // ==========================================
    
    let isListeningMacro = null;
    function renderMacros() {
        const list = document.getElementById('ce-list-macros');
        if (!list) return;
        list.innerHTML = '';
        
        if (!CE.macros || CE.macros.length === 0) {
            list.innerHTML = `
                <div style="padding:16px 8px; text-align:center; color:var(--ce-text-muted); font-size:12px;">
                    Chưa có macro nào.<br>
                    <span style="font-size:10px;">Bấm <b>+ Add Macro</b> để tự động dùng item và chọn câu thoại!</span>
                </div>
            `;
            return;
        }

        CE.macros.forEach(macro => {
            const card = document.createElement('div');
            card.className = 'ce-macro-item';
            
            const isListening = (isListeningMacro === macro.id);
            const keyLabel = macro.key ? keyCodeToLabel(macro.key) : '';

            card.innerHTML = `
                <div class="ce-macro-header">
                    <input type="text" class="ce-macro-input ce-macro-name" value="${macro.name || ''}" placeholder="Tên Macro" style="flex:1; font-weight:600;">
                    <button class="ce-action-btn ce-macro-run-btn" title="Chạy macro này ngay" style="background:var(--ce-accent); padding:2px 8px; font-size:11px;">▶ Chạy</button>
                    <button class="ce-keybind-btn ce-macro-bind-btn ${isListening ? 'listening' : ''} ${!macro.key ? 'empty' : ''}" style="min-width:60px;">
                        ${isListening ? 'Bấm phím...' : (keyLabel || 'Gán phím')}
                    </button>
                    ${macro.key ? `<button class="ce-keybind-clear-btn ce-macro-clear-key" title="Xóa phím tắt">✕</button>` : ''}
                    <button class="ce-delete-btn ce-macro-del-btn" title="Xóa macro">🗑️</button>
                </div>
                <div class="ce-macro-row" style="display:flex; gap:6px; align-items:center;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span style="font-size:11px; color:var(--ce-text-muted); white-space:nowrap;">Item ID:</span>
                        <input type="number" class="ce-macro-input ce-macro-itemid" value="${macro.itemId || ''}" placeholder="0" min="0" style="width:55px; text-align:center;">
                    </div>
                    <div style="display:flex; align-items:center; gap:4px; flex:1;">
                        <span style="font-size:11px; color:var(--ce-text-muted); white-space:nowrap;">Lựa chọn:</span>
                        <input type="text" class="ce-macro-input ce-macro-choices" value="${macro.choices || ''}" placeholder="vd: 1, 2, 1" title="Số thứ tự câu thoại cần chọn (cách nhau dấu phẩy)" style="flex:1;">
                    </div>
                </div>
            `;
            
            // Tên macro
            card.querySelector('.ce-macro-name').addEventListener('change', (e) => {
                macro.name = e.target.value;
                saveMacros();
            });
            // Item ID
            card.querySelector('.ce-macro-itemid').addEventListener('change', (e) => {
                macro.itemId = parseInt(e.target.value, 10) || 0;
                saveMacros();
            });
            // Choices
            card.querySelector('.ce-macro-choices').addEventListener('change', (e) => {
                macro.choices = e.target.value;
                saveMacros();
            });
            // Nút Chạy
            card.querySelector('.ce-macro-run-btn').addEventListener('click', () => {
                executeMacro(macro);
            });
            // Gán phím
            card.querySelector('.ce-macro-bind-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (isListeningMacro === macro.id) {
                    isListeningMacro = null;
                } else {
                    isListeningMacro = macro.id;
                }
                renderMacros();
            });
            // Xóa phím tắt
            const clearKeyBtn = card.querySelector('.ce-macro-clear-key');
            if (clearKeyBtn) {
                clearKeyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    macro.key = '';
                    saveMacros();
                    renderMacros();
                    showToast('Đã xóa phím tắt của macro!', 'info');
                });
            }
            // Xóa macro
            card.querySelector('.ce-macro-del-btn').addEventListener('click', () => {
                CE.macros = CE.macros.filter(m => m.id !== macro.id);
                saveMacros();
                renderMacros();
                showToast('Đã xóa macro!', 'info');
            });
            
            list.appendChild(card);
        });
    }

    function saveMacros() {
        localStorage.setItem(PREFIX + 'macros', JSON.stringify(CE.macros));
    }

    function executeMacro(macro) {
        if (macro.itemId > 0 && typeof $gameParty !== 'undefined' && typeof $dataItems !== 'undefined') {
            const item = $dataItems[macro.itemId];
            if (item) {
                if (!$gameParty.hasItem(item)) {
                    $gameParty.gainItem(item, 1);
                }
                const actor = $gameParty.members()[0];
                if (actor) {
                    actor.useItem(item);
                    const action = new Game_Action(actor);
                    action.setItemObject(item);
                    action.apply(actor);
                    action.applyGlobal();
                    showToast(`Used: ${item.name}`, 'success');
                }
            }
        }
        
        if (macro.choices && macro.choices.trim().length > 0) {
            window.ceActiveMacro = {
                id: macro.id,
                choices: macro.choices.split(',').map(s => s.trim()).filter(s => s)
            };
            showToast(`Macro '${macro.name}' armed!`, 'info');
        }
    }

// ==========================================
// 6.5. GAME KEYS MAPPING (REMAP PHÍM GAME)
// ==========================================
const KEYCODE_MAP = {
    8: 'Backspace', 9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt',
    19: 'Pause', 20: 'Caps Lock', 27: 'Esc', 32: 'Space', 33: 'Page Up', 34: 'Page Down',
    35: 'End', 36: 'Home', 37: '← Left', 38: '↑ Up', 39: '→ Right', 40: '↓ Down',
    45: 'Insert', 46: 'Delete',
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
    65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J',
    75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T',
    85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
    96: 'Num 0', 97: 'Num 1', 98: 'Num 2', 99: 'Num 3', 100: 'Num 4',
    101: 'Num 5', 102: 'Num 6', 103: 'Num 7', 104: 'Num 8', 105: 'Num 9',
    106: 'Num *', 107: 'Num +', 109: 'Num -', 110: 'Num .', 111: 'Num /',
    112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
    118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '~',
    219: '[', 220: '\\', 221: ']', 222: "'"
};

function keyCodeToLabel(code) {
    if (code === undefined || code === null || code === '') return '';
    if (typeof code === 'number' || (!isNaN(code) && typeof code === 'string' && code.trim() !== '')) {
        const num = parseInt(code, 10);
        if (KEYCODE_MAP[num]) return KEYCODE_MAP[num];
    }
    if (typeof code === 'string') {
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
        if (code === 'Backquote') return '~';
        if (code === 'Space') return 'Space';
        if (code === 'Escape') return 'Esc';
        if (code === 'ArrowUp') return '↑ Up';
        if (code === 'ArrowDown') return '↓ Down';
        if (code === 'ArrowLeft') return '← Left';
        if (code === 'ArrowRight') return '→ Right';
        return code;
    }
    return String(code);
}

const GAME_ACTIONS = {
    'up': { name: 'Move Up', desc: 'Di chuyển lên (Mặc định: ↑, Num 8)', icon: '⬆️' },
    'down': { name: 'Move Down', desc: 'Di chuyển xuống (Mặc định: ↓, Num 2)', icon: '⬇️' },
    'left': { name: 'Move Left', desc: 'Di chuyển sang trái (Mặc định: ←, Num 4)', icon: '⬅️' },
    'right': { name: 'Move Right', desc: 'Di chuyển sang phải (Mặc định: →, Num 6)', icon: '➡️' },
    'ok': { name: 'Confirm / OK', desc: 'Tương tác, chọn, nói chuyện (Z / Enter / Space)', icon: '🆗' },
    'escape': { name: 'Cancel / Menu', desc: 'Mở menu, hủy bỏ, quay lại (X / Esc / Num 0)', icon: '🔙' },
    'shift': { name: 'Dash / Run', desc: 'Chạy nhanh khi di chuyển (Shift)', icon: '⚡' },
    'pageup': { name: 'Page Up / Prev', desc: 'Trang trước, đổi nhân vật (Q / PageUp)', icon: '⏮️' },
    'pagedown': { name: 'Page Down / Next', desc: 'Trang sau, đổi nhân vật (W / PageDown)', icon: '⏭️' },
    'tab': { name: 'Tab', desc: 'Chuyển focus giao diện (Tab)', icon: '⇥' },
    'control': { name: 'Control', desc: 'Phím bổ trợ, tua nhanh tin nhắn (Ctrl / Alt)', icon: '⚙️' }
};

let originalGameKeyMapper = null;
function backupOriginalGameKeyMapper() {
    if (typeof Input !== 'undefined' && Input.keyMapper && !originalGameKeyMapper) {
        originalGameKeyMapper = {};
        for (let k in Input.keyMapper) {
            originalGameKeyMapper[k] = Input.keyMapper[k];
        }
    }
}

// customGameKeys: { [keyCode_number]: action | '__none__' }  (backward compat)
// customGameKeys2: { [e.code string]: action | '__none__' }  (new — catches plugin-custom keys)
let customGameKeys = {};
let customGameKeys2 = {}; // keyed by e.code (e.g. "KeyZ", "Space")
try {
    const raw = localStorage.getItem(PREFIX + 'game-keys') || localStorage.getItem('rpgm-cheat-game-keys');
    if (raw) customGameKeys = JSON.parse(raw);
} catch (e) { customGameKeys = {}; }
try {
    const raw2 = localStorage.getItem(PREFIX + 'game-keys2');
    if (raw2) customGameKeys2 = JSON.parse(raw2);
} catch (e) { customGameKeys2 = {}; }

function saveCustomGameKeys() {
    try {
        localStorage.setItem(PREFIX + 'game-keys', JSON.stringify(customGameKeys));
        localStorage.setItem('rpgm-cheat-game-keys', JSON.stringify(customGameKeys));
        localStorage.setItem(PREFIX + 'game-keys2', JSON.stringify(customGameKeys2));
    } catch(e) {}
}

// Patch Input.keyMapper (bắt engine RMMV/MZ gốc)
function applyCustomGameKeys() {
    if (typeof Input === 'undefined' || !Input.keyMapper) return;
    backupOriginalGameKeyMapper();
    for (let k in customGameKeys) {
        const action = customGameKeys[k];
        if (action === null || action === '__none__') {
            delete Input.keyMapper[k];
        } else {
            Input.keyMapper[k] = action;
        }
    }
}

// Hook Input._onKeyDown để bắt MỌI phím kể cả plugin dùng Input internal
// (chạy 1 lần sau khi Input đã load)
let _remapHookInstalled = false;
function installInputOnKeyDownHook() {
    if (_remapHookInstalled) return;
    if (typeof Input === 'undefined' || typeof Input._onKeyDown !== 'function') return;
    _remapHookInstalled = true;
    const _orig = Input._onKeyDown.bind(Input);
    Input._onKeyDown = function(event) {
        // Kiểm tra customGameKeys2 (by e.code) trước
        const remappedAction = customGameKeys2[event.code];
        if (remappedAction && remappedAction !== '__none__') {
            // Tạo fake event với keyCode của action đích
            const targetKeyCode = _getKeyCodeForAction(remappedAction);
            if (targetKeyCode) {
                const fakeEvent = new KeyboardEvent(event.type, {
                    keyCode: targetKeyCode,
                    which: targetKeyCode,
                    code: event.code,
                    bubbles: event.bubbles
                });
                return _orig(fakeEvent);
            }
        }
        // Nếu phím này bị unmap (disabled)
        if (remappedAction === '__none__') return;
        return _orig(event);
    };
}

// Tìm keyCode số nguyên của một action trong Input.keyMapper
function _getKeyCodeForAction(action) {
    if (typeof Input === 'undefined' || !Input.keyMapper) return null;
    for (let k in Input.keyMapper) {
        if (Input.keyMapper[k] === action) return parseInt(k, 10);
    }
    // Fallback: map mặc định của RMMV
    const defaults = { ok: 13, escape: 27, shift: 16, pageup: 33, pagedown: 34,
                       up: 38, down: 40, left: 37, right: 39, tab: 9, control: 17 };
    return defaults[action] || null;
}

// Raw keydown listener — fallback bắt plugin hoàn toàn bypass Input
// (capture phase = chạy trước mọi handler khác)
let _rawRemapInstalled = false;
function installRawKeydownRemap() {
    if (_rawRemapInstalled) return;
    _rawRemapInstalled = true;
    document.addEventListener('keydown', function(e) {
        const action2 = customGameKeys2[e.code];
        if (!action2 || action2 === '__none__') return;
        // Nếu đã có Input hook xử lý rồi thì thôi (tránh double-fire)
        if (_remapHookInstalled) return;
        // Dispatch thêm event với keyCode của action đích để game bắt được
        const targetKeyCode = _getKeyCodeForAction(action2);
        if (!targetKeyCode) return;
        const fakeEvent = new KeyboardEvent('keydown', {
            keyCode: targetKeyCode,
            which: targetKeyCode,
            bubbles: true, cancelable: true
        });
        document.dispatchEvent(fakeEvent);
    }, true); // capture=true: chạy trước hết
}

let isListeningGameKey = false;
let listeningAction = '';
let gameKeyKeydownHandler = null;

function cancelGameKeyListening() {
    isListeningGameKey = false;
    listeningAction = '';
    if (gameKeyKeydownHandler) {
        document.removeEventListener('keydown', gameKeyKeydownHandler, true);
        gameKeyKeydownHandler = null;
    }
    renderGameKeys();
}

function startGameKeyListening(action) {
    if (isListeningGameKey) {
        cancelGameKeyListening();
    }
    isListeningGameKey = true;
    listeningAction = action;
    renderGameKeys();

    gameKeyKeydownHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'Escape') {
            showToast('Đã hủy gán phím.', 'info');
            cancelGameKeyListening();
            return;
        }

        const keyCode = e.keyCode || e.which;
        const keyCodeStr = String(keyCode);
        const eCode = e.code; // e.g. "KeyZ", "Space", "ArrowUp"
        const keyLabel = keyCodeToLabel(eCode || keyCode);
        const actInfo = GAME_ACTIONS[listeningAction];
        const actionTitle = actInfo ? actInfo.name : listeningAction;

        // Kiểm tra đã gán chưa (check cả 2 store)
        const alreadyByCode = customGameKeys2[eCode] === listeningAction;
        const alreadyByKeyCode = (typeof Input !== 'undefined' && Input.keyMapper && Input.keyMapper[keyCode] === listeningAction);
        if (alreadyByCode || alreadyByKeyCode) {
            showToast(`Phím [${keyLabel}] đã được gán cho ${actionTitle} rồi!`, 'warning');
            cancelGameKeyListening();
            return;
        }

        // Ghi nhận action cũ (nếu có conflict)
        let oldAction = customGameKeys2[eCode] || null;
        if (!oldAction && typeof Input !== 'undefined' && Input.keyMapper && Input.keyMapper[keyCode]) {
            oldAction = Input.keyMapper[keyCode];
        }

        // Lưu vào cả hai store
        if (eCode) customGameKeys2[eCode] = listeningAction;
        if (keyCode) {
            customGameKeys[keyCode] = listeningAction;
            if (typeof Input !== 'undefined' && Input.keyMapper) {
                Input.keyMapper[keyCode] = listeningAction;
            }
        }
        saveCustomGameKeys();

        if (oldAction && oldAction !== listeningAction) {
            const oldInfo = GAME_ACTIONS[oldAction];
            const oldName = oldInfo ? oldInfo.name : oldAction;
            showToast(`Đã chuyển phím [${keyLabel}] từ ${oldName} → ${actionTitle}!`, 'success');
        } else {
            showToast(`Đã gán phím [${keyLabel}] cho ${actionTitle}!`, 'success');
        }

        cancelGameKeyListening();
    };

    document.addEventListener('keydown', gameKeyKeydownHandler, true);
}

// keyCode: số (dùng cho Input.keyMapper), eCode: chuỗi e.code (dùng cho customGameKeys2)
function unmapGameKey(keyCode, action, keyLabel, eCode) {
    backupOriginalGameKeyMapper();

    // Xóa khỏi customGameKeys2 (new store by e.code)
    if (eCode && customGameKeys2[eCode] !== undefined) {
        delete customGameKeys2[eCode];
    }

    // Xóa khỏi customGameKeys + Input.keyMapper (legacy store by keyCode)
    if (keyCode && typeof Input !== 'undefined' && Input.keyMapper) {
        const wasOriginalForThisAction = originalGameKeyMapper && (originalGameKeyMapper[keyCode] === action);
        const wasCustom = (customGameKeys[keyCode] !== undefined);

        if (wasCustom && !wasOriginalForThisAction) {
            delete customGameKeys[keyCode];
            if (originalGameKeyMapper && originalGameKeyMapper[keyCode]) {
                Input.keyMapper[keyCode] = originalGameKeyMapper[keyCode];
                showToast(`Đã bỏ remap phím [${keyLabel}]! Khôi phục về [${originalGameKeyMapper[keyCode]}].`, 'info');
            } else {
                delete Input.keyMapper[keyCode];
                showToast(`Đã bỏ remap phím [${keyLabel}]!`, 'success');
            }
        } else {
            customGameKeys[keyCode] = '__none__';
            delete Input.keyMapper[keyCode];
            showToast(`Đã gỡ phím [${keyLabel}] khỏi ${action}!`, 'info');
        }
    } else {
        // Không có Input (game dùng raw keydown hoàn toàn)
        showToast(`Đã bỏ phím [${keyLabel}]!`, 'success');
    }

    saveCustomGameKeys();
    renderGameKeys();
}

function resetAllGameKeys() {
    backupOriginalGameKeyMapper();
    if (typeof Input !== 'undefined' && Input.keyMapper && originalGameKeyMapper) {
        for (let k in Input.keyMapper) { delete Input.keyMapper[k]; }
        for (let k in originalGameKeyMapper) { Input.keyMapper[k] = originalGameKeyMapper[k]; }
    }
    customGameKeys = {};
    customGameKeys2 = {};
    try {
        localStorage.removeItem(PREFIX + 'game-keys');
        localStorage.removeItem('rpgm-cheat-game-keys');
        localStorage.removeItem(PREFIX + 'game-keys2');
    } catch(e) {}
    showToast('Đã khôi phục toàn bộ phím game về mặc định!', 'success');
    renderGameKeys();
}

function setupGameKeys() {
    const resetBtn = document.getElementById('ce-btn-reset-game-keys');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => { resetAllGameKeys(); });
    }

    // Cài raw keydown remap ngay (không cần chờ Input)
    installRawKeydownRemap();

    let attempts = 0;
    const applyInterval = setInterval(() => {
        attempts++;
        if (typeof Input !== 'undefined' && Input.keyMapper) {
            backupOriginalGameKeyMapper();
            applyCustomGameKeys();
            installInputOnKeyDownHook(); // Hook Input._onKeyDown sau khi Input sẵn sàng
            clearInterval(applyInterval);
        } else if (attempts > 30) {
            clearInterval(applyInterval);
        }
    }, 500);
}

function renderGameKeys() {
    const list = document.getElementById('ce-game-keys-list');
    if (!list) return;
    list.innerHTML = '';
    backupOriginalGameKeyMapper();

    const banner = document.getElementById('ce-game-keys-listening-banner');
    if (banner) {
        if (isListeningGameKey) {
            banner.style.display = 'block';
            const actionNameEl = document.getElementById('ce-listening-action-name');
            if (actionNameEl) {
                const actInfo = GAME_ACTIONS[listeningAction];
                actionNameEl.textContent = (actInfo ? actInfo.name : listeningAction);
            }
        } else {
            banner.style.display = 'none';
        }
    }

    for (let action in GAME_ACTIONS) {
        const actInfo = GAME_ACTIONS[action];
        const card = document.createElement('div');
        card.className = 'ce-remap-card';

        // Thu thập phím từ CẢ HAI nguồn, tránh trùng lặp
        // Dùng Map<eCode|keyCode_str, {keyCode, eCode, isCustom, label}>
        const keyMap = new Map();

        // Nguồn 1: customGameKeys2 (by e.code — độ chính xác cao)
        for (let eCode in customGameKeys2) {
            if (customGameKeys2[eCode] === action) {
                const label = keyCodeToLabel(eCode);
                keyMap.set(eCode, { keyCode: null, eCode, isCustom: true, label });
            }
        }

        // Nguồn 2: Input.keyMapper (by keyCode số) — thêm nếu chưa có trong keyMap2
        if (typeof Input !== 'undefined' && Input.keyMapper) {
            for (let k in Input.keyMapper) {
                if (Input.keyMapper[k] === action) {
                    const keyCode = parseInt(k, 10);
                    const isCustom = (customGameKeys[k] === action);
                    const label = keyCodeToLabel(keyCode);
                    // Tránh trùng: nếu eCode tương ứng đã có trong keyMap thì bỏ qua
                    const alreadyInMap = [...keyMap.values()].some(v => v.label === label);
                    if (!alreadyInMap) {
                        keyMap.set('kc_' + k, { keyCode, eCode: null, isCustom, label });
                    }
                }
            }
        }

        const isListeningThis = (isListeningGameKey && listeningAction === action);

        const header = document.createElement('div');
        header.className = 'ce-remap-header';
        header.innerHTML = `
            <div class="ce-remap-info">
                <span class="ce-remap-icon">${actInfo.icon}</span>
                <div class="ce-remap-text">
                    <div class="ce-remap-title-row">
                        <span class="ce-remap-label">${actInfo.name}</span>
                        <span class="ce-remap-action-tag">${action}</span>
                    </div>
                    <div class="ce-remap-desc">${actInfo.desc}</div>
                </div>
            </div>
            <button class="ce-action-btn ce-btn-remap-add ${isListeningThis ? 'listening' : ''}" data-action="${action}">
                ${isListeningThis ? '⏳ Bấm phím...' : '+ Gán phím'}
            </button>
        `;

        const addBtn = header.querySelector('.ce-btn-remap-add');
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isListeningGameKey && listeningAction === action) {
                cancelGameKeyListening();
                return;
            }
            startGameKeyListening(action);
        });

        const keysRow = document.createElement('div');
        keysRow.className = 'ce-remap-keys-row';

        if (keyMap.size === 0) {
            const noKeys = document.createElement('span');
            noKeys.className = 'ce-no-keys-hint';
            noKeys.textContent = 'Chưa có phím nào được gán cho hành động này';
            keysRow.appendChild(noKeys);
        } else {
            keyMap.forEach(({ keyCode, eCode, isCustom, label }) => {
                const chip = document.createElement('div');
                chip.className = 'ce-key-chip' + (isCustom ? ' custom' : ' default');
                chip.innerHTML = `
                    <span class="ce-key-chip-name">${label}</span>
                    ${isCustom ? '<span class="ce-key-chip-badge">Custom</span>' : ''}
                    <button class="ce-key-chip-remove" title="Bỏ gán phím ${label}">✕</button>
                `;
                chip.querySelector('.ce-key-chip-remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    unmapGameKey(keyCode, action, label, eCode);
                });
                keysRow.appendChild(chip);
            });
        }

        card.appendChild(header);
        card.appendChild(keysRow);
        list.appendChild(card);
    }
}

// ==========================================
// 7. KEYBINDING SYSTEM (CHEAT HOTKEYS)
// ==========================================
function renderKeybinds() {
    const list = document.getElementById('ce-keybinds-list');
    if (!list) return;
    list.innerHTML = '';
    
    Object.keys(CE.keybinds).forEach(key => {
        const kb = CE.keybinds[key];
        const row = document.createElement('div');
        row.className = 'ce-keybind-row';
        const isListening = (window.ceListeningKey === key);
        const hasKey = !!kb.key;
        const keyDisplay = hasKey ? keyCodeToLabel(kb.key) : 'Chưa gán';

        row.innerHTML = `
            <span class="ce-keybind-name">${kb.label}</span>
            <div style="display:flex; align-items:center; gap:6px;">
                <button class="ce-keybind-btn ${isListening ? 'listening' : ''} ${!hasKey ? 'empty' : ''}" data-kb="${key}">
                    ${isListening ? 'Bấm phím...' : keyDisplay}
                </button>
                ${hasKey && key !== 'togglePanel' ? `<button class="ce-keybind-clear-btn" data-kb="${key}" title="Bỏ phím tắt">✕</button>` : ''}
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll('.ce-keybind-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const kbKey = this.dataset.kb;
            if (window.ceListeningKey === kbKey) {
                window.ceListeningKey = null;
                renderKeybinds();
                return;
            }
            window.ceListeningKey = kbKey;
            renderKeybinds();
        });
    });

    list.querySelectorAll('.ce-keybind-clear-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const kbKey = this.dataset.kb;
            if (kbKey === 'togglePanel') {
                showToast('Không thể bỏ phím tắt Toggle Panel!', 'error');
                return;
            }
            setNewKeybind(kbKey, '');
            showToast(`Đã bỏ phím tắt cho ${CE.keybinds[kbKey].label}!`, 'info');
        });
    });
}

function initKeybindingSystem() {
    renderKeybinds();
}

function setNewKeybind(kbKey, newCode) {
    if (kbKey === 'togglePanel' && !newCode) {
        window.ceListeningKey = null;
        renderKeybinds();
        showToast('Không thể bỏ phím tắt Toggle Panel!', 'error');
        return;
    }

    let replacedLabels = [];
    if (newCode) {
        if (kbKey !== 'togglePanel' && CE.keybinds.togglePanel && CE.keybinds.togglePanel.key === newCode) {
            window.ceListeningKey = null;
            renderKeybinds();
            showToast(`Phím [${keyCodeToLabel(newCode)}] đang dùng cho Toggle Panel! Hãy đổi Toggle Panel trước.`, 'error');
            return;
        }

        Object.keys(CE.keybinds).forEach(otherKey => {
            if (otherKey !== kbKey && CE.keybinds[otherKey] && CE.keybinds[otherKey].key === newCode) {
                CE.keybinds[otherKey].key = '';
                replacedLabels.push(CE.keybinds[otherKey].label);
                const oldHkEl = document.getElementById(`ce-hotkey-${otherKey}`);
                if (oldHkEl) oldHkEl.innerText = '';
            }
        });
    }

    CE.keybinds[kbKey].key = newCode;
    try {
        localStorage.setItem(PREFIX + 'keybinds', JSON.stringify(CE.keybinds));
        localStorage.setItem('rpgm-cheat-keybinds', JSON.stringify(CE.keybinds));
    } catch(e) {}
    
    window.ceListeningKey = null;
    renderKeybinds();

    // Update labels on UI
    const hkEl = document.getElementById(`ce-hotkey-${kbKey}`);
    if (hkEl) hkEl.innerText = newCode ? keyCodeToLabel(newCode) : '';

    if (kbKey === 'quickSave') {
        const btnQS = document.getElementById('ce-btn-qsave');
        if (btnQS) btnQS.innerText = `💾 Q.Save ${newCode ? '['+keyCodeToLabel(newCode)+']' : ''}`;
    }
    if (kbKey === 'quickLoad') {
        const btnQL = document.getElementById('ce-btn-qload');
        if (btnQL) btnQL.innerText = `📂 Q.Load ${newCode ? '['+keyCodeToLabel(newCode)+']' : ''}`;
    }

    if (newCode) {
        const suffix = replacedLabels.length > 0 ? ` (đã gỡ khỏi: ${replacedLabels.join(', ')})` : '';
        showToast(`Đã gán phím [${keyCodeToLabel(newCode)}] cho ${CE.keybinds[kbKey].label}${suffix}!`, 'success');
    }
}

    // ==========================================
    // 8. SAVED POSITIONS (MỚI) 
    // ==========================================
    function saveCurrentPosition() {
        if (typeof $gamePlayer === 'undefined' || typeof $gameMap === 'undefined') return;
        const mapId = $gameMap.mapId();
        const mapName = $dataMapInfos && $dataMapInfos[mapId] ? $dataMapInfos[mapId].name : 'Unknown Map';
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;

        CE.savedPositions.push({ mapId, mapName, name: mapName, customName: mapName, x, y, tags: [] });
        if (CE.savedPositions.length > 50) CE.savedPositions.shift();
        
        localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
        localStorage.setItem('rpgm-cheat-positions', JSON.stringify(CE.savedPositions));
        showToast(`📍 Đã lưu: ${mapName} (${x},${y})`, 'success');
        if (document.getElementById('tab-teleport').classList.contains('active')) {
            renderMapList(document.getElementById('ce-search-map').value);
        }
    }

    function deleteSavedPosition(index) {
        if (CE.savedPositions[index]) {
            const name = CE.savedPositions[index].customName || CE.savedPositions[index].name || CE.savedPositions[index].mapName;
            CE.savedPositions.splice(index, 1);
            localStorage.setItem(PREFIX + 'positions', JSON.stringify(CE.savedPositions));
            localStorage.setItem('rpgm-cheat-positions', JSON.stringify(CE.savedPositions));
            showToast(`Đã xóa vị trí: ${name}`, 'info');
            if (document.getElementById('tab-teleport').classList.contains('active')) {
                renderMapList(document.getElementById('ce-search-map').value);
            }
        }
    }

    
    function undoTeleport() {
        if (window.ceLastTeleport) {
            teleportTo(window.ceLastTeleport.mapId, window.ceLastTeleport.x, window.ceLastTeleport.y);
            showToast('Teleport undone', 'success');
        } else {
            showToast('No previous teleport to undo', 'error');
        }
    }

    function teleportTo(mapId, x, y) {
        if (typeof $gamePlayer !== "undefined" && typeof $gameMap !== "undefined") {
            window.ceLastTeleport = { mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y };
        }
        if (typeof $gamePlayer !== 'undefined') {
            $gamePlayer.reserveTransfer(mapId, x, y, 2, 0);
            showToast('Teleporting...', 'success');
        }
    }

    function triggerTeleportNumber(num) {
        if (num < 1 || num > 9) return;
        if (!window.ceTeleportableItems) return;
        const item = window.ceTeleportableItems[num - 1];
        if (item) {
            if (item.type === 'saved') {
                teleportTo(item.mapId, item.x, item.y);
            } else if (item.type === 'map') {
                teleportTo(item.mapId, 0, 0);
            }
        }
    }

    // ==========================================
    // 9. RESIZE SYSTEM (NÂNG CẤP TOÀN DIỆN)
    // ==========================================
    function initResizeSystem() {
        const panel = document.getElementById('ce-panel');
        if (!panel) return;

        let isResizing = false;
        let currentDir = '';
        let startX = 0, startY = 0;
        let startW = 0, startH = 0;
        let startL = 0, startT = 0;
        let currentX = 0, currentY = 0;
        let rafId = null;

        const resizers = panel.querySelectorAll('.ce-resizer, #ce-resize-handle');

        function startResize(e, dir) {
            if (e.button !== 0 && e.type !== 'touchstart') return;
            if (CE.minimized) return; // Không resize khi đang thu nhỏ
            
            isResizing = true;
            currentDir = dir;
            
            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX;
            startY = pt.clientY;
            currentX = startX;
            currentY = startY;
            
            const rect = panel.getBoundingClientRect();
            startW = rect.width;
            startH = rect.height;
            startL = rect.left;
            startT = rect.top;

            panel.classList.add('ce-is-interacting');
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            
            const cursors = {
                'r': 'ew-resize', 'l': 'ew-resize',
                'b': 'ns-resize', 't': 'ns-resize',
                'se': 'nwse-resize', 'nw': 'nwse-resize',
                'sw': 'nesw-resize', 'ne': 'nesw-resize'
            };
            document.body.style.cursor = cursors[dir] || 'nwse-resize';

            e.preventDefault();
            e.stopPropagation();
        }

        resizers.forEach(resizer => {
            const dir = resizer.dataset.dir || 'se';
            resizer.addEventListener('mousedown', (e) => startResize(e, dir));
            resizer.addEventListener('touchstart', (e) => startResize(e, dir), { passive: false });
        });

        function applyResize() {
            if (!isResizing) return;
            
            const dx = currentX - startX;
            const dy = currentY - startY;

            let newW = startW;
            let newH = startH;
            let newL = startL;
            let newT = startT;

            const winW = window.innerWidth || 800;
            const winH = window.innerHeight || 600;

            const minW = 280;
            const maxW = Math.max(minW, winW - 20);
            const minH = 180;
            const maxH = Math.max(minH, winH - 20);

            // Xử lý co giãn theo chiều ngang
            if (currentDir.includes('r')) {
                newW = Math.max(minW, Math.min(maxW, startW + dx));
            } else if (currentDir.includes('l')) {
                const potentialW = startW - dx;
                newW = Math.max(minW, Math.min(maxW, potentialW));
                newL = startL + (startW - newW);
                if (newL < 0) {
                    newW += newL;
                    newL = 0;
                }
            }

            // Xử lý co giãn theo chiều dọc
            if (currentDir.includes('b')) {
                newH = Math.max(minH, Math.min(maxH, startH + dy));
            } else if (currentDir.includes('t')) {
                const potentialH = startH - dy;
                newH = Math.max(minH, Math.min(maxH, potentialH));
                newT = startT + (startH - newH);
                if (newT < 0) {
                    newH += newT;
                    newT = 0;
                }
            }

            panel.style.width = Math.round(newW) + 'px';
            panel.style.height = Math.round(newH) + 'px';
            if (currentDir.includes('l')) panel.style.left = Math.round(newL) + 'px';
            if (currentDir.includes('t')) panel.style.top = Math.round(newT) + 'px';

            CE.panelRect.w = Math.round(newW);
            CE.panelRect.h = Math.round(newH);
            if (currentDir.includes('l')) CE.panelRect.x = Math.round(newL);
            if (currentDir.includes('t')) CE.panelRect.y = Math.round(newT);

            updateBodyMaxHeight();
            rafId = null;
        }

        function onPointerMove(e) {
            if (!isResizing) return;
            const pt = e.touches ? e.touches[0] : e;
            currentX = pt.clientX;
            currentY = pt.clientY;

            if (e.buttons === 0 && !e.touches) {
                endResize();
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!rafId) {
                rafId = window.requestAnimationFrame(applyResize);
            }
        }

        function endResize() {
            if (!isResizing) return;
            isResizing = false;
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
            panel.classList.remove('ce-is-interacting');
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.cursor = '';

            localStorage.setItem(PREFIX + 'rect', JSON.stringify(CE.panelRect));
            localStorage.setItem('rpgm-cheat-rect', JSON.stringify(CE.panelRect));
        }

        window.addEventListener('mousemove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('touchmove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('mouseup', endResize, { capture: true });
        window.addEventListener('touchend', endResize, { capture: true });
        window.addEventListener('blur', endResize);

        // Khởi tạo chiều cao ban đầu nếu đã có kích thước lưu sẵn
        updateBodyMaxHeight();
    }

    function updateBodyMaxHeight() {
        const panel = document.getElementById('ce-panel');
        const header = document.getElementById('ce-header');
        const footer = document.getElementById('ce-footer');
        const body = document.getElementById('ce-body');
        if (panel && header && footer && body) {
            if (panel.style.height && panel.style.height !== 'auto') {
                const pH = parseInt(panel.style.height, 10) || panel.offsetHeight;
                const hH = header.offsetHeight || 44;
                const fH = (footer && footer.style.display !== 'none') ? (footer.offsetHeight || 30) : 0;
                const bodyH = Math.max(60, pH - hH - fH);
                body.style.maxHeight = bodyH + 'px';
                body.style.height = bodyH + 'px';
            } else {
                body.style.maxHeight = '';
                body.style.height = '';
            }
        }
    }

    // ==========================================
    
    function togglePanel(forceVisible) {
        CE.visible = forceVisible !== undefined ? forceVisible : !CE.visible;
        const panel = document.getElementById('ce-panel');
        const floatTp = document.getElementById('ce-floating-tp');
        if (CE.visible) {
            panel.classList.remove('ce-hidden');
            const footer = document.getElementById('ce-footer');
            if (footer) footer.style.display = 'flex';
            refreshCurrentTab();
            if (floatTp) floatTp.style.display = 'none';
        } else {
            panel.classList.add('ce-hidden');
            if (floatTp && CE.showFloatingTp) floatTp.style.display = 'flex';
        }
    }

    function toggleMinimize() {
        CE.minimized = !CE.minimized;
        const panel = document.getElementById('ce-panel');
        if (!panel) return;
        const resizers = panel.querySelectorAll('.ce-resizer, #ce-resize-handle');
        if (CE.minimized) {
            panel.classList.add('ce-minimized');
            resizers.forEach(r => r.style.display = 'none');
            panel.style.height = 'auto'; // Let header dictate height
            updateBodyMaxHeight();
        } else {
            panel.classList.remove('ce-minimized');
            resizers.forEach(r => r.style.display = '');
            if (CE.panelRect.h) {
                panel.style.height = CE.panelRect.h + 'px';
            }
            updateBodyMaxHeight();
        }
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('ce-toast-container');
        const toast = document.createElement('div');
        toast.className = `ce-toast ${type}`;
        
        let icon = 'ℹ️';
        if(type==='success') icon='✅';
        if(type==='error') icon='❌';
        if(type==='warning') icon='⚠️';
        
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('ce-fadeout');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function setupDraggable() {
        const header = document.getElementById('ce-header');
        const panel = document.getElementById('ce-panel');
        if (!header || !panel) return;

        let isDragging = false;
        let startX = 0, startY = 0;
        let initialX = 0, initialY = 0;
        let currentX = 0, currentY = 0;
        let rafId = null;

        function startDrag(e) {
            if (e.button !== 0 && e.type !== 'touchstart') return;
            // Không drag nếu click vào button hoặc resize handles
            if (e.target.closest('button') || e.target.closest('.ce-btn-group') || e.target.closest('.ce-resizer')) return;

            isDragging = true;
            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX;
            startY = pt.clientY;
            currentX = startX;
            currentY = startY;

            initialX = panel.offsetLeft;
            initialY = panel.offsetTop;

            panel.classList.add('ce-is-interacting');
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
            document.body.style.cursor = 'grabbing';

            e.preventDefault();
            e.stopPropagation();
        }

        header.addEventListener('mousedown', startDrag);
        header.addEventListener('touchstart', startDrag, { passive: false });

        // Double click header để thu nhỏ / khôi phục kích thước
        header.addEventListener('dblclick', (e) => {
            if (e.target.closest('button')) return;
            toggleMinimize();
        });

        function applyDrag() {
            if (!isDragging) return;

            const dx = currentX - startX;
            const dy = currentY - startY;

            const winW = window.innerWidth || 800;
            const winH = window.innerHeight || 600;
            const pW = panel.offsetWidth;

            let nx = initialX + dx;
            let ny = initialY + dy;

            // Clamping an toàn: header luôn nằm trong tầm nhìn để có thể kéo lại
            const minX = pW > winW ? (winW - pW) : 0;
            const maxX = Math.max(0, winW - Math.min(pW, 80));
            nx = Math.max(minX, Math.min(maxX, nx));

            const minY = 0;
            const maxY = Math.max(0, winH - 40);
            ny = Math.max(minY, Math.min(maxY, ny));

            panel.style.left = Math.round(nx) + 'px';
            panel.style.top = Math.round(ny) + 'px';

            CE.panelRect.x = Math.round(nx);
            CE.panelRect.y = Math.round(ny);

            rafId = null;
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const pt = e.touches ? e.touches[0] : e;
            currentX = pt.clientX;
            currentY = pt.clientY;

            if (e.buttons === 0 && !e.touches) {
                endDrag();
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!rafId) {
                rafId = window.requestAnimationFrame(applyDrag);
            }
        }

        function endDrag() {
            if (!isDragging) return;
            isDragging = false;
            if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
            }
            panel.classList.remove('ce-is-interacting');
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.body.style.cursor = '';

            CE.panelRect.x = panel.offsetLeft;
            CE.panelRect.y = panel.offsetTop;
            localStorage.setItem(PREFIX + 'rect', JSON.stringify(CE.panelRect));
            localStorage.setItem('rpgm-cheat-rect', JSON.stringify(CE.panelRect));
        }

        window.addEventListener('mousemove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('touchmove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('mouseup', endDrag, { capture: true });
        window.addEventListener('touchend', endDrag, { capture: true });
        window.addEventListener('blur', endDrag);

        // Đảm bảo panel không bay khỏi màn hình khi resize cửa sổ game
        window.addEventListener('resize', () => {
            if (CE.minimized || !panel) return;
            const winW = window.innerWidth || 800;
            const winH = window.innerHeight || 600;
            let curX = panel.offsetLeft;
            let curY = panel.offsetTop;
            let changed = false;

            if (curX > winW - 60) { curX = Math.max(0, winW - panel.offsetWidth); changed = true; }
            if (curY > winH - 40) { curY = Math.max(0, winH - 40); changed = true; }
            if (curX < 0) { curX = 0; changed = true; }
            if (curY < 0) { curY = 0; changed = true; }

            if (changed) {
                panel.style.left = curX + 'px';
                panel.style.top = curY + 'px';
                CE.panelRect.x = curX;
                CE.panelRect.y = curY;
                localStorage.setItem(PREFIX + 'rect', JSON.stringify(CE.panelRect));
                localStorage.setItem('rpgm-cheat-rect', JSON.stringify(CE.panelRect));
            }
        });
    }

    function loadState() {
        // Only visual states for toggle elements. Game state variables are set in CE object.
    }

    // ==========================================
    // 11. STATUS BAR UPDATER
    // ==========================================
    function startStatusBarUpdater() {
        setInterval(() => {
            if (!CE.visible || CE.minimized) return;
            
            try {
                if (typeof $gameParty !== 'undefined' && $gameParty && typeof $gameParty.leader === 'function' && $gameParty.leader()) {
                    const leader = $gameParty.leader();
                    const hpEl = document.getElementById('ce-st-hp');
                    const mpEl = document.getElementById('ce-st-mp');
                    const goldEl = document.getElementById('ce-st-gold');
                    if (hpEl) hpEl.innerText = `HP: ${leader.hp}/${leader.mhp}`;
                    if (mpEl) mpEl.innerText = `MP: ${leader.mp}/${leader.mmp}`;
                    if (goldEl && typeof $gameParty.gold === 'function') goldEl.innerText = `Gold: ${$gameParty.gold()}`;
                }

                if (typeof $gameMap !== 'undefined' && $gameMap && typeof $dataMapInfos !== 'undefined' && $dataMapInfos && typeof $gamePlayer !== 'undefined' && $gamePlayer) {
                    const mapId = $gameMap.mapId();
                    const mapEl = document.getElementById('ce-current-map');
                    if (mapEl && mapId > 0 && $dataMapInfos[mapId]) {
                        mapEl.innerText = `Current: [${mapId}] ${$dataMapInfos[mapId].name} (${$gamePlayer.x}, ${$gamePlayer.y})`;
                    }
                }
                updateVarWatcher();
            } catch(e) {}
        }, 500);
    }
    
    // ==========================================
    // 12. STATE MANAGEMENT
    // (Included in IIFE closure)
})();

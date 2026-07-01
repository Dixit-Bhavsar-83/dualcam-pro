document.addEventListener("DOMContentLoaded", () => {
    // 1. Application State Configuration
    const AppState = {
        isRecording: false,
        recordingDuration: 0,
        timerInterval: null,
        activeResolution: "1080p",
        activeFPS: 30,
        flashMode: "off",
        gridActive: false,
        stabilization: false,
        beautyFilter: false,
        exposure: 0,
        streams: { front: null, back: null },
        recorders: { front: null, back: null },
        chunks: { front: [], back: [] },
        simulatedEngine: { active: false, animationFrameId: null },
        gallery: JSON.parse(localStorage.getItem("dualcam_gallery") || "[]")
    };

    // Safe DOM Selector Utility to prevent absolute crashes
    const safeGet = (id) => document.getElementById(id);

    // 2. DOM Registration Nodes
    const DOM = {
        splashScreen: safeGet("splashScreen"),
        permissionScreen: safeGet("permissionScreen"),
        btnGrantPermission: safeGet("btnGrantPermission"),
        videoBack: safeGet("videoBack"),
        videoFront: safeGet("videoFront"),
        simulatedBackCanvas: safeGet("simulatedBackCanvas"),
        simulatedFrontCanvas: safeGet("simulatedFrontCanvas"),
        cameraViewport: safeGet("cameraViewport"),
        frontCamContainer: safeGet("frontCamContainer"),
        btnRecord: safeGet("btnRecord"),
        recordTriggerState: safeGet("recordTriggerState"),
        recordingHUD: safeGet("recordingHUD"),
        txtTimer: safeGet("txtTimer"),
        recordingProgressRing: safeGet("recordingProgressRing"),
        flashOverlay: safeGet("flashOverlay"),
        focusRing: safeGet("focusRing"),
        exposureSlider: safeGet("exposureSlider"),
        btnOpenSettings: safeGet("btnOpenSettings"),
        settingsBottomSheet: safeGet("settingsBottomSheet"),
        btnCloseSettingsHandle: safeGet("btnCloseSettingsHandle"),
        btnOpenGallery: safeGet("btnOpenGallery"),
        btnCloseGallery: safeGet("btnCloseGallery"),
        galleryModal: safeGet("galleryModal"),
        galleryGrid: safeGet("galleryGrid"),
        galleryEmptyState: safeGet("galleryEmptyState"),
        galleryThumb: safeGet("galleryThumb"),
        btnSwapLayout: safeGet("btnSwapLayout"),
        quickFlash: safeGet("quickFlash"),
        flashIcon: safeGet("flashIcon"),
        quickGrid: safeGet("quickGrid"),
        gridIcon: safeGet("gridIcon"),
        toggleStabilization: safeGet("toggleStabilization"),
        toggleBeauty: safeGet("toggleBeauty"),
        hudResolution: safeGet("hudResolution"),
        hudFPS: safeGet("hudFPS"),
        hudStabilization: safeGet("hudStabilization")
    };

    // 3. Auto-Dismiss Splash Screen (Bulletproof Implementation)
    if (DOM.splashScreen) {
        setTimeout(() => {
            DOM.splashScreen.style.opacity = "0";
            DOM.splashScreen.style.pointerEvents = "none";
            setTimeout(() => {
                DOM.splashScreen.style.display = "none"; // Permanently remove from view block
            }, 700);
            
            // Trigger Permissions Gate Panel
            if (DOM.permissionScreen) {
                DOM.permissionScreen.classList.remove("hidden");
            }
        }, 1500);
    }

    // Live Android Native Clock Synchronization
    setInterval(() => {
        const timeEl = safeGet("statusBarTime");
        if (timeEl) {
            const d = new Date();
            timeEl.innerText = d.toTimeString().substring(0, 5);
        }
    }, 1000);

    const constraintsMatrix = {
        "720p": { width: 1280, height: 720 },
        "1080p": { width: 1920, height: 1080 },
        "4k": { width: 3840, height: 2160 }
    };

    // 4. Hardware/Simulation Initialization Pipeline
    if (DOM.btnGrantPermission) {
        DOM.btnGrantPermission.addEventListener("click", async () => {
            if (DOM.permissionScreen) DOM.permissionScreen.classList.add("hidden");
            await startupCameraSubsystems();
        });
    }

    async function startupCameraSubsystems() {
        const resolution = constraintsMatrix[AppState.activeResolution] || constraintsMatrix["1080p"];
        
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                throw new Error("Hardware tracking libraries missing. Forcing high-fidelity emulator.");
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");

            if (videoDevices.length >= 2) {
                AppState.streams.back = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: videoDevices[0].deviceId, width: resolution.width, height: resolution.height },
                    audio: true
                });
                AppState.streams.front = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: videoDevices[1].deviceId, width: 640, height: 480 },
                    audio: false
                });
                
                if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
                if (DOM.videoFront) DOM.videoFront.srcObject = AppState.streams.front;
                AppState.simulatedEngine.active = false;
            } else {
                throw new Error("Single sensor environment. Launching dual processing wrapper layer.");
            }
        } catch (err) {
            console.warn(err.message);
            activateSimulatedVirtualCameraPipeline();
        }
        updateGalleryThumbnails();
        createCameraGridOverlay();
    }

    function activateSimulatedVirtualCameraPipeline() {
        AppState.simulatedEngine.active = true;
        if (DOM.videoBack) DOM.videoBack.classList.add("hidden");
        if (DOM.videoFront) DOM.videoFront.classList.add("hidden");
        if (DOM.simulatedBackCanvas) DOM.simulatedBackCanvas.classList.remove("hidden");
        if (DOM.simulatedFrontCanvas) DOM.simulatedFrontCanvas.classList.remove("hidden");

        const ctxBack = DOM.simulatedBackCanvas ? DOM.simulatedBackCanvas.getContext("2d") : null;
        const ctxFront = DOM.simulatedFrontCanvas ? DOM.simulatedFrontCanvas.getContext("2d") : null;

        if (DOM.simulatedBackCanvas) { DOM.simulatedBackCanvas.width = 412; DOM.simulatedBackCanvas.height = 732; }
        if (DOM.simulatedFrontCanvas) { DOM.simulatedFrontCanvas.width = 150; DOM.simulatedFrontCanvas.height = 200; }

        let frameCounter = 0;

        function renderSimulatedLoop() {
            if (!AppState.simulatedEngine.active) return;
            frameCounter++;

            if (ctxBack && DOM.simulatedBackCanvas) {
                ctxBack.fillStyle = "#0c0a09";
                ctxBack.fillRect(0, 0, DOM.simulatedBackCanvas.width, DOM.simulatedBackCanvas.height);
                
                ctxBack.save();
                ctxBack.translate(DOM.simulatedBackCanvas.width/2, DOM.simulatedBackCanvas.height/2);
                ctxBack.rotate((frameCounter * 0.2) * Math.PI / 180);
                const gradient = ctxBack.createLinearGradient(-150, -150, 150, 150);
                gradient.addColorStop(0, '#1e3a8a');
                gradient.addColorStop(0.5, '#020617');
                gradient.addColorStop(1, '#172554');
                ctxBack.fillStyle = gradient;
                ctxBack.beginPath();
                ctxBack.arc(0, 0, 140 + Math.sin(frameCounter * 0.05) * 10, 0, Math.PI * 2);
                ctxBack.fill();
                ctxBack.restore();

                ctxBack.fillStyle = "rgba(255,255,255,0.3)";
                ctxBack.font = "11px JetBrains Mono";
                ctxBack.fillText(`REAR STREAM SENSOR // ISO:${100 + Math.floor(Math.sin(frameCounter*0.01)*20)}`, 20, 40);
                ctxBack.fillText(`COMPENSATION: ${AppState.exposure.toFixed(1)} EV`, 20, 60);
            }

            if (ctxFront && DOM.simulatedFrontCanvas) {
                ctxFront.fillStyle = "#1c1917";
                ctxFront.fillRect(0, 0, DOM.simulatedFrontCanvas.width, DOM.simulatedFrontCanvas.height);
                ctxFront.fillStyle = "#2563eb";
                ctxFront.beginPath();
                ctxFront.arc(DOM.simulatedFrontCanvas.width/2, DOM.simulatedFrontCanvas.height/2 + Math.sin(frameCounter*0.08)*5, 25, 0, Math.PI * 2);
                ctxFront.fill();
            }

            AppState.simulatedEngine.animationFrameId = requestAnimationFrame(renderSimulatedLoop);
        }
        renderSimulatedLoop();
    }

    // 5. Recording Management Ecosystem
    if (DOM.btnRecord) {
        DOM.btnRecord.addEventListener("click", () => {
            if (!AppState.isRecording) startCaptureSession();
            else stopCaptureSession();
        });
    }

    function startCaptureSession() {
        AppState.isRecording = true;
        AppState.recordingDuration = 0;
        if (DOM.recordingHUD) DOM.recordingHUD.classList.remove("opacity-0");
        if (DOM.recordTriggerState) {
            DOM.recordTriggerState.classList.replace("rounded-full", "rounded-md");
            DOM.recordTriggerState.classList.add("scale-75");
        }
        
        if (AppState.flashMode === "on" && DOM.flashOverlay) {
            DOM.flashOverlay.classList.replace("opacity-0", "opacity-100");
            setTimeout(() => DOM.flashOverlay.classList.replace("opacity-100", "opacity-0"), 150);
        }

        AppState.timerInterval = setInterval(() => {
            AppState.recordingDuration++;
            const mins = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
            const secs = String(AppState.recordingDuration % 60).padStart(2, '0');
            if (DOM.txtTimer) DOM.txtTimer.innerText = `${mins}:${secs}`;

            if (DOM.recordingProgressRing) {
                const progress = (AppState.recordingDuration % 60) / 60;
                DOM.recordingProgressRing.style.strokeDashoffset = 264 - (progress * 264);
            }
        }, 1000);
    }

    function stopCaptureSession() {
        AppState.isRecording = false;
        clearInterval(AppState.timerInterval);
        if (DOM.recordingHUD) DOM.recordingHUD.classList.add("opacity-0");
        if (DOM.recordTriggerState) {
            DOM.recordTriggerState.classList.replace("rounded-md", "rounded-full");
            DOM.recordTriggerState.classList.remove("scale-75");
        }
        if (DOM.recordingProgressRing) DOM.recordingProgressRing.style.strokeDashoffset = "264";

        packageSimulatedAssetTrack("Back");
        packageSimulatedAssetTrack("Front");
    }

    function packageSimulatedAssetTrack(prefix) {
        const mockBlob = new Blob([`Mock channel data for ${prefix}`], { type: 'video/mp4' });
        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const filename = `${prefix}_${timestamp}.mp4`;
        const url = URL.createObjectURL(mockBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        AppState.gallery.unshift({
            id: Date.now() + Math.random(),
            filename: filename,
            date: new Date().toLocaleDateString(),
            duration: DOM.txtTimer ? DOM.txtTimer.innerText : "00:05",
            prefix: prefix,
            mockUrl: url
        });
        localStorage.setItem("dualcam_gallery", JSON.stringify(AppState.gallery));
        updateGalleryThumbnails();
    }

    // 6. UI Helpers & Overlays Logic
    function createCameraGridOverlay() {
        if (!DOM.cameraViewport || safeGet("gridOverlay")) return;
        const overlay = document.createElement("div");
        overlay.id = "gridOverlay";
        overlay.className = "camera-grid-overlay";
        DOM.cameraViewport.appendChild(overlay);
    }

    if (DOM.quickGrid) {
        DOM.quickGrid.addEventListener("click", () => {
            AppState.gridActive = !AppState.gridActive;
            const overlay = safeGet("gridOverlay");
            if (overlay) {
                overlay.classList.toggle("active", AppState.gridActive);
                if (DOM.gridIcon) DOM.gridIcon.classList.toggle("text-blue-500", AppState.gridActive);
            }
        });
    }

    if (DOM.quickFlash) {
        DOM.quickFlash.addEventListener("click", () => {
            AppState.flashMode = AppState.flashMode === "off" ? "on" : "off";
            if (DOM.flashIcon) {
                DOM.flashIcon.innerText = AppState.flashMode === "on" ? "flash_on" : "flash_off";
                DOM.flashIcon.classList.toggle("text-yellow-400", AppState.flashMode === "on");
            }
        });
    }

    if (DOM.exposureSlider) {
        DOM.exposureSlider.addEventListener("input", (e) => {
            AppState.exposure = parseFloat(e.target.value);
            const bf = 1 + (AppState.exposure * 0.25);
            if (DOM.videoBack) DOM.videoBack.style.filter = `brightness(${bf})`;
            if (DOM.simulatedBackCanvas) DOM.simulatedBackCanvas.style.filter = `brightness(${bf})`;
        });
    }

    // Interactive Dragging Setup Node
    let isDragging = false, startX, startY, initialLeft, initialTop;
    if (DOM.frontCamContainer) {
        DOM.frontCamContainer.addEventListener("pointerdown", (e) => {
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initialLeft = DOM.frontCamContainer.offsetLeft;
            initialTop = DOM.frontCamContainer.offsetTop;
            DOM.frontCamContainer.setPointerCapture(e.pointerId);
        });

        DOM.frontCamContainer.addEventListener("pointermove", (e) => {
            if (!isDragging || !DOM.cameraViewport) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            let nl = initialLeft + dx, nt = initialTop + dy;
            
            const ml = DOM.cameraViewport.clientWidth - DOM.frontCamContainer.clientWidth;
            const mt = DOM.cameraViewport.clientHeight - DOM.frontCamContainer.clientHeight;
            
            DOM.frontCamContainer.style.left = `${Math.max(0, Math.min(nl, ml))}px`;
            DOM.frontCamContainer.style.top = `${Math.max(0, Math.min(nt, mt))}px`;
        });

        DOM.frontCamContainer.addEventListener("pointerup", (e) => {
            isDragging = false;
            DOM.frontCamContainer.releasePointerCapture(e.pointerId);
        });
    }

    // Pro Panels Handlers
    if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener("click", () => DOM.settingsBottomSheet?.classList.remove("translate-y-full"));
    if (DOM.btnCloseSettingsHandle) DOM.btnCloseSettingsHandle.addEventListener("click", () => DOM.settingsBottomSheet?.classList.add("translate-y-full"));

    if (DOM.btnOpenGallery) DOM.btnOpenGallery.addEventListener("click", () => { renderGalleryContents(); DOM.galleryModal?.classList.remove("translate-y-full"); });
    if (DOM.btnCloseGallery) DOM.btnCloseGallery.addEventListener("click", () => DOM.galleryModal?.classList.add("translate-y-full"));

    function updateGalleryThumbnails() {
        if (!DOM.galleryThumb) return;
        if (AppState.gallery.length > 0) {
            DOM.galleryThumb.innerHTML = `<span class="material-icons-round text-xs text-white bg-blue-600 p-1 rounded-full">play_arrow</span>`;
        } else {
            DOM.galleryThumb.innerHTML = `<span class="material-icons-round text-white/40 text-xl">photo_library</span>`;
        }
    }

    function renderGalleryContents() {
        if (!DOM.galleryGrid) return;
        DOM.galleryGrid.querySelectorAll(".gallery-item").forEach(el => el.remove());

        if (AppState.gallery.length === 0) {
            DOM.galleryEmptyState?.classList.remove("hidden");
            return;
        }
        DOM.galleryEmptyState?.classList.add("hidden");

        AppState.gallery.forEach(item => {
            const node = document.createElement("div");
            node.className = "gallery-item bg-stone-900 rounded-2xl border border-stone-800 p-3 flex flex-col gap-2";
            node.innerHTML = `
                <div class="aspect-video bg-stone-950 rounded-xl flex flex-col items-center justify-center relative border border-stone-800">
                    <span class="material-icons-round text-2xl text-blue-500">movie</span>
                    <span class="absolute bottom-1 right-1 font-mono text-[9px] bg-black/60 px-1 rounded">${item.duration}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-mono truncate text-stone-200">${item.filename}</span>
                </div>
            `;
            DOM.galleryGrid.appendChild(node);
        });
    }
});

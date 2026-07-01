document.addEventListener("DOMContentLoaded", () => {
    const AppState = {
        isRecording: false,
        recordingDuration: 0,
        timerInterval: null,
        flashMode: "off",
        gridActive: false,
        stabilization: false,
        beautyFilter: false,
        exposure: 0,
        streams: { front: null, back: null },
        mediaRecorder: null,
        recordedChunks: [],
        canvasStream: null,
        animationId: null,
        gallery: JSON.parse(localStorage.getItem("dualcam_gallery") || "[]")
    };

    const safeGet = (id) => document.getElementById(id);
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
        quickFlash: safeGet("quickFlash"),
        flashIcon: safeGet("flashIcon"),
        quickGrid: safeGet("quickGrid"),
        gridIcon: safeGet("gridIcon"),
        toggleStabilization: safeGet("toggleStabilization"),
        toggleBeauty: safeGet("toggleBeauty")
    };

    // Auto-Dismiss Splash Screen Fast
    if (DOM.splashScreen) {
        setTimeout(() => {
            DOM.splashScreen.style.opacity = "0";
            setTimeout(() => {
                DOM.splashScreen.style.display = "none";
                if (DOM.permissionScreen) DOM.permissionScreen.classList.remove("hidden");
            }, 500);
        }, 1200);
    }

    if (DOM.btnGrantPermission) {
        DOM.btnGrantPermission.addEventListener("click", async () => {
            if (DOM.permissionScreen) DOM.permissionScreen.classList.add("hidden");
            await startupCameraSubsystems();
        });
    }

    async function startupCameraSubsystems() {
        try {
            // BACK CAMERA ACQUISITION
            AppState.streams.back = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
        } catch (err) {
            console.warn("Back camera blocked or missing. Activating fallback simulator engine.");
            activateFallbackEngine("back");
        }

        try {
            // FRONT CAMERA ACQUISITION
            AppState.streams.front = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            if (DOM.videoFront) DOM.videoFront.srcObject = AppState.streams.front;
        } catch (err) {
            console.warn("Front camera blocked or missing. Activating fallback simulator engine.");
            activateFallbackEngine("front");
        }

        updateGalleryThumbnails();
        startProcessingCanvasPipeline();
    }

    function activateFallbackEngine(type) {
        if (type === "back" && DOM.videoBack && DOM.simulatedBackCanvas) {
            DOM.videoBack.classList.add("hidden");
            DOM.simulatedBackCanvas.classList.remove("hidden");
        }
        if (type === "front" && DOM.videoFront && DOM.simulatedFrontCanvas) {
            DOM.videoFront.classList.add("hidden");
            DOM.simulatedFrontCanvas.classList.remove("hidden");
        }
    }

    // Processing Pipeline for Unified Matrix Stream Drawing
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = 720;
    compositeCanvas.height = 1280;
    const ctx = compositeCanvas.getContext("2d");

    function startProcessingCanvasPipeline() {
        let frame = 0;
        function renderLoop() {
            frame++;
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);

            // 1. Render Back Track / Background Layer
            if (AppState.streams.back && DOM.videoBack && !DOM.videoBack.classList.contains("hidden")) {
                ctx.drawImage(DOM.videoBack, 0, 0, compositeCanvas.width, compositeCanvas.height);
            } else if (DOM.simulatedBackCanvas) {
                const bCtx = DOM.simulatedBackCanvas.getContext("2d");
                DOM.simulatedBackCanvas.width = 360; DOM.simulatedBackCanvas.height = 640;
                bCtx.fillStyle = "#1e293b"; bCtx.fillRect(0, 0, 360, 640);
                bCtx.fillStyle = "#3b82f6"; bCtx.beginPath(); bCtx.arc(180, 320 + Math.sin(frame*0.05)*40, 60, 0, Math.PI*2); bCtx.fill();
                bCtx.fillStyle = "#fff"; bCtx.font = "14px Arial"; bCtx.fillText("REAR STREAM ACTIVE [MOCK]", 20, 40);
                ctx.drawImage(DOM.simulatedBackCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);
            }

            // Apply Exposure Filter
            if (AppState.exposure !== 0) {
                ctx.fillStyle = AppState.exposure > 0 ? `rgba(255,255,255,${AppState.exposure * 0.15})` : `rgba(0,0,0,${Math.abs(AppState.exposure) * 0.25})`;
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
            }

            // Apply Beauty Filter
            if (AppState.beautyFilter) {
                ctx.fillStyle = "rgba(255, 192, 203, 0.08)";
                ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
            }

            // 2. Render Front Track / PIP Layer Overlay
            const pipW = 200, pipH = 280, pipX = compositeCanvas.width - pipW - 30, pipY = 120;
            ctx.save();
            // Rounded corners clip for front camera box
            ctx.beginPath();
            ctx.roundRect(pipX, pipY, pipW, pipH, 24);
            ctx.clip();

            if (AppState.streams.front && DOM.videoFront && !DOM.videoFront.classList.contains("hidden")) {
                ctx.drawImage(DOM.videoFront, pipX, pipY, pipW, pipH);
            } else if (DOM.simulatedFrontCanvas) {
                const fCtx = DOM.simulatedFrontCanvas.getContext("2d");
                DOM.simulatedFrontCanvas.width = 150; DOM.simulatedFrontCanvas.height = 200;
                fCtx.fillStyle = "#111"; fCtx.fillRect(0, 0, 150, 200);
                fCtx.fillStyle = "#10b981"; fCtx.beginPath(); fCtx.arc(75, 100, 30 + Math.cos(frame*0.1)*5, 0, Math.PI*2); fCtx.fill();
                ctx.drawImage(DOM.simulatedFrontCanvas, pipX, pipY, pipW, pipH);
            }
            ctx.restore();

            AppState.animationId = requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }

    // 🔴 BULLETPROOF RECORDER WITH REAL CANVAS CAPTURE TRACKS
    function startCaptureSession() {
        AppState.isRecording = true;
        AppState.recordingDuration = 0;
        AppState.recordedChunks = [];

        if (DOM.recordingHUD) DOM.recordingHUD.classList.remove("opacity-0");
        if (DOM.recordTriggerState) DOM.recordTriggerState.className = "w-5 h-5 rounded-md bg-red-600 scale-90 transition-all";

        if (AppState.flashMode === "on" && DOM.flashOverlay) {
            DOM.flashOverlay.style.opacity = "1";
            setTimeout(() => DOM.flashOverlay.style.opacity = "0", 150);
        }

        // Capture 30fps track from the active composite drawing engine canvas
        const stream = compositeCanvas.captureStream(30);
        
        // Include mic track if active
        if (AppState.streams.back && AppState.streams.back.getAudioTracks().length > 0) {
            stream.addTrack(AppState.streams.back.getAudioTracks()[0]);
        }

        AppState.mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
        AppState.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) AppState.recordedChunks.push(e.data); };
        
        AppState.mediaRecorder.onstop = () => {
            const blob = new Blob(AppState.recordedChunks, { type: "video/webm" });
            const videoUrl = URL.createObjectURL(blob);
            
            // Auto Trigger Real Download
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = `DualCamPro_Capture_${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            AppState.gallery.unshift({ id: Date.now(), url: videoUrl, date: new Date().toLocaleDateString() });
            localStorage.setItem("dualcam_gallery", JSON.stringify(AppState.gallery));
            updateGalleryThumbnails();
        };

        AppState.mediaRecorder.start();

        AppState.timerInterval = setInterval(() => {
            AppState.recordingDuration++;
            const m = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
            const s = String(AppState.recordingDuration % 60).padStart(2, '0');
            if (DOM.txtTimer) DOM.txtTimer.innerText = `${m}:${s}`;
            if (DOM.recordingProgressRing) DOM.recordingProgressRing.style.strokeDashoffset = 264 - ((AppState.recordingDuration % 60) / 60 * 264);
        }, 1000);
    }

    function stopCaptureSession() {
        AppState.isRecording = false;
        clearInterval(AppState.timerInterval);
        if (DOM.recordingHUD) DOM.recordingHUD.classList.add("opacity-0");
        if (DOM.recordTriggerState) DOM.recordTriggerState.className = "w-6 h-6 rounded-full bg-red-600 transition-all";
        if (DOM.recordingProgressRing) DOM.recordingProgressRing.style.strokeDashoffset = "264";

        if (AppState.mediaRecorder) AppState.mediaRecorder.stop();
    }

    if (DOM.btnRecord) {
        DOM.btnRecord.addEventListener("click", () => {
            if (!AppState.isRecording) startCaptureSession();
            else stopCaptureSession();
        });
    }

    // Toggle Action HUDs
    if (DOM.quickGrid && DOM.cameraViewport) {
        DOM.quickGrid.addEventListener("click", () => {
            AppState.gridActive = !AppState.gridActive;
            DOM.cameraViewport.classList.toggle("grid-hidden", !AppState.gridActive);
            DOM.gridIcon?.classList.toggle("text-blue-500", AppState.gridActive);
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
        });
    }

    // Toggle Filters inside Bottom Sheet
    if (DOM.toggleBeauty) DOM.toggleBeauty.addEventListener("change", (e) => AppState.beautyFilter = e.target.checked);
    if (DOM.toggleStabilization) DOM.toggleStabilization.addEventListener("change", (e) => AppState.stabilization = e.target.checked);

    // Front Camera Dragging Logic (Touch-friendly)
    let isDragging = false, startX, startY, initL, initT;
    if (DOM.frontCamContainer) {
        DOM.frontCamContainer.addEventListener("pointerdown", (e) => {
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            initL = DOM.frontCamContainer.offsetLeft;
            initT = DOM.frontCamContainer.offsetTop;
            DOM.frontCamContainer.setPointerCapture(e.pointerId);
        });
        DOM.frontCamContainer.addEventListener("pointermove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            DOM.frontCamContainer.style.left = `${initL + dx}px`;
            DOM.frontCamContainer.style.top = `${initT + dy}px`;
        });
        DOM.frontCamContainer.addEventListener("pointerup", (e) => {
            isDragging = false;
            DOM.frontCamContainer.releasePointerCapture(e.pointerId);
        });
    }

    // Settings & Gallery Drawers
    if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener("click", () => DOM.settingsBottomSheet?.classList.remove("translate-y-full"));
    if (DOM.btnCloseSettingsHandle) DOM.btnCloseSettingsHandle.addEventListener("click", () => DOM.settingsBottomSheet?.classList.add("translate-y-full"));
    if (DOM.btnOpenGallery) DOM.btnOpenGallery.addEventListener("click", () => { renderGallery(); DOM.galleryModal?.classList.remove("translate-y-full"); });
    if (DOM.btnCloseGallery) DOM.btnCloseGallery.addEventListener("click", () => DOM.galleryModal?.classList.add("translate-y-full"));

    function updateGalleryThumbnails() {
        if (!DOM.galleryThumb) return;
        if (AppState.gallery.length > 0) DOM.galleryThumb.innerHTML = `<span class="material-icons-round text-blue-500">play_circle</span>`;
    }

    function renderGallery() {
        if (!DOM.galleryGrid) return;
        DOM.galleryGrid.innerHTML = "";
        if (AppState.gallery.length === 0) {
            DOM.galleryEmptyState?.classList.remove("hidden");
            return;
        }
        DOM.galleryEmptyState?.classList.add("hidden");
        AppState.gallery.forEach(item => {
            const div = document.createElement("div");
            div.className = "bg-stone-900 p-3 rounded-2xl flex flex-col gap-2 border border-stone-800";
            div.innerHTML = `
                <video src="${item.url}" class="w-full aspect-video object-cover rounded-xl" controls></video>
                <span class="text-[10px] font-mono text-stone-400 text-center">${item.date}</span>
            `;
            DOM.galleryGrid.appendChild(div);
        });
    }
});

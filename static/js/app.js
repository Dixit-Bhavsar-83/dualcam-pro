document.addEventListener("DOMContentLoaded", () => {
    // Application System State Context Structure
    const AppState = {
        isRecording: false,
        isPaused: false,
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

    // Global DOM Registration Node Element Handles
    const DOM = {
        splashScreen: document.getElementById("splashScreen"),
        permissionScreen: document.getElementById("permissionScreen"),
        btnGrantPermission: document.getElementById("btnGrantPermission"),
        videoBack: document.getElementById("videoBack"),
        videoFront: document.getElementById("videoFront"),
        simulatedBackCanvas: document.getElementById("simulatedBackCanvas"),
        simulatedFrontCanvas: document.getElementById("simulatedFrontCanvas"),
        cameraViewport: document.getElementById("cameraViewport"),
        frontCamContainer: document.getElementById("frontCamContainer"),
        btnRecord: document.getElementById("btnRecord"),
        recordTriggerState: document.getElementById("recordTriggerState"),
        recordingHUD: document.getElementById("recordingHUD"),
        txtTimer: document.getElementById("txtTimer"),
        recordingProgressRing: document.getElementById("recordingProgressRing"),
        flashOverlay: document.getElementById("flashOverlay"),
        focusRing: document.getElementById("focusRing"),
        exposureSlider: document.getElementById("exposureSlider"),
        btnOpenSettings: document.getElementById("btnOpenSettings"),
        settingsBottomSheet: document.getElementById("settingsBottomSheet"),
        btnCloseSettingsHandle: document.getElementById("btnCloseSettingsHandle"),
        btnOpenGallery: document.getElementById("btnOpenGallery"),
        btnCloseGallery: document.getElementById("btnCloseGallery"),
        galleryModal: document.getElementById("galleryModal"),
        galleryGrid: document.getElementById("galleryGrid"),
        galleryEmptyState: document.getElementById("galleryEmptyState"),
        galleryThumb: document.getElementById("galleryThumb"),
        btnSwapLayout: document.getElementById("btnSwapLayout"),
        quickFlash: document.getElementById("quickFlash"),
        flashIcon: document.getElementById("flashIcon"),
        quickGrid: document.getElementById("quickGrid"),
        gridIcon: document.getElementById("gridIcon"),
        toggleStabilization: document.getElementById("toggleStabilization"),
        toggleBeauty: document.getElementById("toggleBeauty"),
        hudResolution: document.getElementById("hudResolution"),
        hudFPS: document.getElementById("hudFPS"),
        hudStabilization: document.getElementById("hudStabilization")
    };

    // Initial Execution Context Setup Sequence
    setTimeout(() => {
        DOM.splashScreen.classList.add("opacity-0", "pointer-events-none");
        initializeSystemHardwareRouting();
    }, 2000);

    // Synchronize clock readout metrics
    setInterval(() => {
        const d = new Date();
        document.getElementById("statusBarTime").innerText = d.toTimeString().substring(0, 5);
    }, 1000);

    // Core Stream Resolution Map Config Options Matrix
    const constraintsMatrix = {
        "720p": { width: 1280, height: 720 },
        "1080p": { width: 1920, height: 1080 },
        "4k": { width: 3840, height: 2160 }
    };

    async function initializeSystemHardwareRouting() {
        DOM.permissionScreen.classList.remove("hidden");
    }

    DOM.btnGrantPermission.addEventListener("click", async () => {
        DOM.permissionScreen.classList.add("hidden");
        await startupCameraSubsystems();
    });

    async function startupCameraSubsystems() {
        const resolution = constraintsMatrix[AppState.activeResolution];
        
        try {
            // Primary Attempt Block: Query native environment hardware for capture devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");

            if (videoDevices.length >= 2) {
                // Dual Hardware Sensors Found: Attempt to resolve streams simultaneously
                AppState.streams.back = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: videoDevices[0].deviceId, width: resolution.width, height: resolution.height },
                    audio: true
                });
                AppState.streams.front = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: videoDevices[1].deviceId, width: 640, height: 480 },
                    audio: false
                });
                
                DOM.videoBack.srcObject = AppState.streams.back;
                DOM.videoFront.srcObject = AppState.streams.front;
                AppState.simulatedEngine.active = false;
            } else {
                // Fallback Mode Trigger: Insufficient unique input streams found
                throw new Error("Single device environment identified. Transitioning to processing rendering fallback frame wrapper pipeline.");
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
        DOM.videoBack.classList.add("hidden");
        DOM.videoFront.classList.add("hidden");
        DOM.simulatedBackCanvas.classList.remove("hidden");
        DOM.simulatedFrontCanvas.classList.remove("hidden");

        const ctxBack = DOM.simulatedBackCanvas.getContext("2d");
        const ctxFront = DOM.simulatedFrontCanvas.getContext("2d");

        DOM.simulatedBackCanvas.width = 412;
        DOM.simulatedBackCanvas.height = 732;
        DOM.simulatedFrontCanvas.width = 150;
        DOM.simulatedFrontCanvas.height = 200;

        let frameCounter = 0;

        function renderSimulatedLoop() {
            if (!AppState.simulatedEngine.active) return;
            frameCounter++;

            // Draw a high-fidelity synthetic feed onto the canvas
            ctxBack.fillStyle = "#0c0a09";
            ctxBack.fillRect(0, 0, DOM.simulatedBackCanvas.width, DOM.simulatedBackCanvas.height);
            
            // Draw an abstract composition simulating dynamic camera motion
            ctxBack.save();
            ctxBack.translate(DOM.simulatedBackCanvas.width/2, DOM.simulatedBackCanvas.height/2);
            ctxBack.rotate((frameCounter * 0.2) * Math.PI / 180);
            const gradient = ctxBack.createLinearGradient(-150, -150, 150, 150);
            gradient.addColorStop(0, '#1e3a8a');
            gradient.addColorStop(0.5, '#020617');
            gradient.addColorStop(1, '#172554');
            ctxBack.fillStyle = gradient;
            ctxBack.beginPath();
            ctxBack.arc(0, 0, 180 + Math.sin(frameCounter * 0.05) * 10, 0, Math.PI * 2);
            ctxBack.fill();
            ctxBack.restore();

            // Render telemetry overlay matrix text onto raw track
            ctxBack.fillStyle = "rgba(255,255,255,0.15)";
            ctxBack.font = "11px JetBrains Mono";
            ctxBack.fillText(`MATRIX PRIMARY REAR STREAM // ISO:${100 + Math.floor(Math.sin(frameCounter*0.01)*20)}`, 20, 40);
            ctxBack.fillText(`EXPOSURE COMPENSATION: ${AppState.exposure.toFixed(1)} EV`, 20, 60);
            if(AppState.beautyFilter) ctxBack.fillText("AI ENGINE BEAUTY FILTERS RUNNING", 20, 80);

            // Draw the front-facing vlogger camera simulation track
            ctxFront.fillStyle = "#1c1917";
            ctxFront.fillRect(0, 0, DOM.simulatedFrontCanvas.width, DOM.simulatedFrontCanvas.height);
            
            ctxFront.fillStyle = "#3b82f6";
            ctxFront.beginPath();
            ctxFront.arc(DOM.simulatedFrontCanvas.width/2, DOM.simulatedFrontCanvas.height/2 + Math.sin(frameCounter*0.08)*5, 30, 0, Math.PI * 2);
            ctxFront.fill();

            ctxFront.fillStyle = "rgba(255,255,255,0.4)";
            ctxFront.font = "9px JetBrains Mono";
            ctxFront.fillText("FRONT_SIM_CAM", 10, 20);

            AppState.simulatedEngine.animationFrameId = requestAnimationFrame(renderSimulatedLoop);
        }
        renderSimulatedLoop();
    }

    // Capture Pipeline Trigger State Interceptor
    DOM.btnRecord.addEventListener("click", () => {
        if (!AppState.isRecording) {
            startCaptureSession();
        } else {
            stopCaptureSession();
        }
    });

    function startCaptureSession() {
        AppState.isRecording = true;
        AppState.recordingDuration = 0;
        DOM.recordingHUD.classList.remove("opacity-0");
        DOM.recordTriggerState.classList.replace("rounded-full", "rounded-md");
        DOM.recordTriggerState.classList.add("scale-75");
        
        // Execute Flash UI notification trigger sequence context
        if (AppState.flashMode === "on") {
            DOM.flashOverlay.classList.replace("opacity-0", "opacity-100");
            setTimeout(() => DOM.flashOverlay.classList.replace("opacity-100", "opacity-0"), 150);
        }

        AppState.timerInterval = setInterval(() => {
            AppState.recordingDuration++;
            const mins = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
            const secs = String(AppState.recordingDuration % 60).padStart(2, '0');
            DOM.txtTimer.innerText = `${mins}:${secs}`;

            // Process tracking circle indicator ring values
            const progress = (AppState.recordingDuration % 60) / 60;
            const offset = 264 - (progress * 264);
            DOM.recordingProgressRing.style.strokeDashoffset = offset;
        }, 1000);

        // Core Media Recording Logic Hook Setup Block
        if (!AppState.simulatedEngine.active) {
            try {
                AppState.chunks.back = [];
                AppState.recorders.back = new MediaRecorder(AppState.streams.back, { mimeType: 'video/webm;codecs=vp8,opus' });
                AppState.recorders.back.ondataavailable = e => { if(e.data.size > 0) AppState.chunks.back.push(e.data); };
                AppState.recorders.back.onstop = () => packageAssetTrack("Back");
                AppState.recorders.back.start();

                AppState.chunks.front = [];
                AppState.recorders.front = new MediaRecorder(AppState.streams.front, { mimeType: 'video/webm;codecs=vp8' });
                AppState.recorders.front.ondataavailable = e => { if(e.data.size > 0) AppState.chunks.front.push(e.data); };
                AppState.recorders.front.onstop = () => packageAssetTrack("Front");
                AppState.recorders.front.start();
            } catch(e) { console.error("Error starting hardware capture pipes directly:", e); }
        }
    }

    function stopCaptureSession() {
        AppState.isRecording = false;
        clearInterval(AppState.timerInterval);
        DOM.recordingHUD.classList.add("opacity-0");
        DOM.recordTriggerState.classList.replace("rounded-md", "rounded-full");
        DOM.recordTriggerState.classList.remove("scale-75");
        DOM.recordingProgressRing.style.strokeDashoffset = "264";

        if (!AppState.simulatedEngine.active) {
            if(AppState.recorders.back && AppState.recorders.back.state !== "inactive") AppState.recorders.back.stop();
            if(AppState.recorders.front && AppState.recorders.front.state !== "inactive") AppState.recorders.front.stop();
        } else {
            // Generate simulated assets directly if running in emulation layout configuration modes
            packageSimulatedAssetTrack("Back");
            packageSimulatedAssetTrack("Front");
        }
    }

    function packageAssetTrack(prefix) {
        const blob = new Blob(AppState.chunks[prefix.toLowerCase()], { type: 'video/mp4' });
        triggerTrackDownload(blob, prefix);
    }

    function packageSimulatedAssetTrack(prefix) {
        // Build mock structural entity matching pipeline output payloads
        const mockBlob = new Blob([`Simulated spatial asset track content stream for ${prefix}`], { type: 'video/mp4' });
        triggerTrackDownload(mockBlob, prefix);
    }

    function triggerTrackDownload(blob, prefix) {
        const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
        const filename = `${prefix}_${timestamp}.mp4`;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Track internal historical reference mapping records
        const newRecord = {
            id: Date.now() + Math.random(),
            filename: filename,
            date: new Date().toLocaleDateString(),
            duration: DOM.txtTimer.innerText,
            prefix: prefix,
            mockUrl: url
        };
        AppState.gallery.unshift(newRecord);
        localStorage.setItem("dualcam_gallery", JSON.stringify(AppState.gallery));
        updateGalleryThumbnails();
    }

    // Dynamic UI Interface Layer Component Management Interactions
    function createCameraGridOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "gridOverlay";
        overlay.className = "camera-grid-overlay";
        DOM.cameraViewport.appendChild(overlay);
    }

    DOM.quickGrid.addEventListener("click", () => {
        AppState.gridActive = !AppState.gridActive;
        const overlay = document.getElementById("gridOverlay");
        if(AppState.gridActive) {
            overlay.classList.add("active");
            DOM.gridIcon.classList.add("text-blue-500");
        } else {
            overlay.classList.remove("active");
            DOM.gridIcon.classList.remove("text-blue-500");
        }
    });

    DOM.quickFlash.addEventListener("click", () => {
        if(AppState.flashMode === "off") {
            AppState.flashMode = "on";
            DOM.flashIcon.innerText = "flash_on";
            DOM.flashIcon.classList.add("text-yellow-400");
        } else {
            AppState.flashMode = "off";
            DOM.flashIcon.innerText = "flash_off";
            DOM.flashIcon.classList.remove("text-yellow-400");
        }
    });

    // Exposure Slider Processing Logic Listener Node
    DOM.exposureSlider.addEventListener("input", (e) => {
        AppState.exposure = parseFloat(e.target.value);
        // Apply exposure filter rendering adjustments safely down onto the targets
        const brightnessFactor = 1 + (AppState.exposure * 0.25);
        DOM.videoBack.style.filter = `brightness(${brightnessFactor})`;
        DOM.simulatedBackCanvas.style.filter = `brightness(${brightnessFactor})`;
    });

    // Handle interactive view swapping via double-tap
    let lastTap = 0;
    DOM.frontCamContainer.addEventListener("pointerdown", (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            // Double Tap Detected: Swap spatial window layout footprints
            if(DOM.frontCamContainer.classList.contains("w-32")) {
                DOM.frontCamContainer.classList.replace("w-32", "w-44");
            } else {
                DOM.frontCamContainer.classList.replace("w-44", "w-32");
            }
        }
        lastTap = now;
    });

    // Touch gesture dragging for front camera preview block overlay target matrices
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    DOM.frontCamContainer.addEventListener("pointerdown", (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = DOM.frontCamContainer.offsetLeft;
        initialTop = DOM.frontCamContainer.offsetTop;
        DOM.frontCamContainer.setPointerCapture(e.pointerId);
    });

    DOM.frontCamContainer.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Keep inside viewport bounding coordinates container parameters
        const maxLeft = DOM.cameraViewport.clientWidth - DOM.frontCamContainer.clientWidth;
        const maxTop = DOM.cameraViewport.clientHeight - DOM.frontCamContainer.clientHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        DOM.frontCamContainer.style.left = `${newLeft}px`;
        DOM.frontCamContainer.style.top = `${newTop}px`;
    });

    DOM.frontCamContainer.addEventListener("pointerup", (e) => {
        isDragging = false;
        DOM.frontCamContainer.releasePointerCapture(e.pointerId);
    });

    // Dynamic Camera Manual Context Target Focus System
    DOM.cameraViewport.addEventListener("click", (e) => {
        if(e.target.closest('#frontCamContainer') || e.target.closest('.vertical-slider')) return;
        
        const rect = DOM.cameraViewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        DOM.focusRing.style.left = `${x - 32}px`;
        DOM.focusRing.style.top = `${y - 32}px`;
        DOM.focusRing.classList.replace("opacity-0", "opacity-100");
        DOM.focusRing.classList.remove("scale-150");

        setTimeout(() => {
            DOM.focusRing.classList.replace("opacity-100", "opacity-0");
            DOM.focusRing.classList.add("scale-150");
        }, 800);
    });

    // Bottom Sheet Settings Menu Handling
    DOM.btnOpenSettings.addEventListener("click", () => {
        DOM.settingsBottomSheet.classList.remove("translate-y-full");
    });
    DOM.btnCloseSettingsHandle.addEventListener("click", () => {
        DOM.settingsBottomSheet.classList.add("translate-y-full");
    });

    // Interactive configuration control binding matrices
    document.querySelectorAll("#gridResolution button").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("#gridResolution button").forEach(b => b.className = "py-2.5 rounded-xl bg-stone-800 font-mono text-sm transition-all text-stone-300");
            e.target.className = "py-2.5 rounded-xl bg-blue-600 font-mono text-sm transition-all text-white font-bold shadow-md shadow-blue-600/20";
            AppState.activeResolution = e.target.dataset.val;
            DOM.hudResolution.innerText = AppState.activeResolution.toUpperCase();
            startupCameraSubsystems();
        });
    });

    document.querySelectorAll("#gridFPS button").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("#gridFPS button").forEach(b => b.className = "py-2.5 rounded-xl bg-stone-800 font-mono text-sm transition-all text-stone-300");
            e.target.className = "py-2.5 rounded-xl bg-blue-600 font-mono text-sm transition-all text-white font-bold shadow-md shadow-blue-600/20";
            AppState.activeFPS = parseInt(e.target.dataset.val);
            DOM.hudFPS.innerText = `${AppState.activeFPS}FPS`;
        });
    });

    DOM.toggleStabilization.addEventListener("change", (e) => {
        AppState.stabilization = e.target.checked;
        if(AppState.stabilization) {
            DOM.hudStabilization.classList.remove("hidden");
        } else {
            DOM.hudStabilization.classList.add("hidden");
        }
    });

    DOM.toggleBeauty.addEventListener("change", (e) => {
        AppState.beautyFilter = e.target.checked;
    });

    // Component Platform Gallery Manager Layout Render Core Logic System
    DOM.btnOpenGallery.addEventListener("click", () => {
        renderGalleryContents();
        DOM.galleryModal.classList.remove("translate-y-full");
    });
    DOM.btnCloseGallery.addEventListener("click", () => {
        DOM.galleryModal.classList.add("translate-y-full");
    });

    function updateGalleryThumbnails() {
        if(AppState.gallery.length > 0) {
            DOM.galleryThumb.style.backgroundImage = `url('/static/icons/video_placeholder.png')`;
            DOM.galleryThumb.innerHTML = `<span class="material-icons-round text-xs text-white bg-blue-600/80 p-0.5 rounded-full">play_arrow</span>`;
        } else {
            DOM.galleryThumb.style.backgroundImage = 'none';
            DOM.galleryThumb.innerHTML = `<span class="material-icons-round text-white/40 text-xl">photo_library</span>`;
        }
    }

    function renderGalleryContents() {
        // Clear old structural render passes
        const items = DOM.galleryGrid.querySelectorAll(".gallery-item");
        items.forEach(el => el.remove());

        if (AppState.gallery.length === 0) {
            DOM.galleryEmptyState.classList.remove("hidden");
            return;
        }
        DOM.galleryEmptyState.classList.add("hidden");

        AppState.gallery.forEach(item => {
            const node = document.createElement("div");
            node.className = "gallery-item bg-stone-900 rounded-2xl border border-stone-800 p-3 flex flex-col gap-2";
            node.innerHTML = `
                <div class="aspect-video bg-stone-950 rounded-xl flex flex-col items-center justify-center relative border border-stone-800">
                    <span class="material-icons-round text-2xl text-blue-500">movie</span>
                    <span class="absolute bottom-1 right-1 font-mono text-[9px] bg-black/60 px-1 rounded">${item.duration}</span>
                    <span class="absolute top-1 left-1 font-mono text-[8px] bg-blue-900/80 px-1 rounded tracking-wide uppercase">${item.prefix}</span>
                </div>
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-mono font-medium truncate text-stone-200">${item.filename}</span>
                    <span class="text-[10px] font-mono text-stone-500">${item.date}</span>
                </div>
                <div class="grid grid-cols-2 gap-1 mt-1">
                    <button class="btn-download py-1 bg-stone-800 hover:bg-stone-700 active:scale-95 text-[10px] font-mono rounded-lg flex items-center justify-center gap-0.5 transition-all" data-id="${item.id}">
                        <span class="material-icons-round text-xs">download</span> PULL
                    </button>
                    <button class="btn-delete py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 active:scale-95 text-[10px] font-mono rounded-lg flex items-center justify-center gap-0.5 transition-all" data-id="${item.id}">
                        <span class="material-icons-round text-xs">delete</span> PURGE
                    </button>
                </div>
            `;

            // Bind contextual lifecycle asset nodes
            node.querySelector(".btn-download").addEventListener("click", () => {
                const a = document.createElement('a');
                a.href = item.mockUrl;
                a.download = item.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            node.querySelector(".btn-delete").addEventListener("click", () => {
                AppState.gallery = AppState.gallery.filter(g => g.id !== item.id);
                localStorage.setItem("dualcam_gallery", JSON.stringify(AppState.gallery));
                renderGalleryContents();
                updateGalleryThumbnails();
            });

            DOM.galleryGrid.appendChild(node);
        });
    }

    // Comprehensive Native Global Keyboard Shortcut Interceptor Mapping
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            DOM.btnRecord.click();
        } else if (e.code === "Escape") {
            if(AppState.isRecording) stopCaptureSession();
            DOM.settingsBottomSheet.classList.add("translate-y-full");
            DOM.galleryModal.classList.add("translate-y-full");
        } else if (e.code === "KeyR") {
            startupCameraSubsystems();
        }
    });
});
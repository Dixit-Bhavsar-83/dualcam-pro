document.addEventListener("DOMContentLoaded", () => {
    const AppState = {
        isRecording: false,
        recordingDuration: 0,
        timerInterval: null,
        flashMode: "off",
        gridActive: false,
        exposure: 0,
        streams: { front: null, back: null },
        mediaRecorder: null,
        recordedChunks: [],
        gallery: JSON.parse(localStorage.getItem("dualcam_gallery") || "[]")
    };

    const safeGet = (id) => document.getElementById(id);
    const DOM = {
        splashScreen: safeGet("splashScreen"),
        permissionScreen: safeGet("permissionScreen"),
        btnGrantPermission: safeGet("btnGrantPermission"),
        videoBack: safeGet("videoBack"),
        videoFront: safeGet("videoFront"),
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
        gridIcon: safeGet("gridIcon")
    };

    // Splash Screen Logic
    if (DOM.splashScreen) {
        setTimeout(() => {
            DOM.splashScreen.style.opacity = "0";
            setTimeout(() => {
                DOM.splashScreen.style.display = "none";
                if (DOM.permissionScreen) {
                    DOM.permissionScreen.classList.remove("hidden");
                }
            }, 500);
        }, 1200);
    }

    // Permission Handler
    if (DOM.btnGrantPermission) {
        DOM.btnGrantPermission.addEventListener("click", async () => {
            if (DOM.permissionScreen) DOM.permissionScreen.classList.add("hidden");
            await startupCamera();
        });
    }

    // Hardware Cameras Configuration
    async function startupCamera() {
        try {
            AppState.streams.back = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
        } catch (err) {
            console.warn("Back camera hardware routing failed or blocked.");
        }

        try {
            AppState.streams.front = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            if (DOM.videoFront) DOM.videoFront.srcObject = AppState.streams.front;
        } catch (err) {
            console.warn("Front camera hardware routing failed or blocked.");
        }
        updateGalleryThumbnails();
    }

    // Video Recording Implementation (Red Button Controls)
    if (DOM.btnRecord) {
        DOM.btnRecord.addEventListener("click", () => {
            if (!AppState.isRecording) {
                // Start Recording Setup
                AppState.isRecording = true;
                AppState.recordingDuration = 0;
                AppState.recordedChunks = [];

                if (DOM.recordingHUD) DOM.recordingHUD.classList.remove("opacity-0");
                
                // Animate Red Button (Circle to Square)
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "4px";
                    DOM.recordTriggerState.style.transform = "scale(0.8)";
                }

                // Trigger Flash Overlay if ON
                if (AppState.flashMode === "on" && DOM.flashOverlay) {
                    DOM.flashOverlay.style.opacity = "1";
                    setTimeout(() => DOM.flashOverlay.style.opacity = "0", 150);
                }

                // Native stream integration
                let combinedStream = new MediaStream();
                if (AppState.streams.back) {
                    AppState.streams.back.getTracks().forEach(track => combinedStream.addTrack(track));
                }

                try {
                    AppState.mediaRecorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });
                    AppState.mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) AppState.recordedChunks.push(e.data);
                    };
                    AppState.mediaRecorder.onstop = () => {
                        const blob = new Blob(AppState.recordedChunks, { type: "video/webm" });
                        const url = URL.createObjectURL(blob);
                        
                        // Local System Auto-Download Trigger
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "DualCam_" + Date.now() + ".webm";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        AppState.gallery.unshift({ id: Date.now(), url: url, date: new Date().toLocaleDateString() });
                        localStorage.setItem("dualcam_gallery", JSON.stringify(AppState.gallery));
                        updateGalleryThumbnails();
                    };
                    AppState.mediaRecorder.start();
                } catch (e) {
                    console.error("MediaRecorder setup failed:", e);
                }

                // HUD Timer Loop
                AppState.timerInterval = setInterval(() => {
                    AppState.recordingDuration++;
                    let m = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
                    let s = String(AppState.recordingDuration % 60).padStart(2, '0');
                    if (DOM.txtTimer) DOM.txtTimer.innerText = m + ":" + s;
                    if (DOM.recordingProgressRing) {
                        DOM.recordingProgressRing.style.strokeDashoffset = String(264 - ((AppState.recordingDuration % 60) / 60 * 264));
                    }
                }, 1000);

            } else {
                // Stop Recording Setup
                AppState.isRecording = false;
                clearInterval(AppState.timerInterval);
                if (DOM.recordingHUD) DOM.recordingHUD.classList.add("opacity-0");
                
                // Reset Button Shape (Square to Circle)
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "50%";
                    DOM.recordTriggerState.style.transform = "scale(1)";
                }
                if (DOM.recordingProgressRing) DOM.recordingProgressRing.style.strokeDashoffset = "264";

                if (AppState.mediaRecorder && AppState.mediaRecorder.state !== "inactive") {
                    AppState.mediaRecorder.stop();
                }
            }
        });
    }

    // Grid System Controls
    if (DOM.quickGrid && DOM.cameraViewport) {
        DOM.quickGrid.addEventListener("click", () => {
            AppState.gridActive = !AppState.gridActive;
            DOM.cameraViewport.classList.toggle("grid-hidden", !AppState.gridActive);
            if (DOM.gridIcon) DOM.gridIcon.classList.toggle("text-blue-500", AppState.gridActive);
        });
    }

    // Flash/Torch Controls
    if (DOM.quickFlash) {
        DOM.quickFlash.addEventListener("click", () => {
            AppState.flashMode = AppState.flashMode === "off" ? "on" : "off";
            if (DOM.flashIcon) {
                DOM.flashIcon.innerText = AppState.flashMode === "on" ? "flash_on" : "flash_off";
                DOM.flashIcon.classList.toggle("text-yellow-400", AppState.flashMode === "on");
            }
        });
    }

    // Exposure Slider Matrix
    if (DOM.exposureSlider) {
        DOM.exposureSlider.addEventListener("input", (e) => {
            AppState.exposure = parseFloat(e.target.value);
            let filterValue = "brightness(" + (1 + AppState.exposure * 0.25) + ")";
            if (DOM.videoBack) DOM.videoBack.style.filter = filterValue;
        });
    }

    // Touch Dragging Setup for PIP Front Cam Window
    let isDragging = false, startX = 0, startY = 0, initL = 0, initT = 0;
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
            let dx = e.clientX - startX, dy = e.clientY - startY;
            DOM.frontCamContainer.style.left = (initL + dx) + "px";
            DOM.frontCamContainer.style.top = (initT + dy) + "px";
        });
        DOM.frontCamContainer.addEventListener("pointerup", (e) => {
            isDragging = false;
            DOM.frontCamContainer.releasePointerCapture(e.pointerId);
        });
    }

    // Panels/Drawers Toggles
    if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener("click", () => DOM.settingsBottomSheet?.classList.remove("translate-y-full"));
    if (DOM.btnCloseSettingsHandle) DOM.btnCloseSettingsHandle.addEventListener("click", () => DOM.settingsBottomSheet?.classList.add("translate-y-full"));
    if (DOM.btnOpenGallery) DOM.btnOpenGallery.addEventListener("click", () => { renderGallery(); DOM.galleryModal?.classList.remove("translate-y-full"); });
    if (DOM.btnCloseGallery) DOM.btnCloseGallery.addEventListener("click", () => DOM.galleryModal?.classList.add("translate-y-full"));

    function updateGalleryThumbnails() {
        if (!DOM.galleryThumb) return;
        if (AppState.gallery.length > 0) DOM.galleryThumb.innerHTML = '<span class="material-icons-round text-blue-500">play_circle</span>';
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
            div.innerHTML = '<video src="' + item.url + '" class="w-full aspect-video object-cover rounded-xl" controls></video><span class="text-[10px] font-mono text-stone-400 text-center">' + item.date + '</span>';
            DOM.galleryGrid.appendChild(div);
        });
    }
});

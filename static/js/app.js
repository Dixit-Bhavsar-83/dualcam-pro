document.addEventListener("DOMContentLoaded", () => {
    const AppState = {
        isRecording: false,
        recordingDuration: 0,
        timerInterval: null,
        flashMode: "off",
        exposure: 0,
        streams: { front: null, back: null },
        mediaRecorder: null,
        recordedChunks: [],
        gallery: []
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
        exposureSlider: safeGet("exposureSlider"),
        btnOpenSettings: safeGet("btnOpenSettings"),
        settingsBottomSheet: safeGet("settingsBottomSheet"),
        btnCloseSettingsHandle: safeGet("btnCloseSettingsHandle"),
        btnBackSettings: safeGet("btnBackSettings"),
        btnOpenGallery: safeGet("btnOpenGallery"),
        btnCloseGallery: safeGet("btnCloseGallery"),
        galleryModal: safeGet("galleryModal"),
        galleryGrid: safeGet("galleryGrid"),
        galleryEmptyState: safeGet("galleryEmptyState"),
        galleryThumb: safeGet("galleryThumb"),
        quickFlash: safeGet("quickFlash"),
        flashIcon: safeGet("flashIcon")
    };

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
            await initializeAllHardwareSensors();
        });
    }

    async function initializeAllHardwareSensors() {
        // Enumerate and find video inputs specifically for mobile constraints
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");
            
            let backId = null;
            let frontId = null;

            videoDevices.forEach(device => {
                let label = device.label.toLowerCase();
                if (label.includes("back") || label.includes("environment") || label.includes("rear")) {
                    backId = device.deviceId;
                } else if (label.includes("front") || label.includes("user") || label.includes("facing")) {
                    frontId = device.deviceId;
                }
            });

            // Back Sensor Configuration Array Route
            const backConstraints = backId ? { video: { deviceId: { exact: backId } }, audio: true } : { video: { facingMode: "environment" }, audio: true };
            try {
                AppState.streams.back = await navigator.mediaDevices.getUserMedia(backConstraints);
                if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
            } catch (e) {
                console.warn("Primary back lens array acquisition failure. Forcing auto environment tracking.");
                AppState.streams.back = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
                if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
            }

            // Front Sensor Configuration Array Route
            const frontConstraints = frontId ? { video: { deviceId: { exact: frontId } } } : { video: { facingMode: "user" } };
            try {
                AppState.streams.front = await navigator.mediaDevices.getUserMedia(frontConstraints);
                if (DOM.videoFront) DOM.videoFront.srcObject = AppState.streams.front;
            } catch (e) {
                AppState.streams.front = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (DOM.videoFront) DOM.videoFront.srcObject = AppState.streams.front;
            }

        } catch (globalErr) {
            console.error("Camera pipeline structural error:", globalErr);
        }
    }

    // Native Torch Toggle Configuration
    if (DOM.quickFlash) {
        DOM.quickFlash.addEventListener("click", async () => {
            AppState.flashMode = AppState.flashMode === "off" ? "on" : "off";
            if (DOM.flashIcon) {
                DOM.flashIcon.innerText = AppState.flashMode === "on" ? "flash_on" : "flash_off";
                DOM.flashIcon.classList.toggle("text-yellow-400", AppState.flashMode === "on");
            }
            if (AppState.streams.back) {
                const videoTrack = AppState.streams.back.getVideoTracks()[0];
                if (videoTrack && typeof videoTrack.getCapabilities === "function") {
                    const capabilities = videoTrack.getCapabilities();
                    if (capabilities.torch) {
                        try {
                            await videoTrack.applyConstraints({ advanced: [{ torch: AppState.flashMode === "on" }] });
                        } catch (torchErr) {
                            console.warn("Torch constraints activation blocked by host browser layer.");
                        }
                    }
                }
            }
        });
    }

    // Unified Media Stream Composite Recording & Safe Downloader
    if (DOM.btnRecord) {
        DOM.btnRecord.addEventListener("click", () => {
            if (!AppState.isRecording) {
                AppState.isRecording = true;
                AppState.recordingDuration = 0;
                AppState.recordedChunks = [];

                if (DOM.recordingHUD) DOM.recordingHUD.classList.remove("opacity-0");
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "4px";
                    DOM.recordTriggerState.style.transform = "scale(0.8)";
                }

                let syncStream = new MediaStream();
                if (AppState.streams.back) {
                    AppState.streams.back.getTracks().forEach(t => syncStream.addTrack(t));
                }
                if (AppState.streams.front) {
                    AppState.streams.front.getVideoTracks().forEach(t => syncStream.addTrack(t));
                }

                try {
                    AppState.mediaRecorder = new MediaRecorder(syncStream);
                    AppState.mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) AppState.recordedChunks.push(e.data);
                    };
                    AppState.mediaRecorder.onstop = () => {
                        const fileBlob = new Blob(AppState.recordedChunks, { type: "video/webm" });
                        const storageUrl = URL.createObjectURL(fileBlob);
                        
                        const downloaderHook = document.createElement("a");
                        downloaderHook.href = storageUrl;
                        downloaderHook.download = "DualCamCapture_" + Date.now() + ".webm";
                        document.body.appendChild(downloaderHook);
                        downloaderHook.click();
                        document.body.removeChild(downloaderHook);

                        AppState.gallery.unshift({ id: Date.now(), url: storageUrl, date: new Date().toLocaleDateString() });
                        if (DOM.galleryThumb) DOM.galleryThumb.classList.add("text-blue-500");
                    };
                    AppState.mediaRecorder.start();
                } catch (recErr) {
                    console.error("Recording engine initialization halted:", recErr);
                }

                AppState.timerInterval = setInterval(() => {
                    AppState.recordingDuration++;
                    let m = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
                    let s = String(AppState.recordingDuration % 60).padStart(2, '0');
                    if (DOM.txtTimer) DOM.txtTimer.innerText = m + ":" + s;
                }, 1000);

            } else {
                AppState.isRecording = false;
                clearInterval(AppState.timerInterval);
                if (DOM.recordingHUD) DOM.recordingHUD.classList.add("opacity-0");
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "50%";
                    DOM.recordTriggerState.style.transform = "scale(1)";
                }

                if (AppState.mediaRecorder && AppState.mediaRecorder.state !== "inactive") {
                    AppState.mediaRecorder.stop();
                }
            }
        });
    }

    if (DOM.exposureSlider) {
        DOM.exposureSlider.addEventListener("input", (e) => {
            AppState.exposure = parseFloat(e.target.value);
            if (DOM.videoBack) DOM.videoBack.style.filter = "brightness(" + (1 + AppState.exposure * 0.2) + ")";
        });
    }

    // Fixed Bottom Drawer Engine Opening & Back Routine Closures
    const hideSettings = () => DOM.settingsBottomSheet?.classList.add("translate-y-full");
    if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener("click", () => DOM.settingsBottomSheet?.classList.remove("translate-y-full"));
    if (DOM.btnCloseSettingsHandle) DOM.btnCloseSettingsHandle.addEventListener("click", hideSettings);
    if (DOM.btnBackSettings) DOM.btnBackSettings.addEventListener("click", hideSettings);

    if (DOM.btnOpenGallery) DOM.btnOpenGallery.addEventListener("click", () => DOM.galleryModal?.classList.remove("translate-y-full"));
    if (DOM.btnCloseGallery) DOM.btnCloseGallery.addEventListener("click", () => DOM.galleryModal?.classList.add("translate-y-full"));
});

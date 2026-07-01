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
        frontFallbackText: safeGet("frontFallbackText"),
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
            await pipelineBootstrap();
        });
    }

    // High-level safe async device router to load both cameras consecutively without thread collisions
    async function pipelineBootstrap() {
        if (DOM.frontFallbackText) DOM.frontFallbackText.classList.remove("hidden");
        
        try {
            // STEP 1: Fetch and activate Primary Back Camera in Wide-angle or Environment mode
            const backConstraints = {
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            };
            AppState.streams.back = await navigator.mediaDevices.getUserMedia(backConstraints);
            if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
        } catch (backErr) {
            console.warn("Standard environmental constraint rejected. Using fallback channel.");
            try {
                AppState.streams.back = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (DOM.videoBack) DOM.videoBack.srcObject = AppState.streams.back;
            } catch (err) {
                console.error("Critical Back Camera initialization halted:", err);
            }
        }

        // Delay pipeline thread matching to prevent hardware engine crash on mobile devices
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            // STEP 2: Fetch and activate Front Selfie Camera in User mode
            const frontConstraints = {
                video: {
                    facingMode: { exact: "user" },
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            };
            AppState.streams.front = await navigator.mediaDevices.getUserMedia(frontConstraints);
            if (DOM.videoFront) {
                DOM.videoFront.srcObject = AppState.streams.front;
                if (DOM.frontFallbackText) DOM.frontFallbackText.classList.add("hidden");
            }
        } catch (frontErr) {
            console.warn("Exact facingMode user track failed. Requesting standard auxiliary index.");
            try {
                // Secondary check using device index matching mapping if exact user string blocks
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                const secondaryVideoInput = deviceList.find(d => d.kind === "videoinput" && !d.label.toLowerCase().includes("back"));
                
                if (secondaryVideoInput) {
                    AppState.streams.front = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: secondaryVideoInput.deviceId } }
                    });
                    if (DOM.videoFront) {
                        DOM.videoFront.srcObject = AppState.streams.front;
                        if (DOM.frontFallbackText) DOM.frontFallbackText.classList.add("hidden");
                    }
                }
            } catch (fallbackErr) {
                console.error("Selfie camera thread completely occupied or unavailable:", fallbackErr);
            }
        }
    }

    // Hardware Torch Relay System Control
    if (DOM.quickFlash) {
        DOM.quickFlash.addEventListener("click", async () => {
            AppState.flashMode = AppState.flashMode === "off" ? "on" : "off";
            if (DOM.flashIcon) {
                DOM.flashIcon.innerText = AppState.flashMode === "on" ? "flash_on" : "flash_off";
                DOM.flashIcon.classList.toggle("text-yellow-400", AppState.flashMode === "on");
            }
            if (AppState.streams.back) {
                const activeTrack = AppState.streams.back.getVideoTracks()[0];
                if (activeTrack && typeof activeTrack.getCapabilities === "function") {
                    const capabilities = activeTrack.getCapabilities();
                    if (capabilities.torch) {
                        try {
                            await activeTrack.applyConstraints({ advanced: [{ torch: AppState.flashMode === "on" }] });
                        } catch (e) {
                            console.warn("Hardware layer rejected active runtime torch constraints modification.");
                        }
                    }
                }
            }
        });
    }

    // Media Capture Processor & Unified Auto-Download Manager
    if (DOM.btnRecord) {
        DOM.btnRecord.addEventListener("click", () => {
            if (!AppState.isRecording) {
                AppState.isRecording = true;
                AppState.recordingDuration = 0;
                AppState.recordedChunks = [];

                if (DOM.recordingHUD) DOM.recordingHUD.classList.remove("opacity-0");
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "4px";
                    DOM.recordTriggerState.style.transform = "scale(0.75)";
                    DOM.recordTriggerState.classList.add("bg-neutral-900");
                }

                let pipelineCompositeStream = new MediaStream();
                if (AppState.streams.back) {
                    AppState.streams.back.getTracks().forEach(track => pipelineCompositeStream.addTrack(track));
                }

                try {
                    // Initialize recorder target output container
                    AppState.mediaRecorder = new MediaRecorder(pipelineCompositeStream, { mimeType: "video/webm;codecs=vp8" });
                    AppState.mediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) AppState.recordedChunks.push(e.data);
                    };
                    AppState.mediaRecorder.onstop = () => {
                        const compiledBlob = new Blob(AppState.recordedChunks, { type: "video/webm" });
                        const dynamicLocalUrl = URL.createObjectURL(compiledBlob);
                        
                        // Local System Direct Storage Trigger Anchor Link
                        const hiddenAnchor = document.createElement("a");
                        hiddenAnchor.href = dynamicLocalUrl;
                        hiddenAnchor.download = "DualCamVideo_" + Date.now() + ".webm";
                        document.body.appendChild(hiddenAnchor);
                        hiddenAnchor.click();
                        document.body.removeChild(hiddenAnchor);

                        AppState.gallery.unshift({ id: Date.now(), url: dynamicLocalUrl, date: new Date().toLocaleTimeString() });
                        if (DOM.galleryThumb) DOM.galleryThumb.classList.add("text-blue-500");
                    };
                    AppState.mediaRecorder.start();
                } catch (recErr) {
                    console.error("Recording thread failed to latch track composition:", recErr);
                }

                AppState.timerInterval = setInterval(() => {
                    AppState.recordingDuration++;
                    let minutes = String(Math.floor(AppState.recordingDuration / 60)).padStart(2, '0');
                    let seconds = String(AppState.recordingDuration % 60).padStart(2, '0');
                    if (DOM.txtTimer) DOM.txtTimer.innerText = minutes + ":" + seconds;
                }, 1000);

            } else {
                AppState.isRecording = false;
                clearInterval(AppState.timerInterval);
                if (DOM.recordingHUD) DOM.recordingHUD.classList.add("opacity-0");
                if (DOM.recordTriggerState) {
                    DOM.recordTriggerState.style.borderRadius = "50%";
                    DOM.recordTriggerState.style.transform = "scale(1)";
                    DOM.recordTriggerState.classList.remove("bg-neutral-900");
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
            if (DOM.videoBack) DOM.videoBack.style.filter = "brightness(" + (1 + AppState.exposure * 0.22) + ")";
        });
    }

    // Touch Dragging Setup for PIP Front Cam Window Box
    let isMoving = false, pointerStartX = 0, pointerStartY = 0, initialLeft = 0, initialTop = 0;
    if (DOM.frontCamContainer) {
        DOM.frontCamContainer.addEventListener("pointerdown", (e) => {
            isMoving = true;
            pointerStartX = e.clientX; pointerStartY = e.clientY;
            initialLeft = DOM.frontCamContainer.offsetLeft;
            initialTop = DOM.frontCamContainer.offsetTop;
            DOM.frontCamContainer.setPointerCapture(e.pointerId);
        });
        DOM.frontCamContainer.addEventListener("pointermove", (e) => {
            if (!isMoving) return;
            let deltaX = e.clientX - pointerStartX, deltaY = e.clientY - pointerStartY;
            DOM.frontCamContainer.style.left = (initialLeft + deltaX) + "px";
            DOM.frontCamContainer.style.top = (initialTop + deltaY) + "px";
        });
        DOM.frontCamContainer.addEventListener("pointerup", (e) => {
            isMoving = false;
            DOM.frontCamContainer.releasePointerCapture(e.pointerId);
        });
    }

    // Drawers & Vault Panel Transitions
    const closeSettingsDrawer = () => DOM.settingsBottomSheet?.classList.add("translate-y-full");
    if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener("click", () => DOM.settingsBottomSheet?.classList.remove("translate-y-full"));
    if (DOM.btnCloseSettingsHandle) DOM.btnCloseSettingsHandle.addEventListener("click", closeSettingsDrawer);
    if (DOM.btnBackSettings) DOM.btnBackSettings.addEventListener("click", closeSettingsDrawer);

    if (DOM.btnOpenGallery) DOM.btnOpenGallery.addEventListener("click", () => { renderVault(); DOM.galleryModal?.classList.remove("translate-y-full"); });
    if (DOM.btnCloseGallery) DOM.btnCloseGallery.addEventListener("click", () => DOM.galleryModal?.classList.add("translate-y-full"));

    function renderVault() {
        if (!DOM.galleryGrid) return;
        DOM.galleryGrid.innerHTML = "";
        if (AppState.gallery.length === 0) {
            DOM.galleryEmptyState?.classList.remove("hidden");
            return;
        }
        DOM.galleryEmptyState?.classList.add("hidden");
        AppState.gallery.forEach(item => {
            const block = document.createElement("div");
            block.className = "bg-neutral-900 p-2.5 rounded-2xl flex flex-col gap-2 border border-neutral-800/60";
            block.innerHTML = '<video src="' + item.url + '" class="w-full aspect-video object-cover rounded-xl" controls></video><span class="text-[9px] font-mono text-neutral-500 text-center uppercase">' + item.date + '</span>';
            DOM.galleryGrid.appendChild(block);
        });
    }
});

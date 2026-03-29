import gsap from "https://esm.sh/gsap";
import { Draggable } from "https://esm.sh/gsap/Draggable";
import { songs } from "./music.js";

gsap.registerPlugin(Draggable);

// ==========================================================
// 1. 变量与数据初始化
// ==========================================================
// 核心优化：音量限制
const MAX_VOLUME_LIMIT = 0.5; // 物理上限：即使进度条拉满，实际音量也只有 50%
const initialVolume = 0.150;   // 初始滑块位置 (30%)
const themeBtn = document.getElementById("theme-toggle-btn");
let userVolume = initialVolume; 
let isPlaying = false;
let lastVolume = initialVolume;

// --- 伪随机（洗牌）逻辑变量 ---
let shuffledIndices = []; 
let currentIndexPtr = 0;  

const audio = new Audio();
// 实际音量 = 滑块位置 * 限制系数
audio.volume = initialVolume * MAX_VOLUME_LIMIT;

// DOM 元素
const playPauseBtn = document.getElementById("playPauseBtn");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIcon = document.getElementById("volumeIcon");
const albumArt = document.getElementById("albumArt");
const albumImg = document.getElementById("albumImg");

// ==========================================================
// 2. 核心功能函数
// ==========================================================

function initShuffle() {
    shuffledIndices = Array.from({ length: songs.length }, (_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    currentIndexPtr = 0;
}

function loadSong(ptr) {
    const songIndex = shuffledIndices[ptr];
    const song = songs[songIndex];
    document.getElementById("songName").textContent = song.name;
    document.getElementById("artists").textContent = song.artist;
    albumImg.src = song.image;
    audio.src = song.url;
    document.getElementById("seekProgress").style.width = "0%";
    
    gsap.set(albumArt, { rotation: 0 });
    const draggableInstance = Draggable.get("#albumArt");
    if (draggableInstance) {
        draggableInstance.pendingTime = undefined;
        draggableInstance.lastRot = 0;
    }
}

/**
 * 音量平滑
 * 修改点：应用 MAX_VOLUME_LIMIT
 */
function fadeVolume(target, duration = 0.3, callback = null) {
    gsap.killTweensOf(audio, { volume: true });
    gsap.to(audio, {
        volume: target * MAX_VOLUME_LIMIT, // 映射到受限后的音量
        duration: duration,
        ease: "none",
        onComplete: callback
    });
}

function togglePlay() {
    if (audio.paused) {
        isPlaying = true;
        updatePlayIcon(); 
        audio.play().then(() => {
            fadeVolume(userVolume, 0.4);
            gsap.to(albumArt, { rotation: "+=360", duration: 8, repeat: -1, ease: "none", overwrite: false });
        });
    } else {
        isPlaying = false;
        updatePlayIcon(); 
        fadeVolume(0, 0.2, () => {
            audio.pause();
            gsap.killTweensOf(albumArt);
        });
    }
}

function changeSongWithFade(ptr) {
    fadeVolume(0, 0.2, () => {
        loadSong(ptr);
        if (isPlaying) {
            audio.play().then(() => fadeVolume(userVolume, 0.4));
        }
    });
}

function updatePlayIcon(forceState) {
    const playIcon = `<path d="M8 5v14l11-7z"/>`;
    const pauseIcon = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    const targetIcon = (forceState === 'pause' || !isPlaying) ? playIcon : pauseIcon;
    document.getElementById("playIconSVG").innerHTML = targetIcon;
}
function updateTheme(isDarkMode) {
    document.documentElement.classList.toggle("dark", isDarkMode);
    if (themeBtn) {
        themeBtn.setAttribute("aria-checked", isDarkMode);
        const label = isDarkMode ? "切换到阳面 (亮色)" : "切换到阴面 (暗色)";
        themeBtn.setAttribute("aria-label", label);
    }
    localStorage.setItem("blog-theme", isDarkMode ? "dark" : "light");
}

if (themeBtn) {
    themeBtn.addEventListener("click", (e) => {
        // 阻止事件冒泡，防止触发恢复音量的 restoreVoice
        e.stopPropagation(); 
        const isCurrentDark = document.documentElement.classList.contains("dark");
        updateTheme(!isCurrentDark);
    });
}
const savedTheme = localStorage.getItem("blog-theme");
updateTheme(savedTheme === "dark");

// ==========================================================
// 3. 交互与切歌逻辑
// ==========================================================

function nextSong() {
    currentIndexPtr++;
    if (currentIndexPtr >= shuffledIndices.length) {
        initShuffle(); 
    }
    changeSongWithFade(currentIndexPtr);
}

function prevSong() {
    currentIndexPtr--;
    if (currentIndexPtr < 0) {
        currentIndexPtr = shuffledIndices.length - 1;
    }
    changeSongWithFade(currentIndexPtr);
}

document.getElementById("nextBtn").onclick = nextSong;
document.getElementById("prevBtn").onclick = prevSong;
audio.addEventListener("ended", nextSong);

/**
 * 音量滑动条
 * 修改点：应用 MAX_VOLUME_LIMIT
 */
volumeSlider.oninput = (e) => {
    userVolume = parseFloat(e.target.value);
    // 只有在没有进行渐变动画时，才直接设置物理音量
    if (!gsap.isTweening(audio)) { 
        audio.volume = userVolume * MAX_VOLUME_LIMIT; 
    }
    volumeIcon.style.opacity = userVolume === 0 ? "0.3" : "0.7";
};

// 唱片拨动 (Seek)
Draggable.create(albumArt, {
    type: "rotation",
    onDragStart: function() {
        this.startSeekTime = audio.currentTime;
        this.lastRot = this.rotation;
        gsap.to(albumArt, { opacity: 0.8, scale: 0.98, duration: 0.2 });
        gsap.killTweensOf(albumArt); 
    },
    onDrag: function() {
        if (!audio.duration) return;
        const rotationDelta = this.rotation - this.lastRot;
        const timeDelta = rotationDelta / 36; 
        this.pendingTime = Math.max(0, Math.min(audio.duration, (this.pendingTime || this.startSeekTime) + timeDelta));
        this.lastRot = this.rotation;
        document.getElementById("seekProgress").style.width = `${(this.pendingTime / audio.duration) * 100}%`;
        document.getElementById("currentTime").textContent = formatTime(this.pendingTime);
    },
    onDragEnd: function() {
        if (this.pendingTime !== undefined) {
            audio.currentTime = this.pendingTime;
            this.pendingTime = undefined;
        }
        gsap.to(albumArt, { opacity: 1, scale: 1, duration: 0.2 });
        if (isPlaying) {
            gsap.to(albumArt, { rotation: "+=360", duration: 8, repeat: -1, ease: "none", overwrite: "auto" });
        }
    }    
});

audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const draggableInstance = Draggable.get("#albumArt");
    if (draggableInstance && !draggableInstance.isDragging) {
        const progress = (audio.currentTime / audio.duration) * 100;
        document.getElementById("seekProgress").style.width = `${progress}%`;
        document.getElementById("currentTime").textContent = formatTime(audio.currentTime);
        document.getElementById("totalTime").textContent = formatTime(audio.duration);
    }
});

function formatTime(s) {
    const m = Math.floor(s / 60);
    const se = Math.floor(s % 60);
    return `${m}:${se < 10 ? '0' : ''}${se}`;
}

// ==========================================================
// 4. 初始化
// ==========================================================
playPauseBtn.onclick = togglePlay;

initShuffle(); 
loadSong(currentIndexPtr); 

// 尝试自动播放
setTimeout(() => {
    togglePlay(); 
}, 1000);

// 设置滑动条的初始 UI 状态
volumeSlider.value = initialVolume;
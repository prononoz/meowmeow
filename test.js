import gsap from "https://esm.sh/gsap";
import { Draggable } from "https://esm.sh/gsap/Draggable";
import { songs } from "./music.js";

gsap.registerPlugin(Draggable);

// ==========================================================
// 1. 变量与数据初始化
// ==========================================================
const siteConfig = {
    // 格式： "HTML元素ID": { light: "白天文字/路径", dark: "黑夜文字/路径" }
    "hero-title": { 
        light: "皎皎空中孤月轮", 
        dark: "羽" 
    },
    "hero-tagline": { 
        light: "行走江湖的旅人 · 看破红尘之外", 
        dark: "暗黑世界的行者 · 编织梦境之影" 
    },
    "hero-motto": { 
        light: "“一面入世为客，踏破红尘寻求超脱。”", 
        dark: "“一面行走于影，在杀戮中寻找自我。”" 
    },
    "main-photo": { 
        light: "https://image-assets.mihuashi.com/permanent/1726626%7C-2026/02/26/10/lidHlCqjQD8FZniWwywIqL8U8laZ_4252.jpg!w600.2x", // 替换为你真实的白天图
        dark: "https://image-assets.mihuashi.com/permanent/1726626%7C-2026/01/06/22/Fmnkv-zciSqFSCNbr5uRhKLJSu-G_2121.jpg!sq300.2x"   // 替换为你真实的黑夜图
    },
    "card-about-title-1": { light: "所谓孤月影", dark: "羽的身份" },
    "card-about-desc-1": { 
        light: "身份：揽月楼楼主/江湖侠客“孤月影”。 \n（揽月楼为九州内隐蔽的风雅之地，因“书、琴、茶”三绝颇负盛名，也是情报网络的重要节点） ", 
        dark: "「羽」是作为执行杀手的代号，真实姓名不详。\n 小腿有幼时留下的大量伤疤，不愿示人。\n幸运数字是7，故一直戴着罗马数字Ⅶ的发夹。" 
    },
    "card-about-title-2": { light: "武器", dark: "武器" },
    "card-about-desc-2": { 
        light: "长刀「望舒」/双匕「缺月、归望」\n（前者是“楼主”之道，司月华而求净美；\n后者是代表“孤月影”的普通兵器，象征她的自由与侠义)", 
        dark: "镰刀「残夜」" 
    },
    "card-about-title-3": { light: "性格", dark: "性格" },
    "card-about-desc-3": { 
        light: "社交回避，理想主义，完美主义，外冷内热，骄傲与自卑的矛盾体\n（刻板印象一点的→INFJ）", 
        dark: "理想主义，容易内耗，害怕被别人否定所以会事先进行严重的自贬。\n不认识的时候看上去很冷淡（实则不太擅长交际）。\n疼痛忍耐差，不过因自身实力强硬少有受伤。\n有轻微自残倾向。" 
    },
    "card-about-title-4": { light: "关于孤月影", dark: "关于羽" },
    "card-about-desc-4": { 
        light: "看红尘，破红尘，身在红尘……", 
        dark: "因精神创伤产生第二人格（白发红瞳），有嗜血倾向，会采用极为残忍的方式进行战斗。\n现在精神逐渐稳定，已极少出现" 
    },
};
const MAX_VOLUME_LIMIT = 0.5; 
const initialVolume = 0.150; 
let userVolume = initialVolume; 
let isPlaying = false;

// 伪随机变量
let shuffledIndices = []; 
let currentIndexPtr = 0;  

const audio = new Audio();
audio.volume = 0; // 初始物理音量必须为0，用于淡入
audio.muted = true; // 初始静音以绕过拦截

// DOM 元素
const loaderOverlay = document.getElementById("loader-overlay");
const enterText = document.getElementById("enter-text");
const spinner = document.querySelector(".spinner");
const themeBtn = document.getElementById("theme-toggle-btn");
const playPauseBtn = document.getElementById("playPauseBtn");
const volumeSlider = document.getElementById("volumeSlider");
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
}

function fadeVolume(target, duration = 0.5, callback = null) {
    gsap.killTweensOf(audio, { volume: true });
    gsap.to(audio, {
        volume: target * MAX_VOLUME_LIMIT,
        duration: duration,
        ease: "none",
        onComplete: callback
    });
}

/**
 * 核心：进入网站并解锁音频
 */
function enterSite() {
    // 1. 播放器状态初始化
    isPlaying = true;
    updatePlayIcon();
    
    // 2. 解除静音并开始播放
    audio.muted = false;
    audio.play().then(() => {
        fadeVolume(userVolume, 2);
        // 唱片开始旋转
        gsap.to(albumArt, { rotation: "+=360", duration: 8, repeat: -1, ease: "none" });
    });

    // 3. 遮罩层淡出
    loaderOverlay.classList.add("fade-out");

    // 4. 【核心新增】播放器入场动画
    // 延迟 0.5 秒播放，等遮罩层稍微透明一点时开始上浮，视觉效果更好
    gsap.to(".player-left-bottom", {
        y: 0,            // 回到原始位置 (translateY(0))
        opacity: 1,      // 恢复不透明
        duration: 1.2,   // 持续 1.2 秒，慢一点显得高级
        ease: "power2.out", // 先快后慢的曲线
        delay: 0.5       // 稍微延迟一点启动
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

function updatePlayIcon() {
    const playIcon = `<path d="M8 5v14l11-7z"/>`;
    const pauseIcon = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    document.getElementById("playIconSVG").innerHTML = isPlaying ? pauseIcon : playIcon;
}

// 主题切换
function updateTheme(isDarkMode) {
    document.documentElement.classList.toggle("dark", isDarkMode);
    if (themeBtn) {
        themeBtn.setAttribute("aria-checked", isDarkMode);
        const label = isDarkMode ? "切换到阳面 (亮色)" : "切换到阴面 (暗色)";
        themeBtn.setAttribute("aria-label", label);
    }
    // 注意：这里我们依然保留存储功能，以便用户在“当前会话”中切换
    localStorage.setItem("blog-theme", isDarkMode ? "dark" : "light");
}

updateTheme(false);
// ==========================================================
// 3. 事件绑定
// ==========================================================

// 加载完成监听
window.addEventListener("load", () => {
    // 隐藏整个转圈包装容器
    const wrapper = document.querySelector(".spinner-wrapper");
    if (wrapper) wrapper.style.display = "none";
    
    const enterText = document.getElementById("enter-text");
    if (enterText) enterText.style.display = "block";
});

// 点击进入
loaderOverlay.onclick = enterSite;

if (themeBtn) {
    themeBtn.onclick = (e) => {
    e.stopPropagation(); 
    const isCurrentDark = document.documentElement.classList.contains("dark");
    const nextDarkState = !isCurrentDark;

    // 1. 立即执行：主题变量切换、字体切换
    updateTheme(nextDarkState);

    // 2. 立即执行：图库静默切换（用户看不见，直接换掉）
    toggleGallery(nextDarkState);

    // 3. 动画执行：首屏文字/主图淡入淡出
    refreshSiteContent(nextDarkState);
    }
}

playPauseBtn.onclick = togglePlay;
/**
 * 统一的换歌逻辑
 * @param {string} direction 'next' 或 'prev'
 */
function switchSong(direction) {
    if (direction === 'next') {
        currentIndexPtr = (currentIndexPtr + 1) % shuffledIndices.length;
        if(currentIndexPtr === 0) initShuffle();
    } else {
        currentIndexPtr = (currentIndexPtr - 1 + shuffledIndices.length) % shuffledIndices.length;
    }

    fadeVolume(0, 0.2, () => {
        loadSong(currentIndexPtr);
        if (isPlaying) {
            audio.play().then(() => fadeVolume(userVolume, 0.4));
        }
    });
}

// 这样你的绑定就会变得极其清爽：
document.getElementById("nextBtn").onclick = () => switchSong('next');
document.getElementById("prevBtn").onclick = () => switchSong('prev');
audio.onended = () => { isPlaying = true; switchSong('next'); };

// ... 此处省略 prevBtn 和 ended 的逻辑，与 nextBtn 类似 ...

volumeSlider.oninput = (e) => {
    userVolume = parseFloat(e.target.value);
    if (!gsap.isTweening(audio)) { 
        audio.volume = userVolume * MAX_VOLUME_LIMIT; 
    }
};

// 唱片拨动 (Seek) 保持你原来的高质量逻辑
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
    const draggableInstance = Draggable.get(albumArt);
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

const seekBar = document.getElementById("seekBar");

if (seekBar) {
    seekBar.onclick = function(e) {
        if (!audio.duration) return;

        // 1. 获取进度条相对于视口的位置和宽度
        const rect = seekBar.getBoundingClientRect();
        
        // 2. 计算点击位置相对于进度条左侧的偏移量
        const offsetX = e.clientX - rect.left;
        
        // 3. 计算百分比并映射到歌曲总时长
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, offsetX / width));
        const targetTime = percentage * audio.duration;

        // 4. 执行跳转
        // 如果正在播放，我们先稍微压低音量再跳，视觉和听觉上更专业
        if (isPlaying) {
            audio.currentTime = targetTime;
            // 更新进度条 UI (虽然 timeupdate 也会更新，但点击瞬间更新会更顺滑)
            document.getElementById("seekProgress").style.width = `${percentage * 100}%`;
        } else {
            audio.currentTime = targetTime;
            document.getElementById("seekProgress").style.width = `${percentage * 100}%`;
            document.getElementById("currentTime").textContent = formatTime(targetTime);
        }
    };
}
/**
 * 优化后的内容填充函数
 * @param {boolean} isDark 模式
 * @param {boolean} immediate 是否立即切换（初次加载用 true，手动切换用 false）
 */
function refreshSiteContent(isDark, immediate = false) {
    const mode = isDark ? 'dark' : 'light';
    const elementsToUpdate = [];
    for (const id in siteConfig) {
        const el = document.getElementById(id);
        if (el) elementsToUpdate.push(el);
    }

    const updateLogic = () => {
        for (const id in siteConfig) {
            const element = document.getElementById(id);
            if (!element) continue;
            const content = siteConfig[id][mode];
            if (element.tagName === 'IMG') {
                element.src = content;
            } else {
                element.textContent = content;
            }
        }
    };

    if (immediate) {
        updateLogic(); // 初次加载，直接上内容
    } else {
        // 手动切换时，走淡入淡出流程
        elementsToUpdate.forEach(el => el.classList.add("content-fading"));
        setTimeout(() => {
            updateLogic();
            elementsToUpdate.forEach(el => el.classList.remove("content-fading"));
        }, 400); 
    }
}
function toggleGallery(isDark) {
    const lightPool = document.getElementById("light-photo-pool");
    const darkPool = document.getElementById("dark-photo-pool");

    if (isDark) {
        lightPool?.classList.add("hidden");
        darkPool?.classList.remove("hidden");
    } else {
        lightPool?.classList.remove("hidden");
        darkPool?.classList.add("hidden");
    }
}


// ==========================================================
// 4. 初始化
// ==========================================================
const savedTheme = localStorage.getItem("blog-theme") || "light"; 
const isDark = (savedTheme === "dark");
updateTheme(isDark);
refreshSiteContent(isDark);
initShuffle(); 
loadSong(currentIndexPtr); 
if (volumeSlider) volumeSlider.value = initialVolume;
initStarBackground();

// ==========================================================
// 5. 动态星空生成逻辑
// ==========================================================

/**
 * 模拟原版 Sass 的多重阴影生成
 * @param {number} count 星星数量
 * @returns {string} box-shadow 字符串
 */
function generateStars(count) {
    let shadows = [];
    for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * 4000);
        const y = Math.floor(Math.random() * 2000);
        // 使用 CSS 变量来控制颜色，这样切换模式时星星会自动变色
        shadows.push(`${x}px ${y}px rgba(var(--current-star-rgb), 0.8)`);
    }
    return shadows.join(", ");
}

function initStarBackground() {
    const starsNodes = [
        document.getElementById("stars"),
        document.getElementById("stars2"),
        document.getElementById("stars3")
    ];
    const flickerLayer = document.getElementById("star-flicker-layer");
    const themeBtn = document.getElementById("theme-toggle-btn");

    // --- 新增：内部生成阴影的工具函数 ---
    const reGenerateStars = () => {
        const gen = (count) => {
            let shadows = [];
            for (let i = 0; i < count; i++) {
                const x = Math.floor(Math.random() * 2000);
                const y = Math.floor(Math.random() * 2000);
                // 确保这里的变量名与 CSS 一致
                shadows.push(`${x}px ${y}px rgba(var(--current-star-rgb), 0.8)`);
            }
            return shadows.join(", ");
        };
        if(starsNodes[0]) starsNodes[0].style.boxShadow = gen(900);
        if(starsNodes[1]) starsNodes[1].style.boxShadow = gen(300);
        if(starsNodes[2]) starsNodes[2].style.boxShadow = gen(200);
    };

    // --- 核心：初始化调用 ---
    // 1. 确保 CSS 变量有值
    const isDarkInit = document.documentElement.classList.contains("dark");
    document.documentElement.style.setProperty('--current-star-rgb', isDarkInit ? "255, 255, 255" : "180, 140, 100");
    
    // 2. 立即生成星星
    reGenerateStars();

    // --- 按钮点击逻辑 (保持你的静默切换) ---
    themeBtn.addEventListener("click", () => {
        if (flickerLayer) {
            flickerLayer.classList.remove("stars-flicker-active");
            void flickerLayer.offsetWidth; 
            flickerLayer.classList.add("stars-flicker-active");
        }

        setTimeout(() => {
            const isDark = document.documentElement.classList.contains("dark");
            const rgb = isDark ? "255, 255, 255" : "180, 140, 100";
            document.documentElement.style.setProperty('--current-star-rgb', rgb);
            starsNodes.forEach(star => {
                if (star) star.style.animationName = isDark ? "animStarUp" : "animStarDown";
            });
            refreshSiteContent(isDark);
        }, 400); // 这个 400ms 极其重要，它是转场的核心
        setTimeout(() => {
        const isDark = document.documentElement.classList.contains("dark");
        if (isDark) {
            document.documentElement.classList.add("font-apply-dark");
        } else {
            document.documentElement.classList.remove("font-apply-dark");
        }
        }, 700);
    });
}
function preloadSiteImages() {
    for (const id in siteConfig) {
        const config = siteConfig[id];
        // 检查配置中是否存在链接（通常是 main-photo）
        if (config.light.startsWith('http') || config.light.startsWith('./')) {
            const imgLight = new Image();
            imgLight.src = config.light;
            
            const imgDark = new Image();
            imgDark.src = config.dark;
            
            // 调试用（可选）：console.log(`已预加载: ${id} 的双面资源`);
        }
    }
}

// 在初始化位置调用它
preloadSiteImages();
// 在你最后的初始化区域调用
initStarBackground();
toggleGallery(isDark);

// ==========================================================
// 6. 全局图片点击放大与关闭逻辑
// ==========================================================
const imageViewer = document.getElementById("image-viewer");
const fullImage = document.getElementById("full-image");

// --- A. 打开逻辑 ---
document.addEventListener("click", (e) => {
    const isGalleryImg = e.target.closest("#light-photo-pool img") || 
                         e.target.closest("#dark-photo-pool img");

    if (isGalleryImg) {
        const clickedImg = e.target;
        // 解析原图 URL
        let originalUrl = clickedImg.src.split('!')[0]; 
        
        fullImage.src = originalUrl;
        
        // 确保移除 hidden 并强制显示
        imageViewer.style.display = "flex"; 
        imageViewer.classList.remove("hidden");
        // 延迟触发 active 类以启动 CSS 透明度和缩放动画
        setTimeout(() => imageViewer.classList.add("active"), 10);
    }
});

// --- B. 关闭逻辑 (修复无法退出的 Bug) ---
// 定义统一的关闭函数
const closeGalleryViewer = () => {
    if (!imageViewer) return;
    
    // 1. 先移除激活状态类（触发 CSS 的淡出和缩小动画）
    imageViewer.classList.remove("active");
    
    // 2. 等待 300ms 动画结束后，彻底隐藏
    setTimeout(() => {
        imageViewer.classList.add("hidden");
        imageViewer.style.display = "none";
        fullImage.src = ""; // 清空图片地址，释放内存并防止下次打开闪烁
    }, 300);
};

// 监听查看器上的点击
imageViewer.addEventListener("click", (e) => {
    // 只有点击背景（image-viewer本身）或者点击那个带 close-viewer 类的叉叉时才关闭
    // 这样点击图片中间时不会意外关闭
    if (e.target.id === "image-viewer" || e.target.classList.contains("close-viewer")) {
        closeGalleryViewer();
    }
});

// 增加键盘 ESC 退出支持（提升体验）
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && imageViewer.classList.contains("active")) {
        closeGalleryViewer();
    }
});

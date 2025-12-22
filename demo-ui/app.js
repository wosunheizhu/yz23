/**
 * 元征 · 合伙人赋能平台
 * 高端简约现代艺术画廊风格
 * 交互逻辑
 */

document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    initActionSheet();
    initBottomNav();
    initCards();
    initScrollReveal();
    initTimeGreeting();
}

/**
 * 时间问候语
 */
function initTimeGreeting() {
    const greetingEl = document.querySelector('.greeting-time');
    if (!greetingEl) return;
    
    const hour = new Date().getHours();
    let greeting = '您好';
    
    if (hour >= 5 && hour < 12) {
        greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
        greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
        greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
        greeting = '晚上好';
    } else {
        greeting = '夜深了';
    }
    
    greetingEl.textContent = greeting;
}

/**
 * 快捷操作面板
 */
function initActionSheet() {
    const centerBtn = document.getElementById('centerBtn');
    const actionSheet = document.getElementById('actionSheet');
    const actionOverlay = document.getElementById('actionOverlay');
    const actionClose = document.getElementById('actionClose');
    
    if (!centerBtn || !actionSheet || !actionOverlay) return;
    
    // 打开面板
    centerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openActionSheet();
    });
    
    // 关闭面板 - 点击遮罩
    actionOverlay.addEventListener('click', function() {
        closeActionSheet();
    });
    
    // 关闭面板 - 点击关闭按钮
    if (actionClose) {
        actionClose.addEventListener('click', function() {
            closeActionSheet();
        });
    }
    
    // 点击操作项
    const actionItems = actionSheet.querySelectorAll('.action-item');
    actionItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const label = this.querySelector('.action-label')?.textContent;
            console.log('执行操作:', label);
            
            // 触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
            
            // 延迟关闭面板
            setTimeout(() => {
                closeActionSheet();
            }, 150);
        });
    });
}

function openActionSheet() {
    const actionSheet = document.getElementById('actionSheet');
    const actionOverlay = document.getElementById('actionOverlay');
    const centerBtn = document.querySelector('.center-btn');
    
    actionSheet.classList.add('active');
    actionOverlay.classList.add('active');
    
    // 中心按钮旋转
    if (centerBtn) {
        centerBtn.style.transform = 'rotate(45deg)';
    }
    
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
    
    // 触觉反馈
    if (navigator.vibrate) {
        navigator.vibrate(5);
    }
}

function closeActionSheet() {
    const actionSheet = document.getElementById('actionSheet');
    const actionOverlay = document.getElementById('actionOverlay');
    const centerBtn = document.querySelector('.center-btn');
    
    actionSheet.classList.remove('active');
    actionOverlay.classList.remove('active');
    
    // 中心按钮复位
    if (centerBtn) {
        centerBtn.style.transform = '';
    }
    
    // 恢复背景滚动
    document.body.style.overflow = '';
}

/**
 * 底部导航
 */
function initBottomNav() {
    const navTabs = document.querySelectorAll('.nav-tab:not(.center)');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 切换激活状态
            navTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 获取导航名称
            const navName = this.querySelector('span')?.textContent;
            console.log('导航到:', navName);
            
            // 触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(3);
            }
        });
    });
}

/**
 * 卡片交互
 */
function initCards() {
    // 待办事项点击
    const todoItems = document.querySelectorAll('.todo-item');
    todoItems.forEach(item => {
        item.addEventListener('click', function() {
            const title = this.querySelector('.todo-title')?.textContent;
            console.log('处理待办:', title);
            
            // 点击反馈
            animateClick(this);
        });
    });
    
    // 项目卡片点击
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('.project-title')?.textContent;
            console.log('查看项目:', title?.replace(/\n/g, ' '));
            
            // 点击反馈
            animateClick(this);
        });
    });
    
    // 贡献卡片点击
    const contributionCards = document.querySelectorAll('.contribution-card');
    contributionCards.forEach(card => {
        card.addEventListener('click', function() {
            const label = this.querySelector('.contribution-label')?.textContent;
            console.log('查看贡献:', label);
            
            // 点击反馈
            animateClick(this);
        });
    });
    
    // Token 发起交易按钮
    const tokenAction = document.querySelector('.token-action');
    if (tokenAction) {
        tokenAction.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('发起 Token 交易');
            
            // 触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        });
    }
    
    // 通知按钮
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            console.log('查看通知');
            
            // 隐藏红点
            const dot = this.querySelector('.notification-dot');
            if (dot) {
                dot.style.display = 'none';
            }
        });
    }
}

/**
 * 点击动画反馈
 */
function animateClick(element) {
    element.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
    element.style.transform = 'scale(0.98)';
    element.style.opacity = '0.9';
    
    setTimeout(() => {
        element.style.transform = '';
        element.style.opacity = '';
    }, 150);
    
    // 触觉反馈
    if (navigator.vibrate) {
        navigator.vibrate(3);
    }
}

/**
 * 滚动显示动画
 */
function initScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 初始化需要观察的元素
    const sections = document.querySelectorAll('.todo-section, .project-section, .contribution-section, .value-section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // 延迟触发初始可见区域
    setTimeout(() => {
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            }
        });
    }, 100);
}

/**
 * 格式化数字（千分位）
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 格式化金额
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0
    }).format(amount);
}

/**
 * 安全区域适配（iOS）
 */
function handleSafeArea() {
    const root = document.documentElement;
    
    // 检测是否为 iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
        // 添加 viewport-fit=cover 后的安全区域处理
        const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top');
        const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom');
        
        console.log('Safe area - Top:', safeAreaTop, 'Bottom:', safeAreaBottom);
    }
}

// 页面加载完成后处理安全区域
window.addEventListener('load', handleSafeArea);

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 监听页面可见性变化
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // 页面可见时更新问候语
        initTimeGreeting();
    }
});

// 键盘事件（用于关闭面板）
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeActionSheet();
    }
});







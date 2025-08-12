// 导航栏交互
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// 点击导航链接时关闭移动端菜单
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(12, 12, 12, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.background = 'rgba(12, 12, 12, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});

// 文章卡片动画
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// 观察文章卡片
document.querySelectorAll('.article-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// 统计数字动画
function animateNumbers() {
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        const target = parseInt(stat.textContent);
        const increment = target / 100;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current) + (stat.textContent.includes('+') ? '+' : '');
        }, 20);
    });
}

// 当关于部分进入视口时触发数字动画
const aboutObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateNumbers();
            aboutObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const aboutSection = document.querySelector('.about');
if (aboutSection) {
    aboutObserver.observe(aboutSection);
}

// 浮动元素动画增强
function enhanceFloatingElements() {
    const elements = document.querySelectorAll('.element');
    elements.forEach((element, index) => {
        element.style.animationDelay = `${index * 1.5}s`;
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化...');

    enhanceFloatingElements();
    initThemeToggle();

    // 添加页面加载动画
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';

    setTimeout(() => {
        document.body.style.opacity = '1';
        console.log('页面加载动画完成');
    }, 100);
});

// 按钮点击效果
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function (e) {
        // 创建涟漪效果
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// 添加涟漪效果的CSS
const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 滚动进度指示器
function createScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #00d4ff, #0099cc);
        z-index: 1001;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

createScrollProgress();

// 主题切换功能
function initThemeToggle() {
    console.log('初始化主题切换功能...');

    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) {
        console.error('找不到主题切换按钮！');
        return;
    }

    console.log('找到主题切换按钮:', themeToggle);

    const icon = themeToggle.querySelector('i');
    if (!icon) {
        console.error('找不到图标元素！');
        return;
    }

    // 检查本地存储的主题偏好
    const savedTheme = localStorage.getItem('theme');
    console.log('保存的主题:', savedTheme);

    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        icon.className = 'fas fa-sun';
        console.log('应用亮色主题');
    }

    themeToggle.addEventListener('click', () => {
        console.log('主题切换按钮被点击！');

        document.body.classList.toggle('light-theme');
        const isLightTheme = document.body.classList.contains('light-theme');

        console.log('当前主题:', isLightTheme ? '亮色' : '暗色');

        // 更新图标
        if (isLightTheme) {
            icon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'light');
            console.log('切换到亮色主题');

            // 添加明显的亮色主题效果
            document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)';
            document.body.style.color = '#333';
        } else {
            icon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'dark');
            console.log('切换到暗色主题');

            // 恢复暗色主题效果
            document.body.style.background = 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)';
            document.body.style.color = '#fff';
        }
    });

    console.log('主题切换功能初始化完成');
}



// 初始化主题切换
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
});

// 如果DOM已经加载完成，直接初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
    initThemeToggle();
}

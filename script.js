
document.addEventListener('DOMContentLoaded', () => {
    // 導覽列滾動效果
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 數字跳動動畫 (Stats Counter)
    const counters = document.querySelectorAll('.counter');
    const speed = 200; // 越小越快

    const animateCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute('data-target');
                const count = +counter.innerText;
                
                const inc = target / speed;

                if (count < target) {
                    counter.innerText = Math.ceil(count + inc);
                    setTimeout(updateCount, 15);
                } else {
                    counter.innerText = target;
                }
            };

            // 當元素進入畫面時才開始動畫
            const observer = new IntersectionObserver((entries) => {
                if(entries[0].isIntersecting) {
                    updateCount();
                    observer.disconnect();
                }
            });
            observer.observe(counter);
        });
    };

    animateCounters();

    // 捲動漸顯動畫 (Fade-in on scroll)
    const fadeElements = document.querySelectorAll('.fade-in');
    
    const fadeObserverOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, fadeObserverOptions);

    fadeElements.forEach(el => {
        fadeObserver.observe(el);
    });

    // 模擬動態長條圖的動畫
    const bars = document.querySelectorAll('.bar');
    setInterval(() => {
        bars.forEach(bar => {
            // 隨機改變高度，模擬即時交易數據
            const newHeight = Math.floor(Math.random() * 80) + 20;
            bar.style.height = `${newHeight}%`;
            bar.style.transition = 'height 0.5s ease';
        });
    }, 2000);

    // 行動版導覽選單切換 (Mobile Menu Toggle)
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // 點擊選單連結後自動關閉選單
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
});



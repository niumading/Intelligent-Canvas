(function () {
    'use strict';

    const pages = [
        ['enhance', '#ef8b6d'],
        ['angle', '#8f87de'],
        ['online', '#61b4a0'],
        ['gpt-chat', '#7495d8'],
        ['canvas', '#d471ca'],
        ['white-model', '#9dc4df'],
        ['asset-manager', '#e6ae58'],
        ['api-settings', '#78a7c4'],
        ['comfyui-settings', '#9b91d6']
    ];
    const nav = document.getElementById('wheel-nav');
    const track = document.getElementById('wheel-track');
    const hideToggle = document.getElementById('wheel-hide-toggle');
    if (!nav || !track) return;
    const hiddenStorageKey = 'studio_wheel_hidden';

    const buttons = new Map();
    let selected = pages.findIndex(([id]) => id === localStorage.getItem('studio_active_page'));
    if (selected < 0) selected = 0;
    let accumulatedWheel = 0;
    let lastWheel = 0;
    let navigateTimer = 0;

    function sourceFor(id) {
        return document.querySelector(`[onclick="switchUI(this, '${id}')"]`);
    }

    function faceFor(index) {
        const faces = [
            '<path d="M14 17c3-3 6-3 9 0M37 17c3-3 6-3 9 0M17 39c8-8 18-8 26-2"/>',
            '<path d="M14 20h9M37 20h9M20 39c7 3 13 3 20 0"/>',
            '<path d="M14 19l9 4M46 19l-9 4M20 40c7-6 13-6 20 0"/>',
            '<circle cx="19" cy="20" r="4" fill="currentColor" stroke="none"/><circle cx="41" cy="20" r="4" fill="currentColor" stroke="none"/><path d="M15 40c9-4 21-4 30 0"/>',
            '<path d="M14 19c3 4 6 4 9 0M37 19c3 4 6 4 9 0M17 35c7 9 19 9 26 0"/>',
            '<path d="M14 19c3-3 6-3 9 0M37 19c3-3 6-3 9 0M19 42c6-8 16-8 22 0"/><path d="M13 25l-2 5M47 25l2 5"/>',
            '<path d="M13 21c4-5 8-5 12 0M35 21c4-5 8-5 12 0M17 38c3-4 6-4 9 0 3 4 6 4 9 0 3-4 6-4 9 0"/>',
            '<path d="M13 18l11 7M24 18l-11 7M36 18l11 7M47 18l-11 7M20 38c6 7 14 7 20 0"/>',
            '<path d="M13 23c3-7 8-8 12-2M47 23c-3-7-8-8-12-2M20 40c7-5 13-5 20 0"/>',
            '<circle cx="19" cy="20" r="3.5" fill="currentColor" stroke="none"/><circle cx="41" cy="20" r="3.5" fill="currentColor" stroke="none"/><path d="M18 37c8 5 16 5 24 0"/><path d="M30 27v3"/>',
        ];
        return `<svg class="wheel-face-svg" viewBox="0 0 60 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${faces[index % faces.length]}</g></svg>`;
    }

    function labelFor(id) {
        return sourceFor(id)?.querySelector('.nav-text, .side-pill-text')?.textContent?.trim() || id;
    }

    function render() {
        const step = Math.min(88, Math.max(62, nav.clientHeight * .09));
        for (let index = 0; index < pages.length; index++) {
            const button = buttons.get(pages[index][0]);
            const offset = index - selected;
            const distance = Math.abs(offset);
            const visible = distance <= 4;
            button.style.transform = `translate3d(0, calc(-50% + ${offset * step}px), 0) scale(${distance === 0 ? 1 : Math.max(.8, 1 - distance * .045)})`;
            button.style.right = `${62 - Math.min(distance, 4) * 15}px`;
            button.style.opacity = visible ? String(Math.max(.32, 1 - distance * .15)) : '0';
            button.style.pointerEvents = visible ? 'auto' : 'none';
            button.classList.toggle('is-active', index === selected);
            button.setAttribute('aria-current', index === selected ? 'page' : 'false');
            button.tabIndex = visible ? 0 : -1;
            button.querySelector('.wheel-label').textContent = labelFor(pages[index][0]);
        }
    }

    function navigateTo(index, delayed) {
        selected = Math.max(0, Math.min(index, pages.length - 1));
        render();
        clearTimeout(navigateTimer);
        const id = pages[selected][0];
        navigateTimer = setTimeout(() => {
            const source = sourceFor(id);
            if (source && typeof window.switchUI === 'function') window.switchUI(source, id);
        }, delayed ? 170 : 0);
    }

    for (let index = 0; index < pages.length; index++) {
        const [id, color] = pages[index];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wheel-item';
        button.style.setProperty('--item-color', color);
        button.dataset.page = id;
        button.setAttribute('aria-label', labelFor(id));
        const label = document.createElement('span');
        label.className = 'wheel-label';
        const icon = document.createElement('span');
        icon.className = 'wheel-icon';
        icon.innerHTML = faceFor(index);
        button.append(label, icon);
        button.addEventListener('click', () => {
            if (matchMedia('(max-width: 800px)').matches && !nav.classList.contains('is-open')) {
                nav.classList.add('is-open');
                return;
            }
            navigateTo(index, false);
            if (matchMedia('(max-width: 800px)').matches) {
                window.setTimeout(() => nav.classList.remove('is-open'), 220);
            }
        });
        track.appendChild(button);
        buttons.set(id, button);
    }

    nav.addEventListener('wheel', event => {
        event.preventDefault();
        accumulatedWheel += event.deltaY;
        const now = performance.now();
        if (Math.abs(accumulatedWheel) < 32 || now - lastWheel < 85) return;
        const direction = Math.sign(accumulatedWheel);
        accumulatedWheel = 0;
        lastWheel = now;
        navigateTo(selected + direction, true);
    }, { passive: false });

    nav.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            navigateTo(selected + (event.key === 'ArrowDown' ? 1 : -1), true);
            buttons.get(pages[selected][0])?.focus();
        }
    });

    function setWheelHidden(hidden, remember = true) {
        nav.classList.toggle('is-hidden', hidden);
        nav.classList.remove('is-open');
        if (hideToggle) {
            const label = hidden ? '显示功能轮盘' : '隐藏功能轮盘';
            hideToggle.setAttribute('aria-label', label);
            hideToggle.setAttribute('title', label);
            hideToggle.setAttribute('aria-expanded', String(!hidden));
            hideToggle.querySelector('span').textContent = hidden ? '›' : '‹';
        }
        if (remember) localStorage.setItem(hiddenStorageKey, hidden ? '1' : '0');
        requestAnimationFrame(render);
    }

    hideToggle?.addEventListener('click', () => {
        setWheelHidden(!nav.classList.contains('is-hidden'));
    });
    document.getElementById('wheel-menu-toggle')?.addEventListener('click', () => {
        nav.classList.toggle('is-open');
    });
    const themeToggle = document.getElementById('wheel-theme-toggle');
    function syncThemeToggle() {
        const dark = document.documentElement.classList.contains('theme-dark') || document.body.classList.contains('theme-dark');
        const label = dark ? '切换到日间模式' : '切换到夜间模式';
        themeToggle?.setAttribute('aria-label', label);
        themeToggle?.setAttribute('title', label);
        themeToggle?.setAttribute('aria-pressed', String(dark));
    }
    themeToggle?.addEventListener('click', () => {
        window.toggleTheme?.();
        requestAnimationFrame(syncThemeToggle);
    });
    new MutationObserver(syncThemeToggle).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    syncThemeToggle();
    document.getElementById('wheel-language-toggle')?.addEventListener('click', () => {
        window.toggleLanguage?.();
        requestAnimationFrame(render);
    });

    window.addEventListener('studio-page-change', event => {
        const next = pages.findIndex(([id]) => id === event.detail?.id);
        if (next >= 0 && next !== selected) {
            selected = next;
            render();
        }
    });
    window.addEventListener('resize', render);
    setWheelHidden(localStorage.getItem(hiddenStorageKey) === '1', false);
    render();
})();


// ============================================================
// MIN BYUNG HUN — Official Website
// ============================================================

function initAll() {
    initHeroSlideshow();
    initNav();
    initReveal();
    initCounters();
    initFilter('#filmoFilters', '#filmoGrid .poster-card');
    initFilter('#archiveFilters', '#archiveBoard .archive-row');
    initAwards();
    initStripArrows();
    initYouTubeLite();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
} else {
    initAll();
}

// ---------- Hero : Ken Burns crossfade slideshow ----------
function initHeroSlideshow() {
    const slides = document.querySelectorAll('.hero-slide');
    const progress = document.getElementById('heroProgress');
    if (!slides.length) return;

    const DURATION = 7000; // ms per slide
    let current = 0;
    let startTime = performance.now();

    // Preload backgrounds so crossfades never show an empty frame — but only
    // after the page has finished loading. Kicking off five full-size JPEG
    // downloads at startup competed with everything else on phones and made
    // the first screen sluggish to respond to taps.
    function preloadSlides() {
        slides.forEach(slide => {
            const url = slide.style.backgroundImage.slice(5, -2);
            const img = new Image();
            img.src = url;
        });
    }
    if (document.readyState === 'complete') {
        preloadSlides();
    } else {
        window.addEventListener('load', preloadSlides, { once: true });
    }

    function next() {
        slides[current].classList.remove('is-active');
        current = (current + 1) % slides.length;
        // Restart the Ken Burns animation from the beginning
        const slide = slides[current];
        slide.classList.remove('is-active');
        void slide.offsetWidth;
        slide.classList.add('is-active');
        startTime = performance.now();
    }
    setInterval(next, DURATION);

    // Slide progress bar
    if (progress) {
        (function tick(now) {
            const pct = Math.min((now - startTime) / DURATION, 1) * 100;
            progress.style.width = pct + '%';
            requestAnimationFrame(tick);
        })(performance.now());
    }
}

// ---------- Navigation : scroll state, active link, mobile menu ----------
function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navMenu');
    const links = document.querySelectorAll('.nav-link');

    const sections = [...links]
        .map(l => document.querySelector(l.getAttribute('href')))
        .filter(Boolean);

    function updateActiveLink() {
        const vh = window.innerHeight || document.documentElement.clientHeight || 800;
        const pos = window.scrollY + vh * 0.35;
        let activeId = sections[0] ? sections[0].id : null;
        sections.forEach(sec => {
            if (sec.offsetTop <= pos) activeId = sec.id;
        });
        links.forEach(l =>
            l.classList.toggle('active', l.getAttribute('href') === '#' + activeId)
        );
    }

    const onScroll = () => {
        nav.classList.toggle('is-scrolled', window.scrollY > 60);
        updateActiveLink();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function closeMenu() {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('is-open');
        toggle.classList.toggle('is-open', open);
        document.body.style.overflow = open ? 'hidden' : '';
    });

    // Rotating the phone can cross the mobile breakpoint (some phones exceed
    // 860px wide in landscape), flipping the menu between the full-screen
    // mobile overlay and the plain desktop layout mid-interaction, leaving it
    // stuck half-open with body scroll locked. Close it when the layout mode
    // actually flips — and only then. A bare resize listener is wrong here:
    // mobile browsers fire resize whenever the URL bar shows/hides, which
    // would slam the menu shut the moment the user opens it.
    // Keep in sync with the mobile-nav media query in style.css
    const mobileLayout = window.matchMedia('(max-width: 1024px)');
    if (typeof mobileLayout.addEventListener === 'function') {
        mobileLayout.addEventListener('change', closeMenu);
    } else if (typeof mobileLayout.addListener === 'function') {
        mobileLayout.addListener(closeMenu);
    }
    // Fallback for the same scenario: react only when the viewport WIDTH
    // changes. URL-bar show/hide only changes the height, so this still
    // never fights the user for the open menu.
    let lastViewportWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth !== lastViewportWidth) {
            lastViewportWidth = window.innerWidth;
            closeMenu();
        }
    });

    links.forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            const wasOverlay = menu.classList.contains('is-open');
            closeMenu();
            // Drive the scroll explicitly instead of the native anchor jump.
            // When the tap came from the full-screen mobile overlay, jump
            // instantly: unlocking body scroll in the same interaction
            // cancels an in-flight smooth animation on mobile browsers,
            // which intermittently left the page exactly where it was.
            // The jump avoids scrollIntoView entirely — some engines throw
            // on unknown ScrollBehavior enum values ('instant'), and CSS
            // scroll-behavior:smooth would hijack plain scrollTo — so it
            // suspends the CSS smoothing and uses coordinate scrollTo.
            // Any failure falls back to the browser's own hash navigation.
            if (target) {
                e.preventDefault();
                try {
                    if (wasOverlay) {
                        const html = document.documentElement;
                        html.style.scrollBehavior = 'auto';
                        const y = target.getBoundingClientRect().top + window.scrollY;
                        window.scrollTo(0, y);
                        setTimeout(() => { html.style.scrollBehavior = ''; }, 80);
                    } else {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } catch (err) {
                    location.hash = link.getAttribute('href');
                }
            }
        });
    });
}

// ---------- Reveal on scroll ----------
// Content is visible by default. The hidden/animated state is enabled
// only after adding html.js-reveal, and it is rolled back automatically
// if IntersectionObserver never delivers entries (broken/embedded
// environments), so content can never be stuck invisible.
function initReveal() {
    const items = [...document.querySelectorAll('.reveal')];
    if (!items.length || !('IntersectionObserver' in window)) return;

    let ioAlive = false;
    const io = new IntersectionObserver(entries => {
        ioAlive = true;
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                io.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    // Enable the hidden state, then observe. A working observer always
    // delivers an initial batch of entries right away.
    document.documentElement.classList.add('js-reveal');
    items.forEach(el => io.observe(el));

    setTimeout(() => {
        if (!ioAlive) {
            document.documentElement.classList.remove('js-reveal');
            io.disconnect();
        }
    }, 800);
}

// ---------- Animated counters (about stats) ----------
function initCounters() {
    const nums = [...document.querySelectorAll('.stat-num')];
    if (!nums.length) return;

    function animate(el) {
        const target = parseInt(el.dataset.count, 10);
        const t0 = performance.now();
        const DUR = 1600;
        (function step(now) {
            const p = Math.min((now - t0) / DUR, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased);
            if (p < 1) requestAnimationFrame(step);
        })(t0);
        // Guarantee the final value even if rAF is throttled
        setTimeout(() => { el.textContent = target; }, DUR + 200);
    }

    let started = false;
    function startAll() {
        if (started) return;
        started = true;
        nums.forEach(animate);
        io && io.disconnect();
    }

    let io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(entries => {
            if (entries.some(e => e.isIntersecting)) startAll();
        }, { threshold: 0.4 });
        nums.forEach(el => io.observe(el));
    }
    // Fallback: make sure the numbers are filled in regardless
    setTimeout(startAll, 4000);
}

// ---------- Awards : film strip → screen projection ----------
const POSTER_BASE = 'https://raw.githubusercontent.com/marisol2727/my-website-images/main/';
const AWARDS = [
    {
        festival: 'Torino Film Festival',
        title: '토리노국제영화제 대상 · 비평가상 · 관객상',
        film: '벌이 날다 Flight of the Bee · 1998',
        youtube: 'j48KDHmO0sE',
        poster: POSTER_BASE + '%EB%B2%8C%EC%9D%B4%20%EB%82%A0%EB%8B%A4%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '벌이 날다 포스터',
        meta: '이탈리아 토리노 · 1982년 창설 · 유럽 독립영화의 관문',
        desc: '베니스와 함께 이탈리아를 대표하는 영화제로, 새로운 시네아스트의 발견에 주력해 왔다. 데뷔작 <벌이 날다>는 대상·비평가상·관객상을 동시에 수상 — 심사위원과 평단, 관객의 마음을 한 작품이 모두 얻어낸 이례적인 기록이다. 봉준호 감독이 <살인의 추억>으로 이곳의 대상을 받기 5년 전의 일이다.',
        directors: [
            { name: '봉준호', note: '살인의 추억 · 2003 대상' },
            { name: '데이비드 고든 그린', note: '조지 워싱턴 · 2000 대상' },
            { name: '데브라 그래닉', note: '윈터스 본 · 2010 대상' }
        ]
    },
    {
        festival: 'Thessaloniki International Film Festival',
        title: '테살로니키국제영화제 은상',
        film: '벌이 날다 Flight of the Bee · 1998',
        poster: POSTER_BASE + '%EB%B2%8C%EC%9D%B4%20%EB%82%A0%EB%8B%A4%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '벌이 날다 포스터',
        meta: '그리스 테살로니키 · 1960년 창설 · 발칸반도 최대 영화제',
        desc: '남동유럽에서 가장 오래된 국제영화제로, 최고상의 이름은 도시의 영웅에게서 따온 \'황금 알렉산더\'다. 신인 감독의 첫·두 번째 작품을 경쟁에 초청하는 전통 덕에 \'새로운 시선의 산실\'로 불린다. 데뷔작으로 이 무대의 은상을 받으며 유럽 평단에 이름을 새겼다.',
        directors: [
            { name: '테오 앙겔로풀로스', note: '영화제와 평생을 함께한 그리스의 거장' }
        ]
    },
    {
        festival: 'FilmFestival Cottbus',
        title: '코트부스영화제 예술공헌상',
        film: '벌이 날다 Flight of the Bee · 1999',
        poster: POSTER_BASE + '%EB%B2%8C%EC%9D%B4%20%EB%82%A0%EB%8B%A4%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '벌이 날다 포스터',
        meta: '독일 코트부스 · 1991년 창설 · 동유럽 영화 전문',
        desc: '베를린영화제와 함께 독일이 동유럽 영화를 만나는 가장 중요한 창구. 러시아 국립영화대학(VGIK)에서 수학하며 중앙아시아의 빛과 호흡을 배운 감독의 미학이, 동유럽 영화의 본고장에서 \'예술적 공헌\'으로 공인받았다.',
        directors: []
    },
    {
        festival: 'Kinoshock — Anapa International Film Festival',
        title: '아나파국제영화제 감독상',
        film: '벌이 날다 Flight of the Bee · 1999',
        poster: POSTER_BASE + '%EB%B2%8C%EC%9D%B4%20%EB%82%A0%EB%8B%A4%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '벌이 날다 포스터',
        meta: '러시아 아나파 · 흑해 연안 · CIS권 대표 영화제',
        desc: '흑해의 휴양도시 아나파에서 열리는 구소련(CIS) 국가들의 대표 영화제 \'키노쇼크\'. 모스크바 유학 시절을 보낸 감독에게 이 감독상은 영화적 모국어를 배운 땅이 보낸 인정과도 같았다.',
        directors: []
    },
    {
        festival: 'Karlovy Vary International Film Festival',
        title: '카를로비바리국제영화제 특별언급상 · 비평가상',
        film: '괜찮아, 울지마 Let\'s Not Cry · 2002',
        poster: POSTER_BASE + '%EA%B4%9C%EC%B0%AE%EC%95%84%20%EC%9A%B8%EC%A7%80%EB%A7%88.jpg',
        posterAlt: '괜찮아, 울지마 포스터',
        meta: '체코 카를로비바리 · 1946년 창설 · FIAPF 공인 최상위 경쟁영화제',
        desc: '칸·베를린·베니스와 나란히 국제영화제작자연맹(FIAPF)이 공인한 세계 최정상급 경쟁영화제이자, 1946년 시작된 중동부 유럽에서 가장 오래된 영화제. 두 번째 장편 <괜찮아, 울지마>가 경쟁 부문에 올라 특별언급과 비평가상을 함께 받았다.',
        directors: [
            { name: '켄 로치', note: '케스 · 1970 크리스털 글로브 대상' },
            { name: '밀로시 포르만', note: '체코가 낳은 거장 · 영화제의 상징' }
        ]
    },
    {
        festival: 'Busan IFF — Pusan Promotion Plan',
        title: '부산국제영화제 PPP 코닥상',
        film: '포도나무를 베어라 Cut the Vine · 2004',
        youtube: '3qS2p7Dsano',
        poster: POSTER_BASE + '%ED%8F%AC%EB%8F%84%EB%82%98%EB%AC%B4%EB%A5%BC%20%EB%B2%A0%EC%96%B4%EB%9D%BC%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '포도나무를 베어라 포스터',
        meta: '대한민국 부산 · 아시아 예술영화 기획 마켓',
        desc: '부산프로모션플랜(PPP, 현 아시아프로젝트마켓)은 아시아 예술영화의 기획과 투자를 잇는 산실로, 아시아 거장들의 초기 걸작들이 이곳을 거쳐 세상에 나왔다. <포도나무를 베어라>는 기획 단계에서 작품성을 인정받아 코닥상을 수상했고, 완성 후 카를로비바리 경쟁 부문에 진출했다.',
        directors: [
            { name: '지아장커', note: '플랫폼 · PPP가 배출한 대표작' }
        ]
    },
    {
        festival: 'Marie Claire Film Festival · KOFA · Catholic Mass-Com Award',
        title: '마리클레르영화제 특별상 · 한국영상자료원 올해의 영화 · 한국가톨릭매스컴상',
        film: '터치 Touch · 2012',
        youtube: 'CYGv8v8re2o',
        poster: POSTER_BASE + '%ED%84%B0%EC%B9%98%ED%8F%AC%EC%8A%A4%ED%84%B0.webp',
        posterAlt: '터치 포스터',
        meta: '대한민국 · 2012년 · 세 개의 시선이 기억한 영화',
        desc: '스크린 독과점에 항의하며 감독 스스로 극장에서 영화를 내린 문제작 <터치>. 그러나 평단은 이 영화를 잊지 않았다. 한국영상자료원이 \'올해의 영화\'로 기록했고, 마리클레르영화제 특별상과 한국가톨릭매스컴상이 뒤를 이었다.',
        directors: []
    },
    {
        festival: 'JEONJU International Film Festival',
        title: '전주국제영화제 한국단편경쟁 감독상',
        film: '가면과 거울 Mask and Mirror · 2013',
        poster: POSTER_BASE + '%EA%B0%80%EB%A9%B4%EA%B3%BC%20%EA%B1%B0%EC%9A%B8.png',
        posterAlt: '가면과 거울 포스터',
        meta: '대한민국 전주 · 2000년 창설 · 대안·독립영화의 최전선',
        desc: '\'디지털 프로젝트\'로 세계적 작가들과 함께해 온 대안 영화의 요람, 전주. 한국 1세대 신사실파 화가 백영수 화백의 삶을 담은 단편 <가면과 거울>로 한국단편경쟁 감독상을 받았다 — 화가를 향한 아티스트 시리즈가 영화제의 공인을 얻은 순간.',
        directors: [
            { name: '지아장커', note: '공공장소 · 전주 디지털 프로젝트' },
            { name: '페드로 코스타', note: '전주 디지털 프로젝트' },
            { name: '클레르 드니', note: '전주 디지털 프로젝트' }
        ]
    },
    {
        festival: 'Daejeon MBC Art & Media Award',
        title: '대전MBC 아트&미디어대전 입선',
        film: '생명의 바다 Sea of Life · 2023',
        poster: null,
        posterAlt: '',
        youtube: '2toEIsvEQq8',
        meta: '대한민국 대전 · 미디어아트 부문',
        desc: '영화감독에서 미디어아트 작가로 — 확장된 캔버스에 대한 첫 공인. 제주 바다의 빛과 물결을 담은 영상 설치 <생명의 바다>로 입선하며, 스크린 밖에서도 \'치유와 위로\'의 작업이 이어지고 있음을 증명했다.',
        directors: []
    },
    {
        festival: 'Busan IFF — Wide Angle',
        title: '제28회 부산국제영화제 와이드 앵글 공식 초청',
        film: '약속 Promise · 2023',
        youtube: 'cI3KVe5PVZI',
        poster: POSTER_BASE + '%EC%95%BD%EC%86%8D_%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '약속 포스터',
        meta: '대한민국 부산 · 아시아 최대 영화제 · 다큐멘터리 쇼케이스',
        desc: '아시아 최대 영화제 부산이 다큐멘터리 쇼케이스의 월드 프리미어로 <약속>을 공식 초청했다. 와이드 앵글은 다큐멘터리와 단편의 최전선을 소개하는 부산의 대표 섹션 — 가장 사적인 영화가 가장 큰 무대에서 처음 관객을 만났다.',
        directors: [
            { name: '허우샤오시엔', note: '부산과 각별한 아시아 거장' },
            { name: '고레에다 히로카즈', note: '부산이 사랑해 온 이름' }
        ]
    }
];

const LAUREL_SVG = '<svg width="30" height="22" viewBox="0 0 30 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path d="M9 21C4.5 18.5 2 13.5 3 8c1.8 1 3 2.8 3.3 5M6 5c1.6 1.2 2.5 3.2 2.4 5.4M9.5 2.5c1.3 1.4 1.9 3.4 1.6 5.4" stroke="#c9a962" stroke-width="1.1" stroke-linecap="round"/>'
    + '<path d="M21 21c4.5-2.5 7-7.5 6-13-1.8 1-3 2.8-3.3 5M24 5c-1.6 1.2-2.5 3.2-2.4 5.4M20.5 2.5c-1.3 1.4-1.9 3.4-1.6 5.4" stroke="#c9a962" stroke-width="1.1" stroke-linecap="round"/>'
    + '</svg>';

function initAwards() {
    const strip = document.getElementById('filmStrip');
    const screen = document.getElementById('awardScreen');
    if (!strip || !screen) return;
    const frames = [...strip.querySelectorAll('.film-frame')];

    function render(i) {
        const a = AWARDS[i];
        if (!a) return;
        frames.forEach((f, k) => {
            f.classList.toggle('is-active', k === i);
            f.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
        const posterHtml = a.youtube
            ? '<a class="screen-poster is-video yt-lite" href="https://www.youtube.com/watch?v=' + a.youtube
              + '" data-yt="' + a.youtube + '" aria-label="' + a.title + ' 영상 재생">'
              + '<img src="https://img.youtube.com/vi/' + a.youtube + '/hqdefault.jpg" alt="'
              + (a.posterAlt || a.title) + '" loading="lazy"><span class="play"></span></a>'
            : a.poster
            ? '<div class="screen-poster"><img src="' + a.poster + '" alt="' + a.posterAlt + '" loading="lazy"></div>'
            : '<div class="screen-poster is-empty"><span>MEDIA ART<br>INSTALLATION</span></div>';
        const chips = a.directors.map(d =>
            '<span class="director-chip"><em>' + d.name + '</em>' + d.note + '</span>'
        ).join('');
        const directorsHtml = chips
            ? '<div class="screen-directors"><h6>이 무대를 거쳐간 세계의 감독들</h6><div class="director-chips">' + chips + '</div></div>'
            : '';
        screen.innerHTML =
            '<div class="screen-inner">'
            + posterHtml
            + '<div class="screen-body">'
            + '<p class="screen-eyebrow">' + LAUREL_SVG + a.festival + '</p>'
            + '<h3 class="screen-title">' + a.title + '</h3>'
            + '<p class="screen-film">' + a.film + '</p>'
            + '<p class="screen-meta">' + a.meta + '</p>'
            + '<p class="screen-desc">' + a.desc + '</p>'
            + directorsHtml
            + '</div></div>';
    }

    frames.forEach(f => {
        f.addEventListener('click', () => render(parseInt(f.dataset.award, 10)));
    });
    render(0);
}

// ---------- Awards film strip : prev/next chevrons ----------
function initStripArrows() {
    const wrap = document.querySelector('.film-strip-wrap');
    const prev = document.querySelector('.strip-arrow-prev');
    const next = document.querySelector('.strip-arrow-next');
    if (!wrap || !prev || !next) return;

    function update() {
        const max = wrap.scrollWidth - wrap.clientWidth;
        prev.classList.toggle('is-hidden', wrap.scrollLeft <= 4);
        next.classList.toggle('is-hidden', wrap.scrollLeft >= max - 4);
    }
    // Animate with rAF instead of scrollBy({behavior:'smooth'}): smooth
    // scrolling is unreliable on this page (see the nav-link handler).
    function glide(delta) {
        const start = wrap.scrollLeft;
        const target = Math.max(0, Math.min(start + delta, wrap.scrollWidth - wrap.clientWidth));
        const t0 = performance.now();
        const DUR = 450;
        (function frame(now) {
            const p = Math.min((now - t0) / DUR, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            wrap.scrollLeft = start + (target - start) * eased;
            if (p < 1) requestAnimationFrame(frame);
        })(t0);
        // Land on the target even if rAF is throttled (background tab),
        // and refresh arrow visibility in case scroll events were skipped
        setTimeout(() => { wrap.scrollLeft = target; update(); }, DUR + 100);
    }
    const step = () => Math.max(wrap.clientWidth * 0.75, 220);
    prev.addEventListener('click', () => glide(-step()));
    next.addEventListener('click', () => glide(step()));
    wrap.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

// ---------- Click-to-play YouTube embeds (no new tab, loads only on click) ----------
function initYouTubeLite() {
    document.addEventListener('click', e => {
        const trigger = e.target.closest('.yt-lite');
        if (!trigger || trigger.classList.contains('is-playing')) return;
        const id = trigger.dataset.yt;
        if (!id) return;
        e.preventDefault();
        trigger.classList.add('is-playing');
        trigger.innerHTML =
            '<iframe src="https://www.youtube-nocookie.com/embed/' + id
            + '?autoplay=1&rel=0&playsinline=1" title="YouTube video player"'
            + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
            + ' allowfullscreen></iframe>';
    });
}

// ---------- Generic category filter (filmography & archive) ----------
function initFilter(filterSelector, itemSelector) {
    const wrap = document.querySelector(filterSelector);
    if (!wrap) return;
    const buttons = wrap.querySelectorAll('.filter-btn');
    const items = document.querySelectorAll(itemSelector);

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            const filter = btn.dataset.filter;
            items.forEach(item => {
                const cats = (item.dataset.cat || '').split(/\s+/);
                const show = filter === 'all' || cats.includes(filter);
                item.classList.toggle('is-hidden', !show);
            });
        });
    });
}

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
    initVideoLite();
    initRadioModal();
    initC100Layout();
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

    const pending = new Set(items);
    const reveal = el => {
        el.classList.add('is-visible');
        pending.delete(el);
        io.unobserve(el);
    };

    let ioAlive = false;
    // threshold: 0 — reveal as soon as ANY part of the element touches the
    // viewport. A positive threshold like 0.1 can never be reached by an
    // element taller than ~10x the viewport (e.g. the 100-film list on a
    // phone, ~7000px tall), which left it stuck at opacity:0 — a black
    // screen on shorter phones. Zero works for elements of any height.
    const io = new IntersectionObserver(entries => {
        ioAlive = true;
        entries.forEach(e => {
            if (e.isIntersecting) reveal(e.target);
        });
    }, { threshold: 0, rootMargin: '0px 0px -30px 0px' });

    // Enable the hidden state, then observe. A working observer always
    // delivers an initial batch of entries right away.
    document.documentElement.classList.add('js-reveal');
    items.forEach(el => io.observe(el));

    // Fallback 1: if the observer never delivers any entry at all (broken /
    // embedded environments), roll the hidden state back so nothing stays
    // invisible.
    setTimeout(() => {
        if (!ioAlive) {
            document.documentElement.classList.remove('js-reveal');
            io.disconnect();
        }
    }, 800);

    // Fallback 2: some mobile browsers fire the initial batch but then miss
    // updates during fast momentum scrolling, which can leave sections below
    // the fold hidden. A scroll/resize check reveals anything whose top has
    // entered the viewport, so content can never stay black — while still
    // animating in as the reader scrolls to it. Throttled by timestamp rather
    // than requestAnimationFrame, which is paused in background tabs and some
    // low-power modes (where rAF-based reveals would never run).
    let lastCheck = 0;
    function check() {
        if (!pending.size) {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            return;
        }
        const vh = window.innerHeight;
        [...pending].forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.top < vh - 30 && r.bottom > 0) reveal(el);
        });
    }
    function onScroll() {
        const now = Date.now();
        if (now - lastCheck < 100) return;
        lastCheck = now;
        check();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // One check after layout settles, in case anything is already in view.
    setTimeout(check, 60);
}

// ---------- Stats numbers (about section) ----------
// Previously animated as a count-up triggered by scroll position, but that
// depended on IntersectionObserver/scroll-timing behavior that proved
// inconsistent across phones (numbers already finished before the reader
// scrolled there, or didn't restart correctly). Showing the final numbers
// directly removes that failure mode entirely.
function initCounters() {
    document.querySelectorAll('.stat-num').forEach(el => {
        el.textContent = el.dataset.count;
    });
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
        photos: [
            { src: 'images/torino_award_1.jpg', alt: '토리노국제영화제 수상 현장 사진 1' },
            { src: 'images/torino_award_2.jpg', alt: '토리노국제영화제 수상 현장 사진 2' },
            { src: 'images/torino_award_3.jpg', alt: '토리노국제영화제 수상 현장 사진 3' }
        ],
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
            { name: '테오 앙겔로풀로스', note: '영화제와 평생을 함께한 그리스의 거장' },
            { name: '김태용', note: '가족의 탄생 · 2006 황금 알렉산더상' }
        ]
    },
    {
        festival: 'FilmFestival Cottbus',
        title: '코트부스영화제 예술공헌상 · 관객상',
        film: '벌이 날다 Flight of the Bee · 1999',
        poster: POSTER_BASE + '%EB%B2%8C%EC%9D%B4%20%EB%82%A0%EB%8B%A4%20%ED%8F%AC%EC%8A%A4%ED%84%B0.jpg',
        posterAlt: '벌이 날다 포스터',
        meta: '독일 코트부스 · 1991년 창설 · 동유럽 영화 전문',
        desc: '베를린영화제와 함께 독일이 동유럽 영화를 만나는 가장 중요한 창구. 러시아 국립영화대학(VGIK)에서 수학하며 중앙아시아의 빛과 호흡을 배운 감독의 미학이, 동유럽 영화의 본고장에서 \'예술적 공헌\'으로 공인받았고, 관객상까지 더해지며 평단과 관객의 마음을 함께 얻었다.',
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
        festival: 'Thessaloniki International Film Festival',
        title: '테살로니키국제영화제 예술공헌상',
        film: '괜찮아, 울지마 Let\'s Not Cry · 2001',
        poster: POSTER_BASE + '%EA%B4%9C%EC%B0%AE%EC%95%84%20%EC%9A%B8%EC%A7%80%EB%A7%88.jpg',
        posterAlt: '괜찮아, 울지마 포스터',
        meta: '그리스 테살로니키 · 데뷔작 은상에 이은 두 번째 인연',
        desc: '데뷔작 <벌이 날다>에 은상을 안겼던 테살로니키가, 두 번째 장편 <괜찮아, 울지마>에는 예술공헌상으로 화답했다. 한 신인의 발견이 우연이 아니라 작가의 탄생이었음을, 같은 무대가 두 번에 걸쳐 증명한 셈이다.',
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
        videos: [
            { src: 'https://trailer.koreafilm.or.kr/MK002771_P02.mp4', tag: 'MAKING FILM', label: '괜찮아, 울지마 — 메이킹 영상 · 한국영상자료원 KMDB' }
        ],
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
        videos: [
            { src: 'https://trailer.koreafilm.or.kr/MK002317_P02.mp4', tag: 'MAKING FILM', label: '포도나무를 베어라 — 메이킹 영상 · 한국영상자료원 KMDB' },
            { src: 'https://trailer.koreafilm.or.kr/MK002318_P02.mp4', tag: 'PREMIERE', label: '포도나무를 베어라 — 시사회 영상 · 한국영상자료원 KMDB' }
        ],
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
        const photosHtml = (a.photos && a.photos.length)
            ? '<div class="screen-photos">' + a.photos.map(p =>
                '<a href="' + p.src + '" target="_blank" rel="noopener">'
                + '<img src="' + p.src + '" alt="' + p.alt + '" loading="lazy"></a>'
              ).join('') + '</div>'
            : '';
        const clipsHtml = (a.videos && a.videos.length)
            ? '<div class="screen-clips">' + a.videos.map(v =>
                '<a class="screen-clip vid-lite" href="' + v.src + '" data-src="' + v.src
                + '" aria-label="' + v.label + ' 재생">'
                + '<span class="clip-thumb">'
                + (a.poster ? '<img src="' + a.poster + '" alt="" loading="lazy">' : '')
                + '<span class="clip-tag">' + v.tag + '</span><span class="play"></span></span>'
                + '<span class="clip-label">' + v.label + '</span></a>'
              ).join('') + '</div>'
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
            + '</div>'
            + photosHtml
            + clipsHtml
            + '</div>';
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
// YouTube rejects embed requests that arrive without a Referer header
// (player error 153). Pages opened straight from the file system (file://)
// can never send one, so there the poster links out to YouTube instead of
// embedding. Served over http(s) — local server or GitHub Pages — the
// explicit referrerpolicy guarantees the origin is sent and playback works.
function initYouTubeLite() {
    document.addEventListener('click', e => {
        const trigger = e.target.closest('.yt-lite');
        if (!trigger || trigger.classList.contains('is-playing')) return;
        const id = trigger.dataset.yt;
        if (!id) return;
        if (location.protocol === 'file:') {
            trigger.setAttribute('target', '_blank');
            trigger.setAttribute('rel', 'noopener');
            return;
        }
        e.preventDefault();
        trigger.classList.add('is-playing');
        trigger.innerHTML =
            '<iframe src="https://www.youtube.com/embed/' + id
            + '?autoplay=1&rel=0&playsinline=1" title="YouTube video player"'
            + ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"'
            + ' referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
    });
}

// ---------- Click-to-play KMDB mp4 clips (loads only on click) ----------
function initVideoLite() {
    document.addEventListener('click', e => {
        const trigger = e.target.closest('.vid-lite');
        if (!trigger || trigger.classList.contains('is-playing')) return;
        const src = trigger.dataset.src;
        if (!src) return;
        e.preventDefault();
        trigger.classList.add('is-playing');
        const thumb = trigger.querySelector('.clip-thumb');
        thumb.innerHTML = '<video src="' + src + '" controls autoplay playsinline preload="metadata"></video>';
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


// ---------- Radio replay modal : every episode left on the cpbc podcast ----------
// d: broadcast date · dur: running time · desc: films covered that day
// (cpbc metadata stops listing films after mid-November 2019) · url: cpbc mp3
const RADIO_EPISODES = [
    { d: '2018. 12. 1', dur: '29:32', desc: '〈인히어런트 바이스〉 〈수성못〉 〈연애의 목적〉, 그리고 〈글루미 선데이〉의 음악 — 팟캐스트에 남은 가장 오래된 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_20825c25f4c2873cb799f49c6897f002-1670225361784.mp3?vod_id=C0000008481&podcast_id=P0000000001' },
    { d: '2018. 12. 8', dur: '27:25', desc: '〈무현, 두 도시 이야기〉 〈레이디 버드〉와 독립영화 이야기.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_d4b7ab72ba62927bb15d4305a2c3d972-1670225365683.mp3?vod_id=C0000008481&podcast_id=P0000000002' },
    { d: '2018. 12. 15', dur: '30:38', desc: '〈화차〉 〈친절한 금자씨〉 〈그날, 바다〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_a4b3d7032c2e0922aecba5f744ffe5a7-1670225368180.mp3?vod_id=C0000008481&podcast_id=P0000000003' },
    { d: '2018. 12. 22', dur: '28:29', desc: '〈포레스트 검프〉 〈플로리다 프로젝트〉 〈퍼스트맨〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_65991b0edbd2269eb30bd64fcb4fc812-1670225371014.mp3?vod_id=C0000008481&podcast_id=P0000000004' },
    { d: '2018. 12. 29', dur: '31:55', desc: '〈소공녀〉 〈잉여들의 히치하이킹〉 〈윈드 리버〉로 배웅한 한 해의 끝.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_92306eedd15d1c0c43554be6ebfc2b26-1670225374037.mp3?vod_id=C0000008481&podcast_id=P0000000005' },
    { d: '2019. 1. 5', dur: '28:28', desc: '새해 첫 방송 — 음악영화 〈어거스트 러쉬〉 〈싱 스트리트〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_81ad525d255fbecdd4bb295e6e7421d7-1670225376988.mp3?vod_id=C0000008481&podcast_id=P0000000006' },
    { d: '2019. 1. 12', dur: '26:46', desc: '〈송원〉 〈말할 수 없는 비밀〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_71c1505ee01c23d61430c844b048b57d-1670225379615.mp3?vod_id=C0000008481&podcast_id=P0000000007' },
    { d: '2019. 1. 19', dur: '23:23', desc: '〈까밀 리와인드〉 〈투모로우〉 〈송 투 송〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_236b64060c566b7db669a0ae4b2b9875-1670225382076.mp3?vod_id=C0000008481&podcast_id=P0000000008' },
    { d: '2019. 1. 26', dur: '29:09', desc: '〈스타 이즈 본〉 〈보헤미안 랩소디〉 — 음악이 된 영화들.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_8372bd5c806513640ee1c94ada8e896c-1670225384230.mp3?vod_id=C0000008481&podcast_id=P0000000009' },
    { d: '2019. 2. 2', dur: '30:14', desc: '〈사랑도 통역이 되나요?〉 〈아파트 열쇠를 빌려드립니다〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_18aa6795cc58b5b03b918f5e68327be6-1670225386859.mp3?vod_id=C0000008481&podcast_id=P0000000010' },
    { d: '2019. 2. 9', dur: '30:54', desc: '〈서치〉 〈퍼스트맨〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_845db17679b3f764b190b67dd1006032-1670225389585.mp3?vod_id=C0000008481&podcast_id=P0000000011' },
    { d: '2019. 2. 16', dur: '31:55', desc: '왕가위의 〈중경삼림〉 〈아비정전〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_bc96041ba2f0ff2d70639feb329a6836-1670225392362.mp3?vod_id=C0000008481&podcast_id=P0000000012' },
    { d: '2019. 2. 23', dur: '27:46', desc: '〈칠드런 오브 맨〉 〈오두막〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_66e1e7685426bcb7c2b6069971dc86e7-1670225395268.mp3?vod_id=C0000008481&podcast_id=P0000000013' },
    { d: '2019. 3. 2', dur: '29:16', desc: '〈자이언트〉 〈리플리〉 〈젊은이의 양지〉 — 고전 할리우드의 얼굴들.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_0157c18f30028d7873b4fa7582022f11-1670225397771.mp3?vod_id=C0000008481&podcast_id=P0000000014' },
    { d: '2019. 3. 9', dur: '26:07', desc: '〈인사이드 잡〉 〈국가부도의 날〉 〈스플릿〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_3c4662437584f9fb1e188ee890e281fa-1670225401189.mp3?vod_id=C0000008481&podcast_id=P0000000015' },
    { d: '2019. 3. 16', dur: '27:49', desc: '〈비포 선라이즈〉 〈국화꽃 향기〉 〈와이키키 브라더스〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_c223e6dc58eb95f3a879c825af1f5ff3-1670225403911.mp3?vod_id=C0000008481&podcast_id=P0000000016' },
    { d: '2019. 3. 23', dur: '25:57', desc: '\'사랑이 찾아온 여름\'을 주제로 한 영화와 음악.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_f748b6ae637c20206138ef0a8c20d0a6-1670225406379.mp3?vod_id=C0000008481&podcast_id=P0000000017' },
    { d: '2019. 3. 30', dur: '33:32', desc: '나딘 라바키의 〈가버나움〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_386f93d1c64536d5c95afda274499b80-1670225408749.mp3?vod_id=C0000008481&podcast_id=P0000000018' },
    { d: '2019. 4. 6', dur: '34:40', desc: '\'응답\'을 주제로 한 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_e4044f896631a358133265938d0190b4-1670225411776.mp3?vod_id=C0000008481&podcast_id=P0000000019' },
    { d: '2019. 4. 13', dur: '31:35', desc: '\'삶과 죽음\'을 주제로 한 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_3ec4231ba06858895605fc4a24df7311-1670225414821.mp3?vod_id=C0000008481&podcast_id=P0000000020' },
    { d: '2019. 4. 20', dur: '29:23', desc: '\'행복\'을 주제로 — 〈더 페이버릿: 여왕의 여자〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_8c62a7c12ee5bc525dc1840bd5bf07f3-1670225417747.mp3?vod_id=C0000008481&podcast_id=P0000000021' },
    { d: '2019. 4. 27', dur: '35:00', desc: '〈그린 북〉 〈덤 앤 더머〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_c851af813d0b82784133de2a847be11a-1670225420471.mp3?vod_id=C0000008481&podcast_id=P0000000022' },
    { d: '2019. 5. 4', dur: '33:13', desc: '\'헌신\'을 주제로 — 〈더 와이프〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_437330f3648211915e3c1ce858cc5ef2-1670225423804.mp3?vod_id=C0000008481&podcast_id=P0000000023' },
    { d: '2019. 5. 11', dur: '17:14', desc: '클린트 이스트우드의 〈그랜 토리노〉 〈라스트 미션〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_569d8d020dd1615c7513d61fa96b1b90-1670225427547.mp3?vod_id=C0000008481&podcast_id=P0000000024' },
    { d: '2019. 5. 18', dur: '17:30', desc: '\'탐욕\'을 주제로 — 〈케빈에 대하여〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_f5d0768650a6a1f7c00e98580c929217-1670225429586.mp3?vod_id=C0000008481&podcast_id=P0000000025' },
    { d: '2019. 5. 25', dur: '18:39', desc: '\'성장\'을 주제로 — 〈보이후드〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_5842ccc5889e303c9be53a10b832027c-1670225431940.mp3?vod_id=C0000008481&podcast_id=P0000000026' },
    { d: '2019. 6. 1', dur: '29:35', desc: '\'공감\'을 주제로 — 〈기생충〉 〈살인의 추억〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_4db295f1b65dfe44fc7db8f6ba01b113-1670225433710.mp3?vod_id=C0000008481&podcast_id=P0000000027' },
    { d: '2019. 6. 8', dur: '21:32', desc: '\'말과 행동\'을 주제로 — 〈생일〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_2057a8c434b302a6bf9d0e545c66cb28-1670225436649.mp3?vod_id=C0000008481&podcast_id=P0000000028' },
    { d: '2019. 6. 15', dur: '28:37', desc: '\'고독\'을 주제로 — 민병훈 감독 자신의 〈괜찮아, 울지마〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_1fc8cc29f10768f1b3c7e9385ba5a91a-1670225439371.mp3?vod_id=C0000008481&podcast_id=P0000000029' },
    { d: '2019. 6. 22', dur: '19:34', desc: '\'공감\'을 주제로 — 〈폭스캐처〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_f7dc7dfe9cd58e1a063890dacf536e23-1670225442002.mp3?vod_id=C0000008481&podcast_id=P0000000030' },
    { d: '2019. 6. 29', dur: '16:41', desc: '\'내일\'을 주제로 — 〈엘리자의 내일〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_74a1dff68509c19be1b5a972c0e66fba-1670225444239.mp3?vod_id=C0000008481&podcast_id=P0000000031' },
    { d: '2019. 7. 6', dur: '26:49', desc: '\'양심\'을 주제로 — 〈암수살인〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_cf12cb2ea0fe51bf0c2546b6d1746de1-1670225445993.mp3?vod_id=C0000008481&podcast_id=P0000000032' },
    { d: '2019. 7. 13', dur: '22:24', desc: '\'진실, 그날의 기억\'을 주제로 한 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_638be760b573c1ebee8e1ff2dd86571c-1670225464995.mp3?vod_id=C0000008481&podcast_id=P0000000040' },
    { d: '2019. 7. 20', dur: '20:09', desc: '압바스 키아로스타미의 〈내 친구의 집은 어디인가〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_bb2864ad19dfd525d3a7c11660fa5045-1670225463059.mp3?vod_id=C0000008481&podcast_id=P0000000039' },
    { d: '2019. 7. 27', dur: '18:27', desc: '타르코프스키의 〈희생〉 〈노스탤지어〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_d42edbab790d80d0f97a5d7708d3bc66-1670225461248.mp3?vod_id=C0000008481&podcast_id=P0000000038' },
    { d: '2019. 8. 3', dur: '23:31', desc: '다르덴 형제의 〈로제타〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_68265df683fe43c754908d0bc2d98df2-1670225459025.mp3?vod_id=C0000008481&podcast_id=P0000000037' },
    { d: '2019. 8. 10', dur: '22:32', desc: '〈맨체스터 바이 더 씨〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_fc62835cacd9698cfae10e475408be5e-1670225455893.mp3?vod_id=C0000008481&podcast_id=P0000000036' },
    { d: '2019. 8. 17', dur: '25:14', desc: '라즐로 네메스의 〈사울의 아들〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_70babdfd41da7ef6b6ad45ab2a2ddd47-1670225453581.mp3?vod_id=C0000008481&podcast_id=P0000000035' },
    { d: '2019. 8. 24', dur: '25:16', desc: '나딘 라바키의 〈가버나움〉, 다시 한번.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_6a3d193c4727709de29daa41acce20ae-1670225451119.mp3?vod_id=C0000008481&podcast_id=P0000000034' },
    { d: '2019. 8. 31', dur: '28:51', desc: '아스가르 파르하디의 〈씨민과 나데르의 별거〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_d0eb56773a2afdcdc598c2419f46659a-1670225448460.mp3?vod_id=C0000008481&podcast_id=P0000000033' },
    { d: '2019. 9. 7', dur: '29:03', desc: '누리 빌게 세일란의 〈우작〉 〈기후〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_dfa0e17e6b3a560d4f8cf394e57e7555-1670225471352.mp3?vod_id=C0000008481&podcast_id=P0000000042' },
    { d: '2019. 9. 14', dur: '21:50', desc: '〈배심원들〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_7b4850aee0665f6bd501fbca2c245904-1670225467156.mp3?vod_id=C0000008481&podcast_id=P0000000041' },
    { d: '2019. 9. 21', dur: '26:01', desc: '김윤석 감독 데뷔작 〈미성년〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_7e41d668ce54085b9bc4a966f191b2d4-1670225476140.mp3?vod_id=C0000008481&podcast_id=P0000000043' },
    { d: '2019. 9. 28', dur: '27:40', desc: '미키 데자키의 〈주전장〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_cc682c9c42aa3216cf1c70f4172412a6-1670225494538.mp3?vod_id=C0000008481&podcast_id=P0000000047' },
    { d: '2019. 10. 5', dur: '22:54', desc: '알리체 로르바커의 〈행복한 라짜로〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_297ed96d2b26ce2320f77f8eade44659-1670225490686.mp3?vod_id=C0000008481&podcast_id=P0000000046' },
    { d: '2019. 10. 12', dur: '30:25', desc: '윤가은의 〈우리집〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_206f2d950c38120790902c83ef728bc4-1670225484087.mp3?vod_id=C0000008481&podcast_id=P0000000045' },
    { d: '2019. 10. 19', dur: '26:34', desc: '알폰소 쿠아론의 〈로마〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_fec392da48904791627123af000ecc48-1670225479808.mp3?vod_id=C0000008481&podcast_id=P0000000044' },
    { d: '2019. 10. 26', dur: '25:07', desc: '〈김복동〉 〈노무현입니다〉 〈변호인〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_eb472b296a3a8eff05a46bee29386096-1670225498877.mp3?vod_id=C0000008481&podcast_id=P0000000048' },
    { d: '2019. 11. 2', dur: '22:56', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_58ef10f66ce68f542d358e79ec2a7c5f-1674030608654.mp3?vod_id=C0000008481&podcast_id=P0000000051' },
    { d: '2019. 11. 9', dur: '26:40', desc: '데이비드 린의 〈닥터 지바고〉.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_fdebad5958bd827f02134215a03dd28b-1670225506947.mp3?vod_id=C0000008481&podcast_id=P0000000050' },
    { d: '2019. 11. 16', dur: '29:04', desc: '토드 필립스의 〈조커〉, 힐두르 구드나도티르의 음악.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2022/12/C0000008481_16b924d6d9250eb5950627698ee8ccc6-1670225502424.mp3?vod_id=C0000008481&podcast_id=P0000000049' },
    { d: '2019. 11. 23', dur: '29:06', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_21dca7ac381cd5f71ca2dd113559166b-1674030609586.mp3?vod_id=C0000008481&podcast_id=P0000000052' },
    { d: '2019. 11. 30', dur: '27:55', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_90089e7f641af09e1dc91d4622a26060-1674030610768.mp3?vod_id=C0000008481&podcast_id=P0000000053' },
    { d: '2019. 12. 7', dur: '24:41', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_71e04d47545a7f11d0ec562fe2bf8098-1674030611791.mp3?vod_id=C0000008481&podcast_id=P0000000054' },
    { d: '2019. 12. 14', dur: '28:22', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_9ae3f490136bfedb9ea015297790b583-1674030612831.mp3?vod_id=C0000008481&podcast_id=P0000000055' },
    { d: '2019. 12. 21', dur: '22:48', desc: '성탄을 나흘 앞둔 토요일 오후의 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_03f21645fd18e766eb3f7b2b9e10ac28-1674030614861.mp3?vod_id=C0000008481&podcast_id=P0000000057' },
    { d: '2019. 12. 28', dur: '23:49', desc: '2019년의 마지막 토요일, 한 해를 배웅한 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_ad3bbe238e5a8b1ce6fff4691c3a8b64-1674030613952.mp3?vod_id=C0000008481&podcast_id=P0000000056' },
    { d: '2020. 1. 4', dur: '24:56', desc: '새로운 십 년을 여는 2020년 새해 첫 방송.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_5a3b5135b2ba3992845aa5c967990d53-1674030615730.mp3?vod_id=C0000008481&podcast_id=P0000000058' },
    { d: '2020. 1. 11', dur: '25:39', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_03e33b62ab768a2f8a093b8fd7cd1cce-1674030616593.mp3?vod_id=C0000008481&podcast_id=P0000000059' },
    { d: '2020. 1. 18', dur: '28:17', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_222c73a849066811c54b70e37cea0b13-1674030617603.mp3?vod_id=C0000008481&podcast_id=P0000000060' },
    { d: '2020. 1. 25', dur: '26:05', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_072f65de7b674edb32430c4c8dd94489-1674030618725.mp3?vod_id=C0000008481&podcast_id=P0000000061' },
    { d: '2020. 2. 1', dur: '26:17', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_7761e9df1654c40908594a9ccdf4e130-1674030619745.mp3?vod_id=C0000008481&podcast_id=P0000000062' },
    { d: '2020. 2. 8', dur: '26:50', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_a1f57234ddb61502a174a5609c1b0de9-1674030620594.mp3?vod_id=C0000008481&podcast_id=P0000000063' },
    { d: '2020. 2. 15', dur: '24:24', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_7673b85334c847ad9709e84211366019-1674030622608.mp3?vod_id=C0000008481&podcast_id=P0000000065' },
    { d: '2020. 2. 22', dur: '24:54', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_67cec3fb0db2115a9b8598889fa95ea9-1674030621630.mp3?vod_id=C0000008481&podcast_id=P0000000064' },
    { d: '2020. 2. 29', dur: '29:47', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_604b8685de8a30af585adb47b04f7391-1674030623607.mp3?vod_id=C0000008481&podcast_id=P0000000066' },
    { d: '2020. 3. 7', dur: '29:07', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_7143ed36f14068ac0035fb3d6c7a6c82-1674030624654.mp3?vod_id=C0000008481&podcast_id=P0000000067' },
    { d: '2020. 3. 14', dur: '29:25', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_f5528071dd1b58149f9d62fad7936414-1674030625724.mp3?vod_id=C0000008481&podcast_id=P0000000068' },
    { d: '2020. 3. 21', dur: '26:49', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_bf0d125dfb0e8e584f9710a0426ffc04-1674030626840.mp3?vod_id=C0000008481&podcast_id=P0000000069' },
    { d: '2020. 3. 28', dur: '30:05', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_e4c7e7636ed7e97abd0c88062c0a7a68-1674030627892.mp3?vod_id=C0000008481&podcast_id=P0000000070' },
    { d: '2020. 4. 4', dur: '26:23', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_f9d72c0f11431ae231ac8cc84a7a8dcb-1674030628872.mp3?vod_id=C0000008481&podcast_id=P0000000071' },
    { d: '2020. 4. 11', dur: '28:13', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_0495eb1ab06af4cf6c5ecc913d43c450-1674030629798.mp3?vod_id=C0000008481&podcast_id=P0000000072' },
    { d: '2020. 4. 18', dur: '32:27', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_076a01adb9ef09f273c7f171b43ce36d-1674030631094.mp3?vod_id=C0000008481&podcast_id=P0000000073' },
    { d: '2020. 4. 25', dur: '32:04', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_f61d643d2863f5b1fb16ba5ca5df2355-1674030632329.mp3?vod_id=C0000008481&podcast_id=P0000000074' },
    { d: '2020. 5. 2', dur: '24:21', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_ddef3adeceedb2ca939b7a64e0344f86-1674030633526.mp3?vod_id=C0000008481&podcast_id=P0000000075' },
    { d: '2020. 5. 9', dur: '27:47', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_aa171ec190d2b410c2856e6a53e26fd6-1674030634391.mp3?vod_id=C0000008481&podcast_id=P0000000076' },
    { d: '2020. 5. 16', dur: '29:57', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_585dd958148c24586ed2730c6e1b2038-1674030635561.mp3?vod_id=C0000008481&podcast_id=P0000000077' },
    { d: '2020. 5. 23', dur: '27:57', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_3727cc6eaa3a9e01447cf068de56b7e5-1674030637119.mp3?vod_id=C0000008481&podcast_id=P0000000078' },
    { d: '2020. 5. 30', dur: '28:34', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_11059c88288d42f397a9d0f140673400-1674030640035.mp3?vod_id=C0000008481&podcast_id=P0000000079' },
    { d: '2020. 6. 6', dur: '27:23', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_e82df15d414706709080b32172d971cb-1674030642163.mp3?vod_id=C0000008481&podcast_id=P0000000080' },
    { d: '2020. 6. 13', dur: '26:57', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_bb4fd8a5fae85f6e33280e984af91b6d-1674030643990.mp3?vod_id=C0000008481&podcast_id=P0000000081' },
    { d: '2020. 6. 20', dur: '23:29', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_80309ba2cbeea3129ea7095bdcdf16c6-1674030645683.mp3?vod_id=C0000008481&podcast_id=P0000000082' },
    { d: '2020. 6. 27', dur: '27:12', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_85014597e4095adfd10c2d38f157ac10-1674030647083.mp3?vod_id=C0000008481&podcast_id=P0000000083' },
    { d: '2020. 7. 4', dur: '24:18', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_cfdd5d6453644c7f283b8e962b460d1e-1674030648511.mp3?vod_id=C0000008481&podcast_id=P0000000084' },
    { d: '2020. 7. 11', dur: '25:47', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_c5a373133b87c94c4e70ba2669e7d3b4-1674030649538.mp3?vod_id=C0000008481&podcast_id=P0000000085' },
    { d: '2020. 7. 18', dur: '22:17', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_20bec7bf76551e9cbcbeb64193a1119f-1674030650768.mp3?vod_id=C0000008481&podcast_id=P0000000086' },
    { d: '2020. 7. 25', dur: '25:43', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_24a688ed1cf76bbb2a52edcc9a1e49a8-1674030651775.mp3?vod_id=C0000008481&podcast_id=P0000000087' },
    { d: '2020. 8. 1', dur: '23:30', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_433cc62ece17ef24b438e04fe7e36499-1674030653579.mp3?vod_id=C0000008481&podcast_id=P0000000088' },
    { d: '2020. 8. 8', dur: '22:30', desc: '', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_930fe0178aa08d0e786e95e8734707c1-1674030654829.mp3?vod_id=C0000008481&podcast_id=P0000000089' },
    { d: '2020. 8. 15', dur: '21:16', desc: '4년의 여정을 마무리한 고별 방송 — 마이크를 내려놓던 날.', url: 'https://podcast-aod.cpbc.co.kr/cpbfm/2023/01/C0000008481_cf449bb1080c6ed78dcb1590d26dfa05-1674030655759.mp3?vod_id=C0000008481&podcast_id=P0000000090' }
];

function initRadioModal() {
    const modal = document.getElementById('radioModal');
    const openBtn = document.getElementById('radioReplayBtn');
    const list = document.getElementById('radioModalList');
    if (!modal || !openBtn || !list) return;

    let built = false;
    function build() {
        if (built) return;
        built = true;
        let html = '';
        let year = '';
        RADIO_EPISODES.forEach((ep, i) => {
            const y = ep.d.slice(0, 4);
            if (y !== year) {
                year = y;
                html += '<h4 class="rm-year">' + y + '</h4>';
            }
            html += '<div class="rm-row" data-ep="' + i + '">'
                + '<span class="rm-date">' + ep.d + '</span>'
                + '<span class="rm-desc">' + (ep.desc || '토요일 오후 4시의 방송분') + '</span>'
                + '<span class="rm-dur">' + ep.dur + '</span>'
                + '<button type="button" class="rm-play" aria-label="' + ep.d + ' 방송 재생"></button>'
                + '<span class="rm-audio"></span>'
                + '</div>';
        });
        list.innerHTML = html;
    }

    function open() {
        build();
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const scroller = modal.querySelector('.radio-modal-scroll');
        if (scroller) scroller.scrollTop = 0;
    }
    function close() {
        modal.hidden = true;
        document.body.style.overflow = '';
        modal.querySelectorAll('audio').forEach(a => a.pause());
    }

    openBtn.addEventListener('click', open);
    modal.addEventListener('click', e => {
        if (e.target.closest('[data-close]')) { close(); return; }
        const btn = e.target.closest('.rm-play');
        if (!btn) return;
        const row = btn.closest('.rm-row');
        const ep = RADIO_EPISODES[parseInt(row.dataset.ep, 10)];
        if (!ep) return;
        // One voice at a time: pause every other episode first
        modal.querySelectorAll('audio').forEach(a => a.pause());
        const slot = row.querySelector('.rm-audio');
        if (!slot.querySelector('audio')) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.preload = 'none';
            audio.src = ep.url;
            slot.appendChild(audio);
        }
        row.classList.add('is-open');
        slot.querySelector('audio').play().catch(() => {});
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.hidden) close();
    });
}

// ---------- Cinema 100 : keep every entry exactly two lines ----------
// Default layout stacks title over credits (one line each). When either
// part wraps on its own — long titles, long country lists — the item is
// switched to a flowing paragraph that fills from the first line instead.
function initC100Layout() {
    const items = document.querySelectorAll('.c100-item');
    if (!items.length) return;

    // Title and credits render at different font sizes, so count each
    // span's lines against its own line-height instead of dividing the
    // container height by a single value.
    function lineCount(el) {
        const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
        return Math.round(el.getBoundingClientRect().height / lineHeight);
    }

    function layout() {
        items.forEach(item => {
            const title = item.querySelector('.c100-title');
            const meta = item.querySelector('.c100-meta');
            if (!title || !meta) return;
            item.classList.remove('c100-item--flow');
            if (lineCount(title) + lineCount(meta) > 2) {
                item.classList.add('c100-item--flow');
            }
        });
    }

    layout();
    // Web fonts change text metrics after they swap in
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

    let timer;
    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(layout, 150);
    });
}

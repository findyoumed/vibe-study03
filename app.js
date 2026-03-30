// [LOG: 20260330_1523] Configuration
const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1MmMyNTJmYTIyZmUwY2QyYzg1OGJhYmM0MTg3ZjQ1YyIsIm5iZiI6MTc3NDg0ODg1NS4xNTEsInN1YiI6IjY5Y2EwYjU3MWY5ZGY5NmE5MjczMmU3NyIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pPLEHFqcoIipm5v534ipHNI6FmW9nVkVm1O64gFszSY';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// [LOG: 20260330_1523] State Management
const state = {
    region: 'KR',
    language: 'ko-KR',
    genre: '',
    sortBy: 'popularity.desc',
    heroMovies: [],
    currentHeroIndex: 0,
    autoplayTimer: null,
    apiOptions: {
        method: 'GET',
        headers: {
            accept: 'application/json',
            Authorization: `Bearer ${ACCESS_TOKEN}`
        }
    }
};

/**
 * Fetch Utilities
 */
async function tmdbFetch(endpoint) {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, state.apiOptions);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error('Fetch Error:', err);
        return null;
    }
}

function getImg(path, size = 'w500') {
    return path ? `${IMAGE_BASE_URL}/${size}${path}` : 'https://via.placeholder.com/500x750?text=No+Image';
}

/**
 * [LOG: 20260330_1523] Row Navigation (Horizontal Scroll)
 */
function scrollRow(rowId, direction) {
    const wrapper = document.getElementById(`${rowId}-wrapper`);
    if (!wrapper) return;
    const scrollAmount = wrapper.clientWidth * 0.8; // Scroll 80% of visible area
    wrapper.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

/**
 * Hero Carousel Logic
 */
function updateHeroUI(index) {
    if (state.heroMovies.length === 0) return;
    state.currentHeroIndex = index;
    const movie = state.heroMovies[index];
    document.getElementById('hero-title').textContent = movie.title;
    document.getElementById('hero-overview').textContent = movie.overview || "상세 정보가 등록되지 않은 영화입니다.";
    document.getElementById('hero').style.backgroundImage = `url(${getImg(movie.backdrop_path, 'original')})`;
    const dots = document.querySelectorAll('.indicator-dot');
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
}

function createIndicators() {
    const container = document.getElementById('hero-indicators');
    container.innerHTML = '';
    state.heroMovies.forEach((_, i) => {
        const dot = document.createElement('div');
        dot.className = 'indicator-dot';
        if (i === state.currentHeroIndex) dot.classList.add('active');
        dot.onclick = () => { stopAutoplay(); updateHeroUI(i); startAutoplay(); };
        container.appendChild(dot);
    });
}

function nextHero() {
    if (state.heroMovies.length === 0) return;
    let nextIndex = (state.currentHeroIndex + 1) % state.heroMovies.length;
    updateHeroUI(nextIndex);
}

function startAutoplay() {
    stopAutoplay();
    state.autoplayTimer = setInterval(nextHero, 8000);
}

function stopAutoplay() {
    if (state.autoplayTimer) clearInterval(state.autoplayTimer);
}

/**
 * Movie Rendering
 */
function renderMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #888;">표시할 영화가 없습니다.</p>';
        return;
    }
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `<img src="${getImg(movie.poster_path)}" alt="${movie.title}" loading="lazy">`;
        card.onclick = () => {
            state.heroMovies = [movie, ...state.heroMovies.slice(0, 4)];
            createIndicators();
            updateHeroUI(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        container.appendChild(card);
    });
}

/**
 * [LOG: 20260330_1523] Data Fetching with Filters
 */
async function fetchGenres() {
    const data = await tmdbFetch(`/genre/movie/list?language=${state.language}`);
    if (data && data.genres) {
        const select = document.getElementById('genre-select');
        select.innerHTML = '<option value="">모든 장르</option>';
        data.genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            select.appendChild(opt);
        });
    }
}

async function refreshNowPlaying() {
    let url = `/discover/movie?page=1&region=${state.region}&with_release_type=2|3`;
    if (state.language) url += `&language=${state.language}`;
    if (state.genre) url += `&with_genres=${state.genre}`;
    url += `&sort_by=${state.sortBy}`;

    const data = await tmdbFetch(url);
    if (data && data.results.length > 0) {
        renderMovies(data.results, 'now-playing-row');
        state.heroMovies = data.results.slice(0, 5);
        createIndicators();
        updateHeroUI(0);
        startAutoplay();
    } else {
        renderMovies([], 'now-playing-row');
    }
}

async function refreshPopular() {
    let url = `/discover/movie?page=1&sort_by=popularity.desc`;
    if (state.language) url += `&language=${state.language}`;
    if (state.genre) url += `&with_genres=${state.genre}`;

    const data = await tmdbFetch(url);
    if (data && data.results.length > 0) renderMovies(data.results, 'popular-row');
}

/**
 * Initialize
 */
async function init() {
    // Buttons
    document.getElementById('hero-next').onclick = () => { stopAutoplay(); nextHero(); startAutoplay(); };
    document.getElementById('hero-prev').onclick = () => {
        stopAutoplay();
        state.currentHeroIndex = (state.currentHeroIndex - 1 + state.heroMovies.length) % state.heroMovies.length;
        updateHeroUI(state.currentHeroIndex);
        startAutoplay();
    };
    document.getElementById('btn-play').onclick = () => {
        const m = state.heroMovies[state.currentHeroIndex];
        if (m) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(m.title + ' 공식 예고편')}`, '_blank');
    };
    document.getElementById('btn-info').onclick = () => {
        const m = state.heroMovies[state.currentHeroIndex];
        if (m) window.open(`https://www.themoviedb.org/movie/${m.id}`, '_blank');
    };

    // Filters Setup
    document.getElementById('region-select').onchange = (e) => { state.region = e.target.value; refreshNowPlaying(); };
    document.getElementById('lang-select').onchange = (e) => {
        state.language = e.target.value;
        fetchGenres(); // Language affects genre names
        refreshNowPlaying(); refreshPopular();
    };
    document.getElementById('genre-select').onchange = (e) => { state.genre = e.target.value; refreshNowPlaying(); refreshPopular(); };
    document.getElementById('sort-select').onchange = (e) => { state.sortBy = e.target.value; refreshNowPlaying(); };

    // Search
    const searchInput = document.getElementById('movie-search');
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (!q) return;
            let url = `/search/movie?query=${encodeURIComponent(q)}&page=1`;
            if (state.language) url += `&language=${state.language}`;
            const data = await tmdbFetch(url);
            if (data && data.results.length > 0) {
                document.getElementById('search-section').classList.remove('hidden');
                renderMovies(data.results, 'search-row');
                state.heroMovies = [data.results[0], ...state.heroMovies.slice(0, 4)];
                createIndicators(); updateHeroUI(0);
                document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
            } else { alert('검색 결과가 없습니다.'); }
        }
    });

    // Global Events
    const hero = document.getElementById('hero');
    hero.onmouseenter = stopAutoplay;
    hero.onmouseleave = startAutoplay;
    window.onscroll = () => document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);

    // Initial Data
    await fetchGenres();
    await Promise.all([refreshNowPlaying(), refreshPopular()]);
}

// Global expose for onclick attributes in HTML
window.scrollRow = scrollRow;

document.addEventListener('DOMContentLoaded', init);

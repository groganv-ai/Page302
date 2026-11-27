// Custom domains use the same-origin API gateway. GitHub Pages uses an isolated test service.
(() => {
    // Approved surname assistance. Set false before this script to roll back without changing data.
    window.PAGE302_FUZZY_NAMES_ENABLED = window.PAGE302_FUZZY_NAMES_ENABLED ?? true;
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    const live = ['page302.co.uk', 'www.page302.co.uk', 'page302.uk', 'www.page302.uk'].includes(location.hostname);
    window.PAGE302_SCORES_API = window.PAGE302_SCORES_API || (local
        ? 'http://127.0.0.1:8787'
        : live ? location.origin : 'https://page302-scores-testing.vince-grogan-games.workers.dev');
})();

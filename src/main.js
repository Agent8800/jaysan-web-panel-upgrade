import './style.css'
import { renderSidebar } from './modules/layout.js'
import { initStock } from './modules/stock.js'
import { initBilling } from './modules/billing.js'
import { initInvoiceHistory } from './modules/invoice_history.js'
import { initRepairs } from './modules/repairs.js'
import { initRepairHistory } from './modules/repair_history.js'
import { initExpenditure } from './modules/expenditure.js'
import { initAnalytics } from './modules/analytics.js'
import { initStores } from './modules/stores.js' // New
import { initRequests } from './modules/requests.js' // New
import { checkAuth, renderLogin } from './modules/auth.js'

const app = document.querySelector('#app')
const loading = document.querySelector('#loading')

// State
let currentState = {
    view: 'dashboard',
    user: null
}

async function init() {
    try {
        // Check session
        const user = await checkAuth();

        if (!user) {
            loading.style.display = 'none';
            renderLogin(app);
            return;
        }

        currentState.user = user;

        // Simulate loading
        loading.style.display = 'none';
        renderApp();
    } catch (err) {
        console.error("Init failed:", err);
        loading.innerHTML = `<div class="text-red-500 font-bold text-xl">App Crashed: ${err.message}</div>`;
    }
}

function renderApp() {
    app.innerHTML = '';

    // Layout Shell
    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.className = 'w-64 h-full sidebar-glass flex-shrink-0 transition-all duration-300';

    const main = document.createElement('main');
    main.id = 'main-content';
    main.className = 'flex-1 h-full overflow-y-auto bg-background p-8';

    app.appendChild(sidebar);
    app.appendChild(main);

    // Initial Renders
    renderSidebar(sidebar, setCurrentView, currentState.user);
    navigateTo('dashboard');
}

function setCurrentView(view) {
    currentState.view = view;
    navigateTo(view);
}

function navigateTo(view) {
    const main = document.querySelector('#main-content');
    if (!main) return; // Safety check
    main.innerHTML = ''; // Clear current

    const user = currentState.user;

    switch (view) {
        case 'dashboard':
            initAnalytics(main, user);
            break;
        case 'stores': // New
            initStores(main, user);
            break;
        case 'stock':
            initStock(main, user);
            break;
        case 'requests': // New
            initRequests(main, user);
            break;
        case 'billing':
            initBilling(main, user);
            break;
        case 'invoices':
            initInvoiceHistory(main, user);
            break;
        case 'repairs':
            initRepairs(main, user);
            break;
        case 'repair-history':
            initRepairHistory(main, user);
            break;
        case 'expenditure':
            initExpenditure(main, user);
            break;
        default:
            main.innerHTML = '<h1 class="text-2xl">Page Not Found</h1>';
    }
}

init();

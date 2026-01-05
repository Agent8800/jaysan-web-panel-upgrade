import { Zap, Box, Receipt, Wrench, BarChart2, LogOut, LayoutList, GitPullRequest } from 'lucide';

export function renderSidebar(container, navigateCallback, user) {
    // Icons need to be lucide names as strings if we are using the CDN script, 
    // or we can just use SVG strings/components if we were in React.
    // Since we are vanilla and using lucide global, we will use data-lucide attributes.

    const isSuperAdmin = user.role === 'super_admin';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
        { id: 'stock', label: 'Stock Management', icon: 'box' },
        { id: 'requests', label: 'Stock Query (Requests)', icon: 'git-pull-request' }, // New
        { id: 'billing', label: 'New Invoice', icon: 'receipt' },
        { id: 'invoices', label: 'Invoice History', icon: 'file-text' },
        { id: 'expenditure', label: 'Expenditure', icon: 'wallet' },
        { id: 'repairs', label: 'Repair Board', icon: 'wrench' },
        { id: 'repair-history', label: 'All Repairs List', icon: 'clipboard-list' },
    ];

    if (isSuperAdmin) {
        // Insert Stores management at the top or appropriate place
        menuItems.splice(1, 0, { id: 'stores', label: 'All Stores', icon: 'layout-list' });
    }

    container.innerHTML = `
        <div class="p-6 flex items-center space-x-3 border-b border-slate-700/50">
            <div class="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
               <i data-lucide="zap" class="text-white w-5 h-5"></i>
            </div>
            <span class="font-bold text-lg tracking-wide">RepairCmd</span>
        </div>

        <nav class="mt-6 px-4 space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto">
            ${menuItems.map(item => `
                <button 
                    data-view="${item.id}"
                    class="nav-btn w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all duration-200 group"
                >
                    <i data-lucide="${item.icon}" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                    <span class="font-medium text-sm">${item.label}</span>
                </button>
            `).join('')}
        </nav>

        <div class="absolute bottom-0 w-full p-4 border-t border-slate-700/50 bg-slate-900">
             <div class="mb-4 px-2">
                <p class="text-xs text-slate-500 uppercase font-bold">Logged in as</p>
                <p class="text-sm text-white truncate" title="${user.email}">${user.email}</p>
                <p class="text-xs text-accent">${user.role === 'super_admin' ? 'Super Admin' : user.store_name || 'Store Admin'}</p>
             </div>
             <button id="logout-btn" class="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                <i data-lucide="log-out" class="w-5 h-5"></i>
                <span class="font-medium">Logout</span>
            </button>
        </div>
    `;

    // Re-initialize icons
    if (window.lucide) window.lucide.createIcons();

    // Event Listeners
    container.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Active state
            container.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('bg-accent', 'text-white', 'shadow-lg', 'shadow-accent/20');
                b.classList.add('text-slate-300');
            });
            btn.classList.add('bg-accent', 'text-white', 'shadow-lg', 'shadow-accent/20');
            btn.classList.remove('text-slate-300');

            navigateCallback(btn.dataset.view);
        });
    });

    // Logout
    const logoutBtn = container.querySelector('#logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                import('./auth.js').then(auth => auth.logout());
            }
        });
    }

    // Set active default
    const defaultBtn = container.querySelector('[data-view="dashboard"]');
    if (defaultBtn) defaultBtn.click();
}

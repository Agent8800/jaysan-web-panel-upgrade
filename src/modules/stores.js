import { supabase } from '../supabase.js';

export async function initStores(container, user) {
    // Security check (UI level, RLS handles backend)
    if (user.role !== 'super_admin') {
        container.innerHTML = '<div class="p-8 text-red-500">Access Denied</div>';
        return;
    }

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800">Store Management</h2>
                    <p class="text-sm text-slate-500">Manage store locations and access</p>
                </div>
                <button id="add-store-btn" class="btn-primary flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Store
                </button>
            </div>

            <div class="card overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                            <th class="p-4 font-semibold">Store Name</th>
                            <th class="p-4 font-semibold">Location</th>
                            <th class="p-4 font-semibold">Created At</th>
                            <th class="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="stores-tbody" class="text-slate-700 divide-y divide-slate-100">
                        <tr><td colspan="4" class="p-4 text-center">Loading stores...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Store Modal -->
        <div id="store-modal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[100] backdrop-blur-sm">
            <div class="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                <h3 id="store-modal-title" class="text-xl font-bold mb-4">Add Store</h3>
                <form id="store-form" class="space-y-4">
                    <input type="hidden" id="store-id">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                        <input type="text" id="store-name" required class="input-field" placeholder="e.g. Lucknow Store 1">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-slate-700 mb-1">Location / Address</label>
                         <input type="text" id="store-location" class="input-field" placeholder="e.g. Hazratganj, Lucknow">
                    </div>
                    <div class="flex justify-end gap-3 mt-6">
                        <button type="button" id="cancel-store" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Save Store</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const tbody = container.querySelector('#stores-tbody');
    const modal = container.querySelector('#store-modal');
    const form = container.querySelector('#store-form');
    let stores = [];

    async function fetchStores() {
        // Since we are Super Admin, we can see all stores
        const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching stores:', error);
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error loading stores</td></tr>`;
            return;
        }

        stores = data;
        renderTable(stores);
    }

    function renderTable(items) {
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-400">No stores found. Create one to get started.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(s => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4 font-medium text-slate-900">${s.name}</td>
                <td class="p-4">${s.location || '-'}</td>
                <td class="p-4 text-sm text-slate-500">${new Date(s.created_at).toLocaleDateString()}</td>
                <td class="p-4 text-right space-x-2">
                    <button class="edit-store-btn p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" data-id="${s.id}">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="delete-store-btn p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" data-id="${s.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    // Modal & Form Logic
    const openModal = (isEdit = false, data = null) => {
        document.querySelector('#store-modal-title').textContent = isEdit ? 'Edit Store' : 'Add Store';
        document.querySelector('#store-id').value = isEdit ? data.id : '';
        document.querySelector('#store-name').value = isEdit ? data.name : '';
        document.querySelector('#store-location').value = isEdit ? data.location : '';

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
    };

    container.querySelector('#add-store-btn').addEventListener('click', () => openModal(false));
    container.querySelector('#cancel-store').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.querySelector('#store-id').value;
        const name = document.querySelector('#store-name').value;
        const location = document.querySelector('#store-location').value;

        if (!name) return;

        let error;
        if (id) {
            const { error: err } = await supabase.from('stores').update({ name, location }).eq('id', id);
            error = err;
        } else {
            const { error: err } = await supabase.from('stores').insert([{ name, location }]);
            error = err;
        }

        if (error) {
            alert('Operation failed: ' + error.message);
        } else {
            closeModal();
            fetchStores();
        }
    });

    // Table Actions
    tbody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-store-btn');
        const deleteBtn = e.target.closest('.delete-store-btn');

        if (editBtn) {
            const store = stores.find(s => s.id === editBtn.dataset.id);
            openModal(true, store);
        }

        if (deleteBtn) {
            if (confirm('Delete this store? This will delete all associated products and data!')) {
                const { error } = await supabase.from('stores').delete().eq('id', deleteBtn.dataset.id);
                if (error) alert('Delete failed: ' + error.message);
                else fetchStores();
            }
        }
    });

    fetchStores();
}

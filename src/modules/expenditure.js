import { supabase } from '../supabase.js';


export async function initExpenditure(container, user) {
    const isStoreAdmin = !!user.store_id;
    const isSuperAdmin = user.role === 'super_admin';

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-3xl font-bold text-slate-800">Expenditure Management</h2>
                 ${isSuperAdmin ? `
                    <div class="flex items-center gap-4">
                        <select id="store-filter" class="input-field py-2 text-sm w-48 bg-white shadow-sm">
                            <option value="">All Stores</option>
                        </select>
                    </div>
                ` : ''}
            </div>

            <!-- Add Expenditure Form -->
            <div class="card p-6 bg-white shadow-lg rounded-xl relative overflow-hidden ${!isStoreAdmin ? 'opacity-60 pointer-events-none' : ''}">
                 ${!isStoreAdmin ? '<div class="absolute inset-0 z-10 cursor-not-allowed flex items-center justify-center"><span class="bg-white/80 px-4 py-2 rounded font-bold text-slate-500 shadow-sm">View Only: Super Admin cannot add expenses directly</span></div>' : ''}
                
                <div class="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 opacity-50 pointer-events-none"></div>

                <h3 class="font-bold text-lg text-slate-700 mb-4 flex items-center gap-2">
                    <i data-lucide="plus" class="w-5 h-5 text-purple-600"></i> New Expenditure
                </h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Basic Info -->
                    <div class="space-y-4">
                        <div>
                            <label class="label">Date</label>
                            <input type="date" id="exp-date" class="input-field" value="${new Date().toISOString().split('T')[0]}">
                        </div>

                        <div>
                            <label class="label">Type</label>
                            <div class="flex gap-4">
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="exp-type" value="Manual" checked class="text-purple-600 focus:ring-purple-500">
                                    <span class="text-sm font-medium text-slate-700">Manual Entry</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="exp-type" value="Stock" class="text-purple-600 focus:ring-purple-500">
                                    <span class="text-sm font-medium text-slate-700">From Stock</span>
                                </label>
                            </div>
                        </div>

                        <div id="manual-input-group">
                            <label class="label">Item / Description</label>
                            <input type="text" id="exp-desc" class="input-field" placeholder="e.g. Office Rent, Tea, Salary...">
                        </div>

                        <div id="stock-input-group" class="hidden space-y-2">
                            <label class="label">Search Product</label>
                            <div class="relative">
                                <input type="text" id="stock-search" class="input-field pl-10" placeholder="Type to search stock...">
                                <i data-lucide="search" class="absolute left-3 top-2.5 w-5 h-5 text-slate-400"></i>
                                <div id="stock-results" class="hidden absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"></div>
                            </div>
                            <div id="selected-product-info" class="hidden text-sm text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100 flex justify-between items-center">
                                <span id="sel-prod-name" class="font-medium"></span>
                                <button id="clear-prod" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="label">Amount (₹)</label>
                                <input type="number" id="exp-amount" class="input-field font-bold text-slate-700" placeholder="0.00">
                            </div>
                             <div>
                                <label class="label">Category</label>
                                <select id="exp-category" class="input-field">
                                    <option value="Store">Store</option>
                                    <option value="Personal">Personal</option>
                                    <option value="AMC">AMC</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="label">Where Used / Location</label>
                            <input type="text" id="exp-location" class="input-field" placeholder="e.g. Workshop, Client Site...">
                        </div>

                        <div>
                            <label class="label">Remarks</label>
                            <textarea id="exp-remarks" class="input-field h-24 resize-none" placeholder="Add any additional notes..."></textarea>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button id="save-exp-btn" class="btn-primary flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                        <i data-lucide="wallet" class="w-4 h-4"></i> Save Expenditure
                    </button>
                </div>
            </div>

            <!-- History List -->
            <div class="card bg-white shadow-sm border border-slate-200">
                <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-700">Recent Expenditure</h3>
                    <div class="text-xs text-slate-500 font-mono">Total Recorded: <span id="total-exp-count">0</span></div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th class="p-3">Date</th>
                                ${isSuperAdmin ? '<th class="p-3">Store</th>' : ''}
                                <th class="p-3">Item / Description</th>
                                <th class="p-3">Type</th>
                                <th class="p-3">Where Used</th>
                                <th class="p-3">Category</th>
                                <th class="p-3 text-right">Amount</th>
                                <th class="p-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody id="exp-history-body" class="divide-y divide-slate-100">
                            <tr><td colspan="${isSuperAdmin ? 8 : 7}" class="p-4 text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Elements
    const typeRadios = container.querySelectorAll('input[name="exp-type"]');
    const manualGroup = container.querySelector('#manual-input-group');
    const stockGroup = container.querySelector('#stock-input-group');
    const stockSearch = container.querySelector('#stock-search');
    const stockResults = container.querySelector('#stock-results');
    const selProdInfo = container.querySelector('#selected-product-info');
    const selProdName = container.querySelector('#sel-prod-name');
    const clearProdBtn = container.querySelector('#clear-prod');
    const descInput = container.querySelector('#exp-desc');
    const amountInput = container.querySelector('#exp-amount');
    const saveBtn = container.querySelector('#save-exp-btn');
    const tbody = container.querySelector('#exp-history-body');
    const storeFilter = container.querySelector('#store-filter');

    let selectedProduct = null;
    let products = [];
    let currentStoreFilter = null;

    // Load Stores for Filter
    if (isSuperAdmin && storeFilter) {
        const { data } = await supabase.from('stores').select('id, name');
        if (data) {
            data.forEach(store => {
                const opt = document.createElement('option');
                opt.value = store.id;
                opt.textContent = store.name;
                storeFilter.appendChild(opt);
            });
        }
        storeFilter.addEventListener('change', (e) => {
            currentStoreFilter = e.target.value;
            fetchExpHistory();
        });
    }

    // --- Type Toggle ---
    typeRadios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'Stock') {
                manualGroup.classList.add('hidden');
                stockGroup.classList.remove('hidden');
                // Auto fetch products if not loaded
                if (products.length === 0) fetchProductList();
            } else {
                manualGroup.classList.remove('hidden');
                stockGroup.classList.add('hidden');
            }
        });
    });

    // --- Stock Search Logic ---
    async function fetchProductList() {
        const { data } = await supabase.from('products').select('id, name, quantity, price');
        if (data) products = data;
    }

    stockSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            stockResults.classList.add('hidden');
            return;
        }

        const matches = products.filter(p => p.name.toLowerCase().includes(term));
        if (matches.length > 0) {
            stockResults.innerHTML = matches.map(p => `
                <div class="p-2 hover:bg-slate-100 cursor-pointer text-sm border-b border-slate-50 last:border-0" data-id="${p.id}">
                    <div class="font-medium text-slate-800">${p.name}</div>
                    <div class="text-xs text-slate-500 flex justify-between">
                        <span>Qty: ${p.quantity}</span>
                        <span>Price: ₹${p.price}</span>
                    </div>
                </div>
            `).join('');
            stockResults.classList.remove('hidden');

            // Re-attach listeners
            stockResults.querySelectorAll('div[data-id]').forEach(div => {
                div.addEventListener('click', () => {
                    const id = div.dataset.id;
                    selectedProduct = products.find(p => p.id === id);
                    if (selectedProduct) {
                        selProdName.textContent = selectedProduct.name;
                        selProdInfo.classList.remove('hidden');
                        stockSearch.value = '';
                        stockResults.classList.add('hidden');
                        amountInput.value = selectedProduct.price || 0;
                    }
                });
            });

        } else {
            stockResults.innerHTML = '<div class="p-2 text-xs text-slate-400">No matches found</div>';
            stockResults.classList.remove('hidden');
        }
    });

    // Hide search on outside click
    document.addEventListener('click', (e) => {
        if (!stockGroup.contains(e.target)) stockResults.classList.add('hidden');
    });

    clearProdBtn.addEventListener('click', () => {
        selectedProduct = null;
        selProdInfo.classList.add('hidden');
        amountInput.value = '';
    });


    // --- Save Logic ---
    if (isStoreAdmin) {
        saveBtn.addEventListener('click', async () => {
            const type = container.querySelector('input[name="exp-type"]:checked').value;
            const itemName = type === 'Stock' ? (selectedProduct ? selectedProduct.name : '') : descInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const date = container.querySelector('#exp-date').value;
            const category = container.querySelector('#exp-category').value;
            const location = container.querySelector('#exp-location').value.trim();
            const remarks = container.querySelector('#exp-remarks').value.trim();

            if (!itemName) return alert("Please enter item description or select a product.");
            if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount.");

            saveBtn.disabled = true;
            saveBtn.innerText = 'Saving...';

            try {
                // 1. If Stock, Deduct Quantity
                if (type === 'Stock' && selectedProduct) {
                    if (selectedProduct.quantity < 1) {
                        alert("Warning: Stock is 0 or low. Proceeding anyway, count will become negative.");
                    }

                    const { error: stockErr } = await supabase
                        .from('products')
                        .update({ quantity: selectedProduct.quantity - 1 })
                        .eq('id', selectedProduct.id);

                    if (stockErr) throw stockErr;
                    selectedProduct.quantity -= 1;
                }

                // 2. Insert Expenditure
                const { error: insertErr } = await supabase.from('expenditures').insert({
                    store_id: user.store_id, // Added store_id
                    item_name: itemName,
                    amount: amount,
                    type: type,
                    category: category,
                    location: location,
                    remarks: remarks,
                    product_id: type === 'Stock' ? selectedProduct?.id : null,
                    quantity: 1,
                    created_at: new Date(date).toISOString()
                });

                if (insertErr) throw insertErr;

                // Reset Form
                descInput.value = '';
                amountInput.value = '';
                container.querySelector('#exp-location').value = '';
                container.querySelector('#exp-remarks').value = '';
                if (selectedProduct) {
                    selectedProduct = null;
                    selProdInfo.classList.add('hidden');
                }
                fetchExpHistory();
                alert("Expenditure saved successfully!");

            } catch (err) {
                console.error(err);
                alert("Error saving: " + err.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i data-lucide="wallet" class="w-4 h-4"></i> Save Expenditure`;
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }


    // --- History Logic ---
    async function fetchExpHistory() {
        let query = supabase.from('expenditures').select('*, stores(name)').order('created_at', { ascending: false }).limit(50);

        if (isSuperAdmin && currentStoreFilter) {
            query = query.eq('store_id', currentStoreFilter);
        }

        const { data, error } = await query;

        if (error) {
            tbody.innerHTML = `<tr><td colspan="${isSuperAdmin ? 8 : 7}" class="p-4 text-center text-red-500">Error: ${error.message}</td></tr>`;
            return;
        }

        container.querySelector('#total-exp-count').textContent = data.length;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isSuperAdmin ? 8 : 7}" class="p-8 text-center text-slate-400 italic">No expenditures recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(ex => `
            <tr class="hover:bg-slate-50 transition-colors group">
                <td class="p-3 text-slate-500">${new Date(ex.created_at).toLocaleDateString()}</td>
                ${isSuperAdmin ? `<td class="p-3 text-slate-500 text-xs">${ex.stores?.name || '-'}</td>` : ''}
                <td class="p-3 font-medium text-slate-700">
                    ${ex.item_name}
                    ${ex.remarks ? `<div class="text-xs text-slate-400 truncate max-w-[200px]">${ex.remarks}</div>` : ''}
                </td>
                <td class="p-3">
                    <span class="px-2 py-1 rounded text-xs font-bold ${ex.type === 'Stock' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}">
                        ${ex.type}
                    </span>
                </td>
                <td class="p-3 text-slate-600">${ex.location || '-'}</td>
                <td class="p-3 text-slate-500 text-xs uppercase">${ex.category || '-'}</td>
                <td class="p-3 text-right font-bold text-slate-800">₹${ex.amount.toFixed(2)}</td>
                <td class="p-3 text-center">
                    <button class="delete-exp-btn text-slate-300 hover:text-red-500 transition-colors p-1" data-id="${ex.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) window.lucide.createIcons();

        // Attach Delete Listeners
        tbody.querySelectorAll('.delete-exp-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this expenditure record? (Note: Stock will NOT be restored automatically)')) {
                    const id = btn.dataset.id;
                    const { error } = await supabase.from('expenditures').delete().eq('id', id);
                    if (!error) fetchExpHistory();
                }
            });
        });
    }

    // Init Load
    fetchExpHistory();
}

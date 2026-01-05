import { supabase } from '../supabase.js';

export async function initRequests(container, user) {
    const isStoreAdmin = !!user.store_id;
    const isSuperAdmin = user.role === 'super_admin';

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800">Stock Requests (Query)</h2>
                    <p class="text-sm text-slate-500">Manage pending stock orders and customer requests</p>
                </div>
                ${isStoreAdmin ? `
                <button id="new-request-btn" class="btn-primary flex items-center gap-2">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> New Request
                </button>
                ` : ''}
            </div>

            <div class="card overflow-hidden">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                            ${isSuperAdmin ? '<th class="p-4 font-semibold">Store</th>' : ''}
                            <th class="p-4 font-semibold">Date</th>
                            <th class="p-4 font-semibold">Product</th>
                            <th class="p-4 font-semibold">Qty</th>
                            <th class="p-4 font-semibold">Customer Details</th>
                            <th class="p-4 font-semibold">Status</th>
                            ${isSuperAdmin ? '<th class="p-4 font-semibold text-right">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody id="requests-tbody" class="text-slate-700 divide-y divide-slate-100">
                        <tr><td colspan="6" class="p-4 text-center">Loading requests...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Request Modal -->
        <div id="request-modal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-[100] backdrop-blur-sm">
            <div class="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                <h3 class="text-xl font-bold mb-4">New Stock Request</h3>
                <form id="request-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Product Name / Description</label>
                        <input type="text" id="req-product" required class="input-field" placeholder="e.g. Samsung A50 Battery">
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                         <input type="number" id="req-qty" required class="input-field" value="1" min="1">
                    </div>
                    
                    <div class="pt-2 border-t border-slate-100 mt-2">
                        <p class="text-xs font-bold text-slate-400 uppercase mb-2">Customer Info (Optional)</p>
                        <div class="space-y-3">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                                <input type="text" id="req-cust-name" class="input-field" placeholder="e.g. Rahul Kumar">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                <input type="text" id="req-cust-phone" class="input-field" placeholder="e.g. 9876543210">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 mt-6">
                        <button type="button" id="cancel-req" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Submit Request</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const tbody = container.querySelector('#requests-tbody');
    const modal = container.querySelector('#request-modal');
    const form = container.querySelector('#request-form');

    // Fetch Requests
    async function fetchRequests() {
        let query = supabase
            .from('inventory_requests')
            .select(`
                *,
                stores ( name, location )
            `)
            .order('created_at', { ascending: false });

        // RLS handles filtering, but explicit is fine too
        if (isStoreAdmin) {
            query = query.eq('store_id', user.store_id);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Error loading data</td></tr>`;
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-400">No pending requests</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr class="hover:bg-slate-50 transition-colors">
                ${isSuperAdmin ? `<td class="p-4 font-medium text-blue-600">${r.stores?.name || 'Unknown'}</td>` : ''}
                <td class="p-4 text-sm">${new Date(r.created_at).toLocaleDateString()}</td>
                <td class="p-4 font-medium">${r.product_name}</td>
                <td class="p-4">${r.quantity}</td>
                <td class="p-4 text-sm">
                    ${r.customer_name ? `
                        <div class="font-medium text-slate-900">${r.customer_name}</div>
                        <div class="text-slate-500">${r.customer_phone || ''}</div>
                    ` : '<span class="text-slate-400 italic">No details</span>'}
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded-full text-xs font-bold 
                        ${r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                r.status === 'Fulfilled' ? 'bg-green-100 text-green-700' :
                    r.status === 'Ordered' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}">
                        ${r.status}
                    </span>
                </td>
                ${isSuperAdmin ? `
                <td class="p-4 text-right">
                    ${r.status !== 'Fulfilled' ? `
                    <select class="status-select bg-slate-100 border-none text-xs rounded-lg py-1 px-2 cursor-pointer hover:bg-slate-200" data-id="${r.id}">
                        <option value="">Set Status...</option>
                        <option value="Ordered">Mark Ordered</option>
                        <option value="Fulfilled">Mark Fulfilled</option>
                        <option value="Cancelled">Cancel</option>
                    </select>
                    ` : '<span class="text-green-600 text-xs">Done</span>'}
                </td>
                ` : ''}
            </tr>
        `).join('');
    }

    // Event Listeners
    if (isStoreAdmin) {
        container.querySelector('#new-request-btn').addEventListener('click', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }

    container.querySelector('#cancel-req').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const product_name = document.querySelector('#req-product').value;
        const quantity = parseInt(document.querySelector('#req-qty').value);
        const customer_name = document.querySelector('#req-cust-name').value;
        const customer_phone = document.querySelector('#req-cust-phone').value;

        const { error } = await supabase.from('inventory_requests').insert({
            store_id: user.store_id,
            product_name,
            quantity,
            customer_name,
            customer_phone,
            status: 'Pending'
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
            fetchRequests();
        }
    });

    if (isSuperAdmin) {
        tbody.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-select')) {
                const id = e.target.dataset.id;
                const status = e.target.value;
                if (!status) return;

                const { error } = await supabase.from('inventory_requests')
                    .update({ status })
                    .eq('id', id);

                if (error) alert('Update failed');
                else fetchRequests();
            }
        });
    }

    fetchRequests();
}

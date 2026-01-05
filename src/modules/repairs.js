import { supabase } from '../supabase.js';

export async function initRepairs(container, user) {
    const isStoreAdmin = !!user.store_id;
    const isSuperAdmin = user.role === 'super_admin';

    container.innerHTML = `
        <div class="space-y-6 h-full flex flex-col">
            <div class="flex justify-between items-center shrink-0">
                <div>
                    <h2 class="text-3xl font-bold text-slate-800">Repair Board</h2>
                    ${user.store_name ? `<p class="text-sm font-semibold text-blue-600 mt-1">Store: ${user.store_name}</p>` : ''}
                </div>
                
                <div class="flex items-center gap-4">
                    ${isSuperAdmin ? `
                        <select id="store-filter" class="input-field py-2 text-sm w-48 bg-white shadow-sm">
                            <option value="">All Stores</option>
                        </select>
                    ` : ''}

                    ${isStoreAdmin ? `
                    <button id="add-repair-btn" class="btn-primary flex items-center gap-2">
                        <i data-lucide="plus" class="w-4 h-4"></i> New Entry
                    </button>
                    ` : '<div class="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded">Read Only View</div>'}
                </div>
            </div>

            <!-- Kanban Board -->
            <div class="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div class="flex gap-6 h-full min-w-[1280px]"> <!-- Increased min-width to accommodate new column -->
                    ${['Received', 'In Process', 'Part Not Available', 'Repaired', 'Delivered (Payment Pending)', 'Delivered'].map(status => `
                        <div class="flex-1 flex flex-col bg-slate-100 rounded-xl p-4 min-w-[280px]">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="font-bold text-slate-700 ${status === 'Delivered (Payment Pending)' ? 'text-sm' : ''}">${status}</h3>
                                <span class="bg-white px-2 py-1 rounded text-xs font-bold text-slate-500 shadow-sm" id="count-${status.replace(/[\s\(\)]/g, '-')}">0</span>
                            </div>
                            <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar" id="col-${status.replace(/[\s\(\)]/g, '-')}">
                                <!-- Cards go here -->
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Repair Modal -->
        <div id="repair-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl p-6 w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto">
                <h3 id="repair-modal-title" class="text-xl font-bold mb-4">New Repair Entry</h3>
                <form id="repair-form" class="space-y-4">
                    <input type="hidden" id="repair-id">
                    
                    <!-- Customer Section -->
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Customer Details</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input type="text" id="cust-name" required class="input-field">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                                <input type="text" id="cust-contact" class="input-field">
                            </div>
                        </div>
                    </div>

                    <!-- Device Section -->
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Device Details</h4>
                         <div class="grid grid-cols-2 gap-4 mb-3">
                             <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Device Name</label>
                                <input type="text" id="device-info" required class="input-field" placeholder="Samsung S21">
                             </div>
                             <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Model Number <span class="text-red-500">*</span></label>
                                <input type="text" id="model-number" required class="input-field" placeholder="SM-G991B">
                             </div>
                         </div>
                         <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Serial Number <span class="text-red-500">*</span></label>
                            <input type="text" id="serial-number" required class="input-field" placeholder="IMEI / SN">
                        </div>
                    </div>

                    <!-- Issues Section -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Problem (Customer)</label>
                            <textarea id="issue-desc" class="input-field h-20 resize-none"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Problem Found (Tech)</label>
                            <textarea id="problem-found" class="input-field h-20 resize-none"></textarea>
                        </div>
                    </div>

                    <!-- Job Details -->
                    <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
                         <h4 class="text-xs font-bold text-blue-800 uppercase mb-3">Job Details</h4>
                         
                         <div class="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Technician Name</label>
                                <input type="text" id="technician-name" class="input-field text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Est. Cost</label>
                                <input type="number" id="repair-cost" class="input-field text-sm">
                            </div>
                         </div>

                         <div class="flex items-center gap-6 mb-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="check-part-change" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary">
                                <span class="text-sm font-medium text-slate-700">Part Change?</span>
                            </label>

                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="check-service-only" class="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary">
                                <span class="text-sm font-medium text-slate-700">Service Only?</span>
                            </label>
                         </div>

                         <div id="part-name-wrapper" class="hidden">
                             <label class="block text-sm font-medium text-slate-700 mb-1">Part Name</label>
                             <input type="text" id="part-replaced-name" class="input-field bg-white" placeholder="Enter name of part replaced">
                         </div>
                    </div>

                    <!-- Status -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Current Status</label>
                                <select id="repair-status" class="input-field">
                                <option value="Received">Received</option>
                                <option value="In Process">In Process</option>
                                <option value="Part Not Available">Part Not Available</option>
                                <option value="Repaired">Repaired</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Delivered (Payment Pending)">Delivered (Payment Pending)</option>
                                </select>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-slate-700 mb-1">Custom Message / Notes</label>
                        <textarea id="custom-message" class="input-field h-16 resize-none" placeholder="Internal notes..."></textarea>
                    </div>

                    <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button type="button" id="cancel-repair-modal" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Save Entry</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const modal = container.querySelector('#repair-modal');
    const form = container.querySelector('#repair-form');
    // Logic for toggles
    const partCheck = container.querySelector('#check-part-change');
    const partWrapper = container.querySelector('#part-name-wrapper');
    const storeFilter = container.querySelector('#store-filter');

    let repairs = [];
    let currentStoreFilter = null;

    // Fetch Stores for Filter (Super Admin)
    if (isSuperAdmin && storeFilter) {
        (async () => {
            const { data } = await supabase.from('stores').select('id, name');
            if (data) {
                data.forEach(store => {
                    const opt = document.createElement('option');
                    opt.value = store.id;
                    opt.textContent = store.name;
                    storeFilter.appendChild(opt);
                });
            }
        })();

        storeFilter.addEventListener('change', (e) => {
            currentStoreFilter = e.target.value;
            fetchRepairs();
        });
    }

    partCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            partWrapper.classList.remove('hidden');
        } else {
            partWrapper.classList.add('hidden');
        }
    });


    async function fetchRepairs() {
        let query = supabase.from('repairs').select(`
            *,
            stores ( name )
        `).order('updated_at', { ascending: false });

        if (isSuperAdmin && currentStoreFilter) {
            query = query.eq('store_id', currentStoreFilter);
        }

        const { data, error } = await query;
        if (!error) {
            repairs = data;
            renderBoard();
        } else {
            console.error('Error fetching repairs:', error);
        }
    }

    function renderBoard() {
        // Clear all columns
        ['Received', 'In Process', 'Part Not Available', 'Repaired', 'Delivered (Payment Pending)', 'Delivered'].forEach(status => {
            const colId = `col-${status.replace(/[\s\(\)]/g, '-')}`;
            const countId = `count-${status.replace(/[\s\(\)]/g, '-')}`;
            const col = container.querySelector(`#${colId}`);
            if (col) col.innerHTML = '';

            const items = repairs.filter(r => r.status === status);
            container.querySelector(`#${countId}`).textContent = items.length;

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow group';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-slate-800">${item.customer_name}</h4>
                        <span class="text-xs text-slate-400">${new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <p class="text-sm text-slate-600 font-medium mb-1">${item.device_details}</p>
                    <p class="text-xs text-slate-400 font-mono mb-2">SN: ${item.serial_number || 'N/A'}</p>
                    <p class="text-xs text-slate-500 line-clamp-2 mb-3">${item.issue_description || 'No description'}</p>
                    <div class="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">#${item.contact_number?.slice(-4) || '----'}</span>
                        <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="edit-repair text-blue-500 hover:text-blue-700 p-1"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `;
                card.querySelector('.edit-repair').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModal(true, item);
                });
                if (col) col.appendChild(card);
            });
        });
        if (window.lucide) window.lucide.createIcons();
    }

    // Modal logic
    const openModal = (isEdit = false, data = null) => {
        document.querySelector('#repair-modal-title').textContent = isEdit ? 'Edit Repair' : 'New Repair Entry';
        document.querySelector('#repair-id').value = isEdit ? data.id : '';
        document.querySelector('#cust-name').value = isEdit ? data.customer_name : '';
        document.querySelector('#cust-contact').value = isEdit ? data.contact_number : '';
        document.querySelector('#device-info').value = isEdit ? data.device_details : '';
        document.querySelector('#model-number').value = isEdit ? data.model_number || '' : '';
        document.querySelector('#serial-number').value = isEdit ? data.serial_number : '';
        document.querySelector('#issue-desc').value = isEdit ? data.issue_description : '';
        document.querySelector('#problem-found').value = isEdit ? data.problem_found || '' : '';

        document.querySelector('#technician-name').value = isEdit ? data.technician_name || '' : '';
        document.querySelector('#repair-status').value = isEdit ? data.status : 'Received';
        document.querySelector('#repair-cost').value = isEdit ? data.estimated_cost : '';
        document.querySelector('#custom-message').value = isEdit ? data.custom_message || '' : '';

        // Toggles
        const partBox = document.querySelector('#check-part-change');
        const serviceBox = document.querySelector('#check-service-only');
        const partName = document.querySelector('#part-replaced-name');

        partBox.checked = isEdit ? data.is_part_change : false;
        serviceBox.checked = isEdit ? data.is_service_only : false;
        partName.value = isEdit ? data.part_replaced_name || '' : '';

        if (partBox.checked) document.querySelector('#part-name-wrapper').classList.remove('hidden');
        else document.querySelector('#part-name-wrapper').classList.add('hidden');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
    };

    if (isStoreAdmin) {
        container.querySelector('#add-repair-btn').addEventListener('click', () => openModal(false));
    }

    container.querySelector('#cancel-repair-modal').addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // If not store admin, cannot save (double check)
        if (!isStoreAdmin) {
            alert('Super Admin can only view items.');
            closeModal();
            return;
        }

        const id = document.querySelector('#repair-id').value;
        const payload = {
            store_id: user.store_id, // CRITICAL
            customer_name: document.querySelector('#cust-name').value,
            contact_number: document.querySelector('#cust-contact').value,
            device_details: document.querySelector('#device-info').value,
            model_number: document.querySelector('#model-number').value,
            serial_number: document.querySelector('#serial-number').value,
            issue_description: document.querySelector('#issue-desc').value,
            problem_found: document.querySelector('#problem-found').value,
            technician_name: document.querySelector('#technician-name').value,
            is_part_change: document.querySelector('#check-part-change').checked,
            is_service_only: document.querySelector('#check-service-only').checked,
            part_replaced_name: document.querySelector('#part-replaced-name').value,
            status: document.querySelector('#repair-status').value,
            estimated_cost: document.querySelector('#repair-cost').value || 0,
            custom_message: document.querySelector('#custom-message').value
        };

        if (id) {
            // For update, we don't necessarily update store_id, but it's fine.
            const { error } = await supabase.from('repairs').update(payload).eq('id', id);
            if (error) alert('Error updating: ' + error.message);
            else fetchRepairs();
        } else {
            const { error } = await supabase.from('repairs').insert([payload]);
            if (error) alert('Error creating: ' + error.message);
            else fetchRepairs();
        }
        closeModal();
    });

    fetchRepairs();
}



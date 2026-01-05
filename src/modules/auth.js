import { supabase } from '../supabase.js';

export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // We also need the extended role/store info
    // For performance, we can cache this or fetch it if missing
    let userDetails = localStorage.getItem('user_details');
    if (userDetails) {
        return JSON.parse(userDetails);
    }

    // If session exists but no details (cleared cache?), fetch them
    return await fetchUserDetails(session.user.id);
}

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return { success: false, message: error.message };
    }

    // Fetch Role and Store
    const user = await fetchUserDetails(data.user.id);
    if (!user) {
         return { success: false, message: 'User has no assigned role.' };
    }

    return { success: true, user };
}

export async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('user_details');
    window.location.reload();
}

async function fetchUserDetails(userId) {
    const { data: roleData, error } = await supabase
        .from('user_roles')
        .select(`
            role,
            store_id,
            stores ( name, location )
        `)
        .eq('user_id', userId)
        .single();

    if (error || !roleData) {
        console.error('Error fetching user role:', error);
        return null;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();

    const user = {
        id: userId,
        email: authUser?.email,
        role: roleData.role,
        store_id: roleData.store_id,
        store_name: roleData.stores?.name,
        store_location: roleData.stores?.location
    };

    localStorage.setItem('user_details', JSON.stringify(user));
    return user;
}

export function renderLogin(container) {
    container.innerHTML = `
        <div class="w-full h-full min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
             <!-- Decorative Background -->
            <div class="absolute inset-0 z-0 opacity-10">
                <div class="absolute right-0 top-0 bg-blue-500 w-96 h-96 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <div class="absolute left-0 bottom-0 bg-indigo-500 w-96 h-96 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div class="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border border-white/50">
                <div class="text-center mb-8">
                    <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-600/30">
                        <i data-lucide="zap" class="w-6 h-6"></i>
                    </div>
                    <h1 class="text-2xl font-bold text-slate-800">Inventory System</h1>
                    <p class="text-slate-500 text-sm mt-2">Enter credentials to continue</p>
                </div>
                
                <form id="login-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input type="email" id="email" class="input-field w-full bg-white/50" placeholder="admin@example.com" required>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                        <input type="password" id="password" class="input-field w-full bg-white/50" placeholder="••••••••" required>
                    </div>
                    
                    <div id="login-error" class="hidden flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                        <i data-lucide="alert-circle" class="w-4 h-4"></i>
                        <span id="login-error-text">Invalid credentials</span>
                    </div>

                    <button type="submit" class="btn-primary w-full py-2.5 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform hover:-translate-y-0.5">
                        <span id="btn-text">Sign In</span>
                        <span id="btn-loader" class="hidden animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></span>
                    </button>
                </form>

                <div class="mt-8 pt-6 border-t border-slate-200/60 text-center">
                    <p class="text-xs text-slate-400">Secure Access • Role Based</p>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const form = container.querySelector('#login-form');
    const errorMsg = container.querySelector('#login-error');
    const errorText = container.querySelector('#login-error-text');
    const btnText = container.querySelector('#btn-text');
    const btnLoader = container.querySelector('#btn-loader');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('#email').value;
        const pass = form.querySelector('#password').value;

        // Loading state
        btnText.textContent = 'Verifying...';
        btnLoader.classList.remove('hidden');
        errorMsg.classList.add('hidden');

        const result = await login(email, pass);

        if (result.success) {
            window.location.reload(); 
        } else {
            btnText.textContent = 'Sign In';
            btnLoader.classList.add('hidden');
            errorText.textContent = result.message;
            errorMsg.classList.remove('hidden');
        }
    });
}

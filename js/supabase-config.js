// ============================================================
//   js/supabase-config.js
//   AUTOPRIME - Configuración Supabase (VERSIÓN FINAL CORREGIDA)
// ============================================================

// ⚠️  IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase.
//     Ve a: https://app.supabase.com → tu proyecto → Settings → API
//     SUPABASE_URL  = Project URL
//     SUPABASE_ANON_KEY = anon / public key (empieza con "eyJ...")
// ============================================================
const SUPABASE_URL      = 'https://ycaqurmyedhvijofhqmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYXF1cm15ZWRodmlqb2ZocW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg2ODUsImV4cCI6MjA5NDk2NDY4NX0.ntc-VOwvgx0AlYT-PMQkBgDUvkQoI9RCKnSVM-2ZZoE';

if (typeof supabase === "undefined") { throw new Error("SDK no cargó"); }
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession:      true,
    autoRefreshToken:    true,
    detectSessionInUrl:  true,
    storageKey:          'autoprime_auth'
  }
});

// ============================================================
//   AUTENTICACIÓN
// ============================================================
const Auth = {
  async register(nombre, apellido, email, password) {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { nombre, apellido } }
    });
    if (error) throw error;
    // Insert profile immediately (don't wait for trigger)
    if (data.user) {
      await supabaseClient.from('profiles').upsert({
        id: data.user.id,
        nombre,
        apellido,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }
    return data;
  },

  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await Cart.syncLocalToSupabase(data.user.id);
    }
    return data;
  },

  async logout() {
    try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch(e) {}
    // Limpiar todo rastro de sesión manualmente
    for (const key of Object.keys(localStorage)) {
      localStorage.removeItem(key);
    }
    sessionStorage.clear();
  },

  async getCurrentUser() {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return null;
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      return (!error && user) ? user : session.user;
    } catch (e) {
      return null;
    }
  },

  async getSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange(callback);
  }
};

// ============================================================
//   PERFIL
// ============================================================
const Profile = {
  async get(userId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();                // maybeSingle() no lanza error si no existe
    if (error) throw error;
    return data || {};
  },

  async update(userId, updates) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
    if (error) throw error;
    return data;
  }
};

// ============================================================
//   CARRITO
// ============================================================
const Cart = {
  async getItems() {
    try {
      const user = await Auth.getCurrentUser();
      return user ? await this._getSupabase(user.id) : this._getLocal();
    } catch (e) {
      console.error('Cart.getItems error:', e);
      return this._getLocal();
    }
  },

  _getLocal() {
    try { return JSON.parse(localStorage.getItem('autoprime_cart') || '[]'); }
    catch { return []; }
  },

  _saveLocal(items) {
    localStorage.setItem('autoprime_cart', JSON.stringify(items));
    this.updateBadge();
  },

  async _getSupabase(userId) {
    const { data, error } = await supabaseClient
      .from('carrito')
      .select('*, producto:productos(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async addItem(producto) {
    try {
      const user = await Auth.getCurrentUser();
      const id     = producto.producto_id || producto.id || (producto.producto?.id);
      const nombre = producto.nombre || producto.producto?.nombre || 'Vehículo';
      if (!id) throw new Error('ID de producto no encontrado');

      if (user) {
        const { error } = await supabaseClient
          .from('carrito')
          .upsert({ user_id: user.id, producto_id: id, cantidad: 1 },
                  { onConflict: 'user_id,producto_id', ignoreDuplicates: false });
        if (error) throw error;
      } else {
        const cart = this._getLocal();
        if (!cart.find(i => i.id === id)) {
          cart.push({ ...producto, id, cantidad: 1 });
          this._saveLocal(cart);
        }
      }

      await this.updateBadge();
      this._showNotif(nombre);
    } catch (err) {
      console.error('Cart.addItem error:', err);
      alert('No se pudo añadir al carrito. Verifica tu sesión e inténtalo de nuevo.');
    }
  },

  async removeItem(productoId) {
    const user = await Auth.getCurrentUser();
    if (user) {
      const { error } = await supabaseClient
        .from('carrito').delete()
        .eq('user_id', user.id).eq('producto_id', productoId);
      if (error) throw error;
    } else {
      this._saveLocal(this._getLocal().filter(i => i.id !== productoId));
    }
    await this.updateBadge();
  },

  async clearCart() {
    const user = await Auth.getCurrentUser();
    if (user) {
      const { error } = await supabaseClient
        .from('carrito').delete().eq('user_id', user.id);
      if (error) throw error;
    } else {
      localStorage.removeItem('autoprime_cart');
    }
    await this.updateBadge();
  },

  async syncLocalToSupabase(userId) {
    const local = this._getLocal();
    if (!local.length) return;
    const items = local.map(i => ({ user_id: userId, producto_id: i.id, cantidad: i.cantidad || 1 }));
    const { error } = await supabaseClient
      .from('carrito').upsert(items, { onConflict: 'user_id,producto_id' });
    if (!error) localStorage.removeItem('autoprime_cart');
  },

  calcTotal(items) {
    return items.reduce((sum, item) => {
      const precio = item.producto ? item.producto.precio : item.precio;
      return sum + (Number(precio) || 0) * (item.cantidad || 1);
    }, 0);
  },

  async updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    try {
      const items = await this.getItems();
      const n = items.length;
      badge.textContent = n;
      badge.style.display = n > 0 ? 'flex' : 'none';
    } catch { badge.style.display = 'none'; }
  },

  _showNotif(nombre) {
    document.querySelectorAll('.cart-notif').forEach(n => n.remove());
    const el = document.createElement('div');
    el.className = 'cart-notif';
    el.innerHTML = `<span>✓</span> <strong>${nombre}</strong> añadido al carrito`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
  }
};

// ============================================================
//   PRODUCTOS
// ============================================================
const Productos = {
  async getAll(filtros = {}) {
    let q = supabaseClient.from('productos').select('*').eq('activo', true);
    if (filtros.categoria)  q = q.eq('categoria', filtros.categoria);
    if (filtros.destacados) q = q.eq('destacado', true);
    if (filtros.orden === 'precio_asc')  q = q.order('precio', { ascending: true });
    if (filtros.orden === 'precio_desc') q = q.order('precio', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabaseClient
      .from('productos').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
};

// ============================================================
//   PEDIDOS
// ============================================================
const Pedidos = {
  _num() {
    return `AP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2,5).toUpperCase()}`;
  },

  async crear(userId, items, datosEnvio) {
    const subtotal  = Cart.calcTotal(items);
    const impuestos = subtotal * 0.16;
    const total     = subtotal + impuestos;

    const { data: pedido, error: eP } = await supabaseClient
      .from('pedidos')
      .insert({ user_id: userId, numero_pedido: this._num(), estado: 'confirmado',
                subtotal, impuestos, envio: 0, total, ...datosEnvio })
      .select().single();
    if (eP) throw eP;

    const { error: eI } = await supabaseClient.from('pedido_items').insert(
      items.map(item => ({
        pedido_id:        pedido.id,
        producto_id:      item.producto_id || item.id,
        nombre_producto:  item.producto ? item.producto.nombre : item.nombre,
        precio_unitario:  item.producto ? item.producto.precio : item.precio,
        cantidad:         item.cantidad || 1,
        subtotal: (item.producto ? item.producto.precio : item.precio) * (item.cantidad || 1)
      }))
    );
    if (eI) throw eI;

    await Cart.clearCart();
    return pedido;
  },

  async getMisPedidos(userId) {
    const { data, error } = await supabaseClient
      .from('pedidos').select('*, pedido_items(*)')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
};

// ============================================================
//   NAVBAR HELPER (compartido por todas las páginas)
// ============================================================
const NavHelper = {
  // basePath: '' para index.html, '../' para páginas dentro de /pages/
  async init(basePath = '') {
    const user = await Auth.getCurrentUser();
    const area = document.getElementById('nav-user-area');
    if (!area) return;

    if (user) {
      const profile = await Profile.get(user.id).catch(() => ({}));
      const nombre  = profile?.nombre || user.email.split('@')[0];
      area.innerHTML = `
        <div class="user-menu" id="userMenu">
          <button class="btn-user" onclick="toggleUserMenu(event)">👤 ${nombre} ▾</button>
          <div class="user-dropdown">
            <a href="${basePath}pages/mi-cuenta.html">Mi Cuenta</a>
            <a href="${basePath}pages/mis-pedidos.html">Mis Pedidos</a>
            <a href="${basePath}pages/carrito.html">Carrito</a>
            <button onclick="doLogout()">Cerrar Sesión</button>
          </div>
        </div>`;
      // Close dropdown when clicking outside
      setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
          const menu = document.getElementById('userMenu');
          if (menu && !menu.contains(e.target)) {
            menu.classList.remove('open');
          }
        }, { once: false, capture: true });
      }, 100);
    } else {
      area.innerHTML = `<button class="btn-primary" onclick="${basePath === '' ? 'openAuthModal()' : "location.href='" + basePath + "index.html'"}">Iniciar Sesión</button>`;
    }
  }
};

// ============================================================
//   FUNCIONES GLOBALES (disponibles en todas las páginas)
// ============================================================
window.doLogout = async function() {
  try { await supabaseClient.auth.signOut({ scope: 'local' }); } catch(e) {}
  try { localStorage.clear(); } catch(e) {}
  try { sessionStorage.clear(); } catch(e) {}
  // Detectar si estamos en /pages/ o en la raíz
  const enSubpagina = window.location.pathname.includes('/pages/');
  window.location.replace(enSubpagina ? '../index.html' : 'index.html');
};

window.toggleUserMenu = function(e) {
  e.stopPropagation();
  const menu = document.getElementById('userMenu');
  if (menu) menu.classList.toggle('open');
};

// Badge al cargar cada página
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());

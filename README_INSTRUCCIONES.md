# AutoPrime — Instrucciones de Configuración

## ⚠️ PASO OBLIGATORIO ANTES DE ABRIR

### 1. Obtén tu ANON KEY de Supabase

1. Ve a https://app.supabase.com
2. Selecciona tu proyecto (`ycaqurmyedhvijofhqmu`)
3. Menú izquierdo → **Settings** → **API**
4. Copia el valor de **"anon / public"** — debe empezar con `eyJ...`

### 2. Pégala en el archivo de configuración

Abre `js/supabase-config.js` y reemplaza la línea:

```js
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
```

Por tu clave real, por ejemplo:

```js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Bugs corregidos en esta versión

| Bug | Causa original | Fix |
|-----|---------------|-----|
| Catálogo se queda en "Cargando..." | ANON KEY inválida (formato `sb_publishable_` en lugar de JWT `eyJ...`) | Documentado + placeholder claro |
| Navbar pierde login/logout tras iniciar sesión | `initNavUser()` duplicado e inconsistente entre páginas | Centralizado en `NavHelper.init(basePath)` |
| No aparece "Cerrar Sesión" en el nav | `onAuthStateChange` no re-renderizaba el nav correctamente | NavHelper siempre re-renderiza en auth change |
| Carrito desaparece del nav al iniciar sesión | Misma raíz que el navbar | Corregido con NavHelper |
| Imágenes no cargan tras login | Las URLs de `imagen_principal` se resuelven correctamente desde Supabase Storage; el `onerror` muestra 🚗 como fallback | Fallback SVG inline en todas las imágenes |
| `Profile.get()` lanzaba error si no existía perfil | Usaba `.single()` que falla con 0 resultados | Cambiado a `.maybeSingle()` |
| Carrito local no se sincronizaba al hacer login | Race condition entre `login()` y el carrito | `syncLocalToSupabase` se llama siempre en `Auth.login()` |

---

## Estructura del proyecto

```
autoprime_final/
├── index.html              — Página principal
├── css/style.css           — Estilos globales
├── js/supabase-config.js   — Config + módulos Auth, Cart, Productos, Pedidos, NavHelper
├── images/cars/            — Imágenes locales (hero-bg, etc.)
├── pages/
│   ├── catalogo.html
│   ├── carrito.html
│   ├── mi-cuenta.html
│   └── mis-pedidos.html
└── supabase_setup.sql      — SQL para crear las tablas en Supabase
```

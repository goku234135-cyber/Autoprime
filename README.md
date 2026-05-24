# AutoPrime — Guía de Configuración

## Estructura del Proyecto

```
autoprime/
├── index.html              ← Página principal (Hero + Productos destacados)
├── css/
│   └── style.css           ← Estilos globales
├── js/
│   └── supabase-config.js  ← Módulos de Auth, Carrito, Productos, Pedidos
├── pages/
│   ├── catalogo.html       ← Catálogo completo con filtros
│   ├── carrito.html        ← Carrito + Checkout
│   ├── mis-pedidos.html    ← Historial de pedidos
│   └── mi-cuenta.html      ← Perfil del usuario
├── images/
│   ├── cars/               ← ⚠️ AQUÍ pones las fotos de los autos
│   │   ├── mercedes-c300.jpg
│   │   ├── bmw-m4.jpg
│   │   ├── audi-q7.jpg
│   │   └── ...
│   └── ui/
│       ├── hero-bg.jpg     ← Imagen de fondo del hero (opcional)
│       └── placeholder.jpg ← Imagen cuando no carga
└── supabase_setup.sql      ← Script SQL para configurar Supabase
```

---

## 1️⃣ Configurar Supabase

### Crear el proyecto
1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto (elige una región cercana, ej. us-east-1)
3. Espera ~2 minutos a que se inicialice

### Ejecutar el SQL
1. En el dashboard de Supabase, ve a **SQL Editor**
2. Abre el archivo `supabase_setup.sql` de este proyecto
3. Copia y pega todo el contenido en el editor
4. Haz clic en **Run** (Ctrl+Enter)

Esto creará las tablas: `profiles`, `productos`, `carrito`, `pedidos`, `pedido_items`  
Y también insertará 6 productos de ejemplo.

### Obtener las credenciales
1. Ve a **Settings → API** en Supabase
2. Copia:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon/public key** (empieza con `eyJ...`)

---

## 2️⃣ Conectar el proyecto

Abre `js/supabase-config.js` y reemplaza:

```javascript
const SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
```

Con tus credenciales reales.

---

## 3️⃣ Agregar imágenes de autos

La carpeta `images/cars/` es donde pones las fotos de tus vehículos.

Para cambiar las imágenes:
1. Pon tus fotos en `images/cars/` con el nombre que quieras
2. En Supabase → Table Editor → `productos`
3. Edita el campo `imagen_principal` de cada producto con la ruta:
   ```
   images/cars/nombre-de-tu-foto.jpg
   ```

> **Tip:** Las imágenes ideales son de 800×500px o mayor, formato JPG/PNG/WEBP.

---

## 4️⃣ Funcionalidades implementadas

### 🛒 Carrito de Compras
- **Sin sesión:** El carrito se guarda en `localStorage`
- **Con sesión:** El carrito se guarda en Supabase (tabla `carrito`)
- **Al iniciar sesión:** El carrito local se sincroniza automáticamente con Supabase
- **Al cerrar sesión:** El carrito local se vacía completamente

### 👤 Auth (Login / Registro)
- Modal de login/registro en la página principal
- Registro con nombre, apellido, email y contraseña
- Login con email y contraseña
- Perfil de usuario editable (nombre, teléfono, dirección)
- Cierre de sesión desde cualquier página

### 📦 Pedidos
- Checkout con dirección de entrega
- Número de pedido generado automáticamente (ej: `AP-M5X2K-A3B`)
- Historial de pedidos con estado y detalles
- El carrito se vacía automáticamente al confirmar el pedido

### 🚗 Productos
- Grid con tarjetas de productos
- Filtros por categoría, combustible y precio
- Ordenamiento por precio y nombre
- Imágenes con fallback automático si no carga

---

## 5️⃣ Agregar/Editar productos

### Desde Supabase (recomendado)
1. Ve a **Table Editor → productos**
2. Haz clic en **Insert row** o edita uno existente
3. Los campos más importantes:
   - `nombre`, `marca`, `modelo`, `anio`
   - `precio` (número sin formato, ej: `850000`)
   - `imagen_principal` (ruta relativa desde la raíz del proyecto)
   - `categoria`: `sedan`, `suv`, `deportivo`, `pickup`, `convertible`
   - `combustible`: `gasolina`, `electrico`, `hibrido`
   - `destacado`: `true` para que aparezca en la página principal

---

## 6️⃣ Notas importantes

- El proyecto usa **Supabase CDN** para el cliente JS (no requiere npm)
- Todas las páginas son HTML puro, sin framework
- Los estilos usan CSS variables, fácil de cambiar colores
- Para cambiar el nombre de la tienda, busca "AUTOPRIME" en todos los archivos

---

## Paleta de colores (para personalizar)

```css
--gold: #c9a84c;        /* Color dorado principal */
--black: #0a0a0a;       /* Fondo principal */
--dark: #111111;        /* Fondo secundario */
```

Para cambiar el esquema de color, edita estas variables en `css/style.css`.

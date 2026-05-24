-- ============================================================
--  AUTOPRIME - Esquema de Base de Datos para Supabase
--  Ejecuta este SQL en el SQL Editor de Supabase
-- ============================================================

-- 1. TABLA DE PERFILES DE USUARIO
-- (extiende auth.users de Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(80),
  estado VARCHAR(80),
  cp VARCHAR(10),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE PRODUCTOS (Autos)
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  marca VARCHAR(100) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  anio INTEGER NOT NULL,
  precio NUMERIC(12, 2) NOT NULL,
  precio_anterior NUMERIC(12, 2),
  descripcion TEXT,
  imagen_principal VARCHAR(300),
  imagenes TEXT[],           -- array de rutas de imágenes
  categoria VARCHAR(80),     -- 'sedan', 'suv', 'deportivo', etc.
  kilometraje INTEGER DEFAULT 0,
  transmision VARCHAR(50),   -- 'automatico', 'manual'
  combustible VARCHAR(50),   -- 'gasolina', 'electrico', 'hibrido'
  color VARCHAR(50),
  stock INTEGER DEFAULT 1,
  destacado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE CARRITO
CREATE TABLE IF NOT EXISTS public.carrito (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE CASCADE NOT NULL,
  cantidad INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, producto_id)
);

-- 4. TABLA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  numero_pedido VARCHAR(20) UNIQUE NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  -- 'pendiente', 'confirmado', 'en_proceso', 'enviado', 'entregado', 'cancelado'
  subtotal NUMERIC(12,2) NOT NULL,
  impuestos NUMERIC(12,2) DEFAULT 0,
  envio NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  -- Dirección de entrega (snapshot al momento de compra)
  direccion_entrega TEXT,
  ciudad_entrega VARCHAR(80),
  estado_entrega VARCHAR(80),
  cp_entrega VARCHAR(10),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE ITEMS DEL PEDIDO
CREATE TABLE IF NOT EXISTS public.pedido_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  nombre_producto VARCHAR(200) NOT NULL,  -- snapshot
  precio_unitario NUMERIC(12,2) NOT NULL, -- snapshot
  cantidad INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL
);

-- ============================================================
--  ROW LEVEL SECURITY (RLS) - Seguridad por usuario
-- ============================================================

-- Activar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- PROFILES: solo el propio usuario puede ver/editar su perfil
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- CARRITO: solo el propio usuario ve su carrito
CREATE POLICY "carrito_own" ON public.carrito FOR ALL USING (auth.uid() = user_id);

-- PEDIDOS: solo el propio usuario ve sus pedidos
CREATE POLICY "pedidos_own" ON public.pedidos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pedidos_insert" ON public.pedidos FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PEDIDO_ITEMS: visibles si el pedido pertenece al usuario
CREATE POLICY "pedido_items_own" ON public.pedido_items FOR SELECT
  USING (pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = auth.uid()));
CREATE POLICY "pedido_items_insert" ON public.pedido_items FOR INSERT
  WITH CHECK (pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = auth.uid()));

-- PRODUCTOS: todos pueden ver, nadie puede modificar desde el frontend
CREATE POLICY "productos_public_select" ON public.productos FOR SELECT USING (activo = TRUE);

-- ============================================================
--  TRIGGER: crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
--  DATOS DE EJEMPLO - Productos
-- ============================================================
INSERT INTO public.productos (nombre, marca, modelo, anio, precio, precio_anterior, descripcion, imagen_principal, categoria, transmision, combustible, color, stock, destacado) VALUES
('Mercedes-Benz C300 AMG Line', 'Mercedes-Benz', 'C300', 2024, 850000, 920000, 'Sedán de lujo con motor 2.0T, diseño AMG Line, pantalla MBUX de 11.9 pulgadas, asientos de cuero Nappa.', 'images/cars/mercedes-c300.jpg', 'sedan', 'automatico', 'gasolina', 'Negro Obsidian', 3, TRUE),
('BMW M4 Competition', 'BMW', 'M4', 2024, 1250000, NULL, 'Coupé de alto rendimiento con motor S58 3.0L biturbo de 503 hp. 0-100 km/h en 3.9s. Sistema M xDrive.', 'images/cars/bmw-m4.jpg', 'deportivo', 'automatico', 'gasolina', 'Azul Marina', 2, TRUE),
('Audi Q7 Quattro', 'Audi', 'Q7', 2023, 1100000, 1180000, 'SUV premium de 7 plazas con tracción quattro, Virtual Cockpit Plus, pantalla MMI 10.1 pulgadas.', 'images/cars/audi-q7.jpg', 'suv', 'automatico', 'gasolina', 'Blanco Glaciar', 4, TRUE),
('Porsche Cayenne GTS', 'Porsche', 'Cayenne', 2024, 1800000, NULL, 'SUV deportivo con motor V8 biturbo de 460 hp. Suspensión activa, frenos cerámicos opcionales.', 'images/cars/porsche-cayenne.jpg', 'suv', 'automatico', 'gasolina', 'Rojo Carmine', 1, TRUE),
('Tesla Model S Plaid', 'Tesla', 'Model S', 2024, 1650000, NULL, 'El sedán eléctrico más rápido del mundo. 1,020 hp, 0-100 en 2.1s, autonomía de 637 km.', 'images/cars/tesla-models.jpg', 'sedan', 'automatico', 'electrico', 'Plata Mercurio', 2, FALSE),
('Range Rover Sport HSE', 'Land Rover', 'Range Rover Sport', 2023, 1350000, 1420000, 'SUV de lujo todo terreno con motor Ingenium P360, techo panorámico, sistema Terrain Response 2.', 'images/cars/range-rover-sport.jpg', 'suv', 'automatico', 'gasolina', 'Verde Carpathian', 3, FALSE);

-- ============================================================
--  FIN DEL SCRIPT
-- ============================================================
-- Después de ejecutar este script:
-- 1. Ve a Authentication > Settings y habilita Email confirmations si quieres
-- 2. Copia tu URL y ANON KEY de Project Settings > API
-- 3. Pégalos en js/supabase-config.js de tu proyecto

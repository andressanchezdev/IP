# Landing Importadora Premium — Documentación de diseño

## Resumen

Landing page de tienda de repuestos para motocicletas, implementada en **React 19 + Vite**. El diseño replica fielmente el mockup de referencia: sidebar fijo al 6% del ancho, header con búsqueda/filtros/carrito, y grid de product cards.

---

## Stack tecnológico

| Tecnología | Uso |
|---|---|
| React 19 | Componentes UI |
| Vite 8 | Bundler y dev server |
| CSS puro | Estilos con variables de diseño (sin librería UI) |
| Google Fonts Inter | Tipografía principal |

---

## Estructura de carpetas

```text
src/
├── assets/
│   ├── icons/          # Iconos SVG reutilizables
│   ├── logos/          # Logos de marca (ip, Yamaha, AKT, Bajaj)
│   └── images/         # Placeholder de producto
├── modules/            # Componentes reutilizables (sin lógica de página)
│   ├── layout/
│   │   ├── Header/     # Barra superior
│   │   └── Sidebar/    # Menú lateral fijo
│   └── ui/
│       ├── SearchBar/      # Input de búsqueda
│       ├── FilterButton/   # Botones Filtrar / Nuevos / Promoción
│       ├── StatusBadge/    # Etiqueta de estado (Agotado, etc.)
│       └── ProductCard/    # Tarjeta de producto
├── features/
│   └── landing/
│       ├── LandingPage.jsx     # Composición de la página
│       ├── LandingPage.css     # Estilos del layout de landing
│       └── data/
│           └── mockProducts.js # Datos mock de productos
├── styles/
│   └── variables.css   # Tokens de diseño (colores, espaciado, etc.)
├── App.jsx             # Punto de entrada — monta LandingPage
├── index.css           # Reset global
└── main.jsx            # Bootstrap de React
```

### Reglas de organización

- **`assets/`** — Solo archivos estáticos (SVG, imágenes, logos).
- **`modules/`** — Piezas reutilizables independientes de la página (Header, Sidebar, ProductCard).
- **`features/`** — Lógica y composición específica de una feature (landing + datos mock).

---

## Layout general

```
┌──────────┬─────────────────────────────────────────────┐
│          │  Header: [Buscar] [Filtrar][Nuevos][Promo] 🛒│
│ Sidebar  ├─────────────────────────────────────────────┤
│  (6vw)   │                                             │
│          │         Grid de Product Cards (3 cols)      │
│  Tienda  │                                             │
│  Espera  │                                             │
│ Historial│                                             │
│          │                                             │
│  Salir   │                                             │
└──────────┴─────────────────────────────────────────────┘
```

- **Contenedor:** `display: flex; min-height: 100vh`
- **Sidebar:** `width: 6vw; min-width: 72px; height: 100vh; position: sticky`
- **Área principal:** `flex: 1` con header + contenido scrollable
- **Grid:** 3 columnas en desktop, 2 en tablet, 1 en mobile

---

## Componentes

### Sidebar (`modules/layout/Sidebar`)

| Elemento | Descripción |
|---|---|
| Logo | Círculo oscuro con texto "ip" |
| Tienda | Icono bolsa — estado activo por defecto |
| Espera | Icono reloj |
| Historial | Icono documento |
| Salir | Icono logout al fondo del sidebar |

**Props:** `activeItem`, `onNavigate`, `onLogout`

### Header (`modules/layout/Header`)

De izquierda a derecha:

1. **SearchBar** — Input redondeado con icono lupa, placeholder "Buscar"
2. **Filtrar** — Botón amarillo `#FFB74D`
3. **Nuevos** — Botón azul `#90CAF9`
4. **Promoción** — Botón verde `#A5D6A7`
5. **Carrito** — Icono outline en esquina derecha

**Props:** `searchValue`, `onSearchChange`, `onFilter`, `onNew`, `onPromo`, `onCart`

### ProductCard (`modules/ui/ProductCard`)

Estructura de cada card:

| Campo | Ejemplo | Estilo |
|---|---|---|
| Imagen | Placeholder o foto | Área cuadrada superior |
| Precio | $16.200 | Bold, 18px |
| Descripción | Abrazadera Telescópico | Bold, 14px |
| Modelo \| Marca | Dt 125 \| Yamaha Original | Gris, 12px |
| Referencia | 18G231920000 | Monospace, 11px |
| Logo marca | Yamaha / AKT / Bajaj | Footer izquierdo |
| Estado | Agotado | Badge rosa `#FFCDD2` |

**Props:** `price`, `description`, `model`, `brand`, `reference`, `image`, `brandLogo`, `status`

---

## Tokens de diseño (`styles/variables.css`)

### Colores

| Token | Valor | Uso |
|---|---|---|
| `--color-bg-page` | `#F7F7F7` | Fondo del contenido |
| `--color-bg-surface` | `#FFFFFF` | Sidebar, header, cards |
| `--color-border` | `#E5E5E5` | Bordes y delimitadores |
| `--color-text-primary` | `#1A1A1A` | Texto principal |
| `--color-text-secondary` | `#757575` | Texto secundario |
| `--color-filter` | `#FFB74D` | Botón Filtrar |
| `--color-new` | `#90CAF9` | Botón Nuevos |
| `--color-promo` | `#A5D6A7` | Botón Promoción |
| `--color-agotado-bg` | `#FFCDD2` | Fondo badge Agotado |
| `--color-agotado-text` | `#D32F2F` | Texto badge Agotado |

### Layout

| Token | Valor |
|---|---|
| `--sidebar-width` | `6vw` |
| `--sidebar-min-width` | `72px` |
| `--header-height` | `64px` |
| `--radius-card` | `12px` |
| `--radius-input` | `24px` |
| `--shadow-card` | `0 2px 8px rgba(0,0,0,0.06)` |

### Tipografía

- **Familia:** Inter (Google Fonts)
- **Pesos usados:** 400, 500, 600, 700

---

## Modelo de datos de producto

```js
{
  id: '1',
  price: 16200,              // número — se formatea como $16.200
  description: 'Abrazadera Telescópico',
  model: 'Dt 125',
  brand: 'Yamaha Original',
  reference: '18G231920000',
  image: null,               // opcional — usa placeholder si es null
  brandLogo: yamahaLogo,     // import SVG
  status: 'agotado',         // 'agotado' | 'disponible' | 'nuevo'
}
```

---

## Funcionalidad actual

| Feature | Estado |
|---|---|
| Sidebar visual con navegación | Implementado (sin router) |
| Búsqueda local en productos | Implementado (filtra por descripción, modelo, marca, referencia) |
| Botones Filtrar / Nuevos / Promoción | UI lista (handlers preparados) |
| Carrito | UI lista (handler preparado) |
| Grid responsive | 3 / 2 / 1 columnas |
| Hover en cards | Sombra + elevación sutil |

---

## Cómo ejecutar

```bash
# Instalar dependencias (si es necesario)
npm install

# Servidor de desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

Abrir `http://localhost:5173` en el navegador.

---

## Cómo extender

### Conectar API real

Reemplazar `mockProducts.js` por un fetch en `LandingPage.jsx`:

```js
const [products, setProducts] = useState([])

useEffect(() => {
  fetch('/api/products')
    .then((res) => res.json())
    .then(setProducts)
}, [])
```

### Agregar React Router

1. Instalar: `npm install react-router-dom`
2. Crear páginas en `features/` (espera, historial)
3. Conectar `Sidebar.onNavigate` con `useNavigate()`

### Agregar imágenes reales de productos

Colocar fotos en `src/assets/images/` y referenciarlas en el campo `image` de cada producto.

### Nuevos estados de producto

Agregar variantes en `StatusBadge.css` y `STATUS_LABELS` en `StatusBadge.jsx`.

---

## Archivos modificados respecto al template Vite

| Archivo | Cambio |
|---|---|
| `src/App.jsx` | Reemplazado — ahora monta `<LandingPage />` |
| `src/App.css` | Eliminado |
| `src/index.css` | Reset global + import de variables |
| `index.html` | Título, idioma es, fuente Inter |

---

## Alcance fuera de esta fase

- React Router (sidebar es visual)
- Backend / API
- Lógica real de filtros, carrito y checkout
- Tests automatizados
- Autenticación (botón Salir es visual)

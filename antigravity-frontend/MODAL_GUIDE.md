# Guía Completa del Componente Modal

## Descripción General
El componente `Modal` es un componente reutilizable de React que proporciona una interfaz modal para mostrar contenido superpuesto en la aplicación. Está diseñado con Tailwind CSS y permite personalización flexible a través de props y estilos CSS.

## Ubicación del Archivo
- **Componente principal**: `antigravity-frontend/src/components/ui/Modal.jsx`
- **Estilos relacionados**:
  - `antigravity-frontend/src/styles/variables.css` (variables globales)
  - `antigravity-frontend/src/styles/cotizaciones.css` (estilos específicos para modales de cotizaciones)
  - `antigravity-frontend/src/styles/login.css` (sombra para login)

## Estructura del Componente Modal

### Props Disponibles
```jsx
Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,     // Controla si el modal está visible
  onClose: PropTypes.func.isRequired,    // Función para cerrar el modal
  title: PropTypes.string,               // Título del modal (opcional)
  children: PropTypes.node.isRequired,   // Contenido del modal
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '6xl']), // Tamaño del modal
  bgClass: PropTypes.string               // Clase CSS para el fondo del body
};
```

### Valores por Defecto
- `size`: `'md'` (max-w-2xl)
- `bgClass`: `'bg-white'`

### Tamaños Disponibles
- `sm`: max-w-md (28rem)
- `md`: max-w-2xl (42rem) - **por defecto**
- `lg`: max-w-4xl (56rem)
- `xl`: max-w-6xl (72rem)
- `6xl`: max-w-7xl (80rem)

## Estructura HTML/CSS

### Overlay (Fondo)
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
     style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
     onClick={onClose}>
```

- **Posicionamiento**: `fixed inset-0` (ocupa toda la pantalla)
- **Z-index**: `z-50` (alto para estar encima de otros elementos)
- **Fondo**: `rgba(0,0,0,0.5)` (negro semi-transparente)
- **Clic para cerrar**: Al hacer clic en el overlay, se cierra el modal

### Contenedor Principal
```jsx
<div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
```

- **Fondo**: Blanco por defecto
- **Bordes**: `rounded-xl` (bordes redondeados grandes)
- **Sombra**: `shadow-2xl` (sombra grande)
- **Ancho**: 100% del contenedor padre
- **Altura máxima**: 90% del viewport height
- **Layout**: Flex column (header + body)

### Header
```jsx
<div className="flex items-center justify-between px-8 py-5 rounded-t-xl bg-[#FFF9F2] shrink-0 border-b-0">
  <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">{title}</h2>
  <button className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1f2937] text-white hover:bg-slate-700 transition-colors shadow-sm">
    ✕
  </button>
</div>
```

- **Fondo**: `bg-[#FFF9F2]` (crema claro)
- **Padding**: `px-8 py-5`
- **Bordes superiores redondeados**: `rounded-t-xl`
- **Botón cerrar**: `✕` en fondo gris oscuro

### Body (Contenido)
```jsx
<div className={`overflow-y-auto overflow-x-auto flex-1 rounded-b-xl ${bgClass}`}
     style={{ padding: '1.5rem 2rem' }}>
  {children}
</div>
```

- **Scroll**: `overflow-y-auto` (scroll vertical si es necesario)
- **Flex**: `flex-1` (ocupa el espacio restante)
- **Bordes inferiores redondeados**: `rounded-b-xl`
- **Padding**: `1.5rem 2rem` (24px arriba/abajo, 32px izquierda/derecha)

## Comportamiento

### Prevención de Scroll del Body
```jsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  return () => { document.body.style.overflow = ''; };
}, [isOpen]);
```

Cuando el modal está abierto, se deshabilita el scroll del body para evitar que el contenido de fondo se mueva.

### Cierre del Modal
- **Botón X**: Cierra el modal
- **Clic en overlay**: Cierra el modal
- **Función onClose**: Debe ser proporcionada por el componente padre

## Variables CSS Globales

### En `variables.css`
```css
--sombra-modal: 0 20px 60px rgba(0, 0, 0, 0.15);
```

Esta variable se usa en otros componentes, pero no directamente en el Modal.jsx.

## Modificaciones Comunes

### Cambiar Colores Globales
Para cambiar colores del modal de manera general:

1. **Fondo del header**:
   ```jsx
   // En Modal.jsx, línea ~25
   bg-[#FFF9F2] → bg-[#TU_COLOR]
   ```

2. **Fondo del body**:
   ```jsx
   // Usar prop bgClass
   <Modal bgClass="bg-gray-100" ...>
   ```

3. **Botón cerrar**:
   ```jsx
   // En Modal.jsx, línea ~28
   bg-[#1f2937] → bg-[#TU_COLOR]
   ```

### Cambiar Tamaños
Los tamaños están definidos en el objeto `sizes`. Para agregar nuevos tamaños:

```jsx
const sizes = {
  xs: 'max-w-sm',    // Agregar tamaño extra pequeño
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  '6xl': 'max-w-7xl',
  full: 'max-w-full' // Pantalla completa
};
```

### Cambiar Animaciones
Actualmente no hay animaciones. Para agregar transiciones suaves:

```jsx
// Agregar clases de Tailwind para animaciones
<div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col transition-all duration-300 ease-in-out`}>
```

### Cambiar Opacidad del Overlay
```jsx
// En Modal.jsx, línea ~18
style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
// Cambiar 0.5 por otro valor (0.3 = más transparente, 0.7 = más opaco)
```

### Hacer el Modal No Cerrable por Overlay
```jsx
// Remover el onClick del overlay
<div className="fixed inset-0 z-50 flex items-center justify-center p-4"
     style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
```

### Agregar Animación de Entrada/Salida
Para animaciones más complejas, considerar usar librerías como `react-transition-group` o `framer-motion`.

## Estilos Específicos por Módulo

### Cotizaciones (`cotizaciones.css`)
Este archivo contiene estilos específicos para los modales de cotizaciones. Los estilos más importantes:

- **Botones de producto**: `.text-left.p-2.border.border-gray-200.rounded.transition-all.text-xs`
- **Estados hover/seleccionado**: `.is-selected`, `:hover`
- **Cuadro de resumen**: `.bg-\[\#1b2532\].text-white.p-5.rounded-lg.space-y-4.shadow-xl`
- **Botones guardar/cancelar**: `.bg-\[\#5ca335\]`, `.bg-\[\#2c3338\]`

### Modificación de Estilos Específicos
Para cambiar colores en cotizaciones.css:

```css
/* Cambiar color primario */
--primary: #tu_color_hex;

/* Cambiar color oscuro */
--dark: #tu_color_oscuro_hex;
```

## Ejemplos de Uso

### Modal Básico
```jsx
import Modal from '../../components/ui/Modal';

function MiComponente() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Abrir Modal</button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Mi Modal"
        size="md"
      >
        <p>Contenido del modal</p>
      </Modal>
    </>
  );
}
```

### Modal Grande con Fondo Personalizado
```jsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Grande"
  size="6xl"
  bgClass="bg-gray-50"
>
  <div className="space-y-4">
    {/* Contenido */}
  </div>
</Modal>
```

## Consejos para Modificaciones

1. **Consistencia**: Mantén los mismos colores y estilos en todos los modales para una experiencia coherente.

2. **Responsive**: Los modales ya son responsive con `w-full` y `max-w-*`, pero considera agregar breakpoints personalizados si es necesario.

3. **Accesibilidad**: El modal ya maneja el foco y el scroll del body. Para mejor accesibilidad, considera agregar `aria-labelledby` y `aria-describedby`.

4. **Performance**: El modal solo renderiza cuando `isOpen` es true, lo cual es eficiente.

5. **Testing**: Después de modificaciones, prueba en diferentes tamaños de pantalla y con contenido largo que requiera scroll.

## Archivos que Usan el Modal
- `CotizacionForm.jsx` (cotizaciones)
- `CotizacionesPage.jsx` (cotizaciones)
- `ClientesPage.jsx` (clientes)
- `ProveedoresPage.jsx` (compras)

Para cambios globales, modifica `Modal.jsx`. Para cambios específicos de un módulo, edita los archivos CSS correspondientes.
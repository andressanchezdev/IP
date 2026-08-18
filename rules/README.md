# Guía de Reglas de Cursor
@agent/agent-token-efficiency.mdc
@react/react-state-management.mdc

Este directorio contiene reglas que el agente de Cursor seguirá automáticamente para trabajar de forma más eficiente y sin perder el enfoque.

## 📁 Estructura de Carpetas

```
.cursor/rules/
├── README.md
├── agent/          # Reglas del agente (siempre activas)
├── react/          # Reglas de React
├── testing/        # Reglas de pruebas
├── legacy/         # Reglas de código legacy
└── design/         # Reglas de diseño minimal
```

## Cómo Funcionan las Reglas

Las reglas de Cursor son archivos `.mdc` que el agente lee automáticamente según el contexto:

- **Reglas siempre activas** (`alwaysApply: true`): Se aplican en todas las conversaciones
- **Reglas por archivo** (`globs: **/*.tsx`): Se activan cuando trabajas con archivos que coinciden con el patrón

## Categorías de Reglas

### 🎯 agent/ - Reglas del Agente (Siempre Activas)

Estas reglas ayudan al agente a mantener el enfoque y evitar errores comunes:

- `agent-focus.mdc` - Mantener el hilo de la conversación
- `agent-errors.mdc` - Prevenir errores comunes
- `agent-token-efficiency.mdc` - Uso eficiente de tokens (sin narraciones innecesarias)

### ⚛️ react/ - Reglas de React

Se activan al trabajar con archivos `.tsx` o `.jsx`:

- `react-component-structure.mdc` - Estructura de componentes
- `react-state-management.mdc` - Manejo de estado
- `react-performance.mdc` - Optimización
- `react-error-handling.mdc` - Manejo de errores
- `react-best-practices.mdc` - Mejores prácticas

### 🧪 testing/ - Reglas de Testing

Se activan al trabajar con archivos de prueba:

- `testing-unit-tests.mdc` - Pruebas unitarias
- `testing-integration.mdc` - Pruebas de integración
- `testing-mocks.mdc` - Mocking y stubs
- `testing-coverage.mdc` - Cobertura de pruebas
- `testing-organization.mdc` - Organización de tests

### 🔧 legacy/ - Reglas de Código Legacy

Se activan al trabajar con código antiguo:

- `legacy-documentation.mdc` - Documentar antes de modificar
- `legacy-refactoring.mdc` - Estrategias de refactorización
- `legacy-dependencies.mdc` - Manejo de dependencias obsoletas
- `legacy-patterns.mdc` - Migración de patrones antiguos
- `legacy-communication.mdc` - Comunicación clara

### 🎨 design/ - Reglas de Diseño Minimal

Se activan al trabajar con componentes UI y estilos:

- `design-minimal-ui.mdc` - Principios de UI minimal
- `design-color-palette.mdc` - Sistema de colores
- `design-typography.mdc` - Tipografía
- `design-layout.mdc` - Layouts con Flexbox/Grid
- `design-components.mdc` - Componentes reutilizables

## Cómo Usar las Reglas

### Activación Automática

Las reglas se activan automáticamente cuando:

1. Abres un archivo que coincide con el patrón `globs`
2. Trabajas en una conversación (reglas con `alwaysApply: true`)

### Mencionar Reglas Manualmente

Puedes mencionar una regla específica en el chat usando `@`:

```
@react/react-state-management.mdc cómo debo manejar este estado?
@agent/agent-token-efficiency.mdc muéstrame las reglas de eficiencia
```

### Ver Reglas Activas

En Cursor, puedes ver qué reglas están activas en el panel de reglas.

## Mejores Prácticas

1. **Lee las reglas relevantes** antes de empezar un proyecto grande
2. **Mantén las reglas actualizadas** según evolucione tu proyecto
3. **Crea reglas específicas** para convenciones de tu equipo
4. **Mantén las reglas cortas** - menos de 50 líneas idealmente

## Personalización

Puedes modificar cualquier regla para adaptarla a tu proyecto:

1. Abre el archivo `.mdc` correspondiente
2. Edita el contenido según tus necesidades
3. Guarda el archivo - los cambios se aplican inmediatamente

## Crear Nuevas Reglas

Para crear una nueva regla:

```markdown
---
description: Descripción breve de la regla
globs: **/*.ts  # Patrón de archivos (opcional)
alwaysApply: false  # true para aplicar siempre
---

# Título de la Regla

Contenido de la regla con ejemplos...
```

## Beneficios

Con estas reglas, el agente:

- ✅ Mantiene el enfoque en lo solicitado
- ✅ Sigue convenciones consistentes
- ✅ Evita errores comunes
- ✅ Produce código de mejor calidad
- ✅ Trabaja de forma más eficiente

## Soporte

Para más información sobre las reglas de Cursor, consulta la documentación oficial o pregunta al agente usando `@cursor-guide` skill.

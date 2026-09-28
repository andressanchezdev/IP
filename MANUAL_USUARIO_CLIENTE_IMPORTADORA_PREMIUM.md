# Manual de usuario Cliente Importadora Premium

**Versión:** Borrador v0.1  
**Fecha:** 28 de septiembre de 2026  
**Autores:** Fray Sora y Andrés Santiago Sánchez — Desarrollo   
**Clasificación:** Público  
**Estado:** Documento de trabajo. Las imágenes se incorporarán en una etapa posterior.

> Este borrador reúne la información textual del manual en un solo archivo. Los datos marcados como **[POR CONFIRMAR]** deben verificarse con el equipo responsable antes de publicar la versión definitiva. No incluye credenciales de acceso.

## Control de versiones

| Versión | Fecha | Descripción | Responsable |
|---|---|---|---|
| v0.1 | 28 de septiembre de 2026 | Estructura inicial y contenido textual consolidado; sin imágenes. | Desarrollo |
| v1.0 | [POR CONFIRMAR] | Primera versión aprobada para clientes. | [POR CONFIRMAR] |

## Índice

1. [Introducción](#1-introducción)
2. [Requisitos previos](#2-requisitos-previos)
3. [Acceso a la aplicación](#3-acceso-a-la-aplicación)
4. [Descripción general de la interfaz](#4-descripción-general-de-la-interfaz)
5. [Guía de funcionalidades](#5-guía-de-funcionalidades)
   - [5.1 Iniciar sesión](#51-iniciar-sesión)
   - [5.2 Buscar productos](#52-buscar-productos)
   - [5.3 Filtrar el catálogo](#53-filtrar-el-catálogo)
   - [5.4 Consultar productos nuevos y promociones](#54-consultar-productos-nuevos-y-promociones)
   - [5.5 Consultar detalles y agregar productos al carrito](#55-consultar-detalles-y-agregar-productos-al-carrito)
   - [5.6 Gestionar el carrito](#56-gestionar-el-carrito)
   - [5.7 Crear y confirmar un pedido](#57-crear-y-confirmar-un-pedido)
   - [5.8 Registrar un abono de un pedido a crédito](#58-registrar-un-abono-de-un-pedido-a-crédito)
   - [5.9 Subir un pedido masivo con Excel](#59-subir-un-pedido-masivo-con-excel)
   - [5.10 Descargar el listado de precios](#510-descargar-el-listado-de-precios)
   - [5.11 Consultar el historial de pedidos](#511-consultar-el-historial-de-pedidos)
   - [5.12 Utilizar el chatbot](#512-utilizar-el-chatbot)
6. [Tablas de referencia](#6-tablas-de-referencia)
7. [Preguntas frecuentes](#7-preguntas-frecuentes)
8. [Solución de problemas](#8-solución-de-problemas)
9. [Buenas prácticas](#9-buenas-prácticas)
10. [Glosario](#10-glosario)
11. [Soporte y contacto](#11-soporte-y-contacto)
12. [Anexos](#12-anexos)
13. [Pendientes antes de publicar](#13-pendientes-antes-de-publicar)

## 1. Introducción

### Propósito

Este manual guía a los clientes de Importadora Premium en el uso de la aplicación: desde el acceso y la búsqueda de productos hasta la preparación de pedidos, el envío de pedidos masivos y la consulta de información relacionada con sus compras.

### Alcance

El documento describe las funciones disponibles para el cliente en la tienda, el carrito, el proceso de finalización de compra, el historial, la cartera, la carga masiva de productos y el chatbot. La disponibilidad de métodos de pago, crédito, direcciones y acciones puede depender de la cuenta del cliente.

La guía de administración de usuarios y permisos no se incluye como una tarea del cliente, porque no se ha confirmado que ese rol tenga acceso a dicha administración. Si se necesita, deberá prepararse en un manual separado para administradores.

### Público objetivo

Clientes de Importadora Premium que utilizan la aplicación web para consultar productos y gestionar pedidos. No se requieren conocimientos técnicos avanzados.

### Convenciones del documento

- Los nombres de botones y opciones se escriben entre comillas y respetan, en lo posible, el texto mostrado por la aplicación.
- Las rutas se expresan con `>`: **Tienda > Filtrar**.
- Los títulos usan redacción natural en español. PascalCase se reserva para nombres de código, no para las instrucciones dirigidas al cliente.
- **Advertencia:** una acción que puede afectar el pedido o el pago.
- **Consejo:** una recomendación para completar una tarea con menos errores.
- **Nota:** información adicional para entender una pantalla o un resultado.
- Las indicaciones **[IMAGEN PENDIENTE]** señalan espacios para incorporar capturas después de aprobar el texto.

## 2. Requisitos previos

### Equipo y conexión

- Un teléfono, tableta o computador con acceso a Internet.
- Una conexión estable durante la consulta del catálogo, la carga de archivos y la confirmación de pedidos.
- La carga de pedidos masivos requiere un dispositivo desde el que se pueda seleccionar un archivo Excel.
- **[POR CONFIRMAR]** Requisitos mínimos oficiales de memoria, tamaño de pantalla y velocidad de conexión.

### Software

- Navegador web actualizado y compatible.
- **[POR CONFIRMAR]** Navegadores y versiones mínimas oficialmente soportados.
- No se requiere instalar dependencias técnicas para utilizar la aplicación como cliente.
- Para pedidos masivos, se necesita un archivo `.xlsx` o `.xls`.
- **[POR CONFIRMAR]** Compatibilidad y pasos recomendados para uso desde navegador móvil.

### Acceso y permisos

- Se requiere una cuenta de cliente activa para iniciar sesión y completar una compra.
- Algunas funciones requieren sesión iniciada. Por ejemplo, la aplicación solicita iniciar sesión para finalizar la compra o consultar y enviar una carga masiva.
- El pago a crédito solo aparece cuando la cuenta tiene crédito disponible suficiente para cubrir el pedido.
- **[POR CONFIRMAR]** Proceso para solicitar una cuenta, recuperar la contraseña y solicitar acceso si la cuenta está bloqueada.
- No incluya ni comparta su contraseña en capturas, archivos o solicitudes de soporte.

### Dirección de acceso

**[POR CONFIRMAR]** Dirección oficial de la aplicación para clientes. No utilice una dirección local de desarrollo como enlace de producción.

## 3. Acceso a la aplicación

### Iniciar sesión

1. Abra la dirección oficial de Importadora Premium.
2. Seleccione **“Iniciar sesión”**.
3. Escriba su correo en el campo **“Correo”**.
4. Escriba su contraseña en el campo **“Contraseña”**. Use **“Mostrar contraseña”** solo si necesita revisar lo escrito y asegúrese de que nadie más pueda verla.
5. Si utiliza un dispositivo personal, puede seleccionar **“Recordarme”**. No active esta opción en un equipo compartido.
6. Seleccione **“Ingresar”**.
7. Compruebe que la navegación muestre la opción para cerrar sesión y que pueda acceder a las funciones de su cuenta.

**Resultado esperado:** se cierra el formulario de acceso y se habilitan las funciones que requieren una sesión iniciada.

**Si no puede ingresar:** compruebe que el correo esté escrito correctamente, que la contraseña no tenga espacios al inicio o al final y que el teclado no esté cambiando mayúsculas. Si el problema continúa, utilice el canal de soporte oficial.

[IMAGEN PENDIENTE: formulario de inicio de sesión, sin datos personales]

### Cerrar sesión

1. Abra las opciones de perfil si no ve directamente la opción de salida.
2. Seleccione **“Cerrar sesión”** o **“Salir”**.
3. Compruebe que la aplicación vuelva a mostrar la opción **“Iniciar sesión”**.

**Consejo:** cierre la sesión al terminar, especialmente si utiliza un dispositivo compartido.

## 4. Descripción general de la interfaz

La pantalla principal se organiza alrededor de la tienda y de una navegación lateral.

- **Navegación principal:** ofrece las vistas **“Tienda”**, **“Historial”** y **“Cartera”**. El acceso al perfil abre opciones relacionadas con la cuenta.
- **Encabezado de la tienda:** contiene el campo **“Buscar productos”**, la acción **“Filtrar”**, los accesos **“Nuevos”** y **“Promoción”**, y el botón del carrito.
- **Área de catálogo:** muestra fichas de productos. Según la información disponible, una ficha puede incluir imagen, precio, marca, categoría, descripción, modelo, referencia, selector de cantidad y una acción como **“Ordenar”**.
- **Disponibilidad:** una ficha puede mostrar **“Agotado”** u **“Ordenado”**; esas acciones aparecen deshabilitadas en esos estados.
- **Carrito:** muestra los artículos agregados, permite buscar dentro del carrito, cambiar cantidades o retirar productos y presenta el subtotal, el IVA y el total.
- **Chat:** el botón **“Chat”** abre el acceso al asistente conversacional.
- **Notificaciones:** los mensajes breves de la aplicación confirman acciones o informan errores, como una cantidad máxima alcanzada o la falta de un comprobante.

**Mapa descriptivo de pantalla:** navegación principal a un lado; encabezado de búsqueda y filtros en la parte superior; catálogo en el área central; carrito accesible desde el encabezado; Chat disponible como acceso flotante. La disposición puede cambiar según el tamaño de pantalla.

[IMAGEN PENDIENTE: pantalla principal con las zonas señaladas]

## 5. Guía de funcionalidades

### 5.1 Iniciar sesión

#### 5.1.1 ¿Para qué sirve?

Permite acceder a las funciones asociadas con la cuenta, como finalizar una compra, utilizar la carga masiva y consultar información personal.

#### 5.1.2 Requisitos previos

Tener una cuenta activa y conocer el correo y la contraseña asociados.

#### 5.1.3 Paso a paso

Siga los pasos de [Iniciar sesión](#iniciar-sesión). Si ya está dentro de la cuenta, la navegación muestra **“Cerrar sesión”** o **“Salir”**.

#### 5.1.4 Ejemplo real

Introducir el correo registrado y la contraseña, seleccionar **“Ingresar”** y comprobar que la sesión queda abierta.

[IMAGEN PENDIENTE: antes, formulario vacío; después, sesión iniciada sin datos personales]

#### 5.1.5 Resultado esperado

La cuenta queda autenticada y se habilitan las acciones para clientes con sesión.

#### 5.1.6 Errores comunes y cómo resolverlos

- **Correo o contraseña no aceptados:** revise la escritura e intente nuevamente. Si persiste, contacte a soporte para validar el acceso.
- **La sesión no se conserva:** vuelva a iniciar sesión. En un equipo compartido, no use **“Recordarme”**.
- **La aplicación no responde:** revise la conexión y vuelva a cargar la página.

### 5.2 Buscar productos

#### 5.2.1 ¿Para qué sirve?

Permite localizar productos por la información que aparece en el catálogo, como descripción, marca, modelo o referencia.

#### 5.2.2 Requisitos previos

Abra **“Tienda”**. Inicie sesión si una acción posterior lo solicita.

#### 5.2.3 Paso a paso

1. Seleccione el campo **“Buscar productos”**.
2. Escriba el nombre, la marca, el modelo o la referencia que desea encontrar.
3. Revise las fichas mostradas.
4. Para empezar otra búsqueda, utilice **“Limpiar búsqueda y filtros”** cuando esté disponible, o borre el texto del campo.

#### 5.2.4 Ejemplo real

Escriba una referencia exacta que tenga disponible y compruebe si aparece una ficha con esa referencia.

[IMAGEN PENDIENTE: búsqueda con resultados y referencia visible]

#### 5.2.5 Resultado esperado

El catálogo muestra los productos coincidentes. Si no hay coincidencias, aparece un mensaje indicando que no se encontraron productos.

#### 5.2.6 Errores comunes y cómo resolverlos

- **No aparece el producto:** revise la escritura de la referencia o pruebe con una palabra más corta.
- **No hay resultados tras usar filtros:** limpie la búsqueda y los filtros y vuelva a intentar.
- **La lista no carga:** revise la conexión y vuelva a cargar la tienda.

### 5.3 Filtrar el catálogo

#### 5.3.1 ¿Para qué sirve?

Ayuda a reducir los resultados del catálogo usando criterios como marca, categoría o modelo, cuando estén disponibles en los filtros.

#### 5.3.2 Requisitos previos

Abra **“Tienda”** y asegúrese de que el catálogo esté cargado.

#### 5.3.3 Paso a paso

1. Seleccione **“Filtrar”**.
2. Elija el criterio que desea aplicar, por ejemplo marca, categoría o modelo.
3. Seleccione un valor de la lista o búsquelo dentro de las opciones si el selector ofrece un campo de búsqueda.
4. Revise los productos resultantes.
5. Para comenzar de nuevo, utilice **“Limpiar búsqueda y filtros”** si aparece habilitado.

**[POR CONFIRMAR]** Nombres exactos de los filtros, posibilidad de combinar varios criterios y control específico para quitar cada filtro.

#### 5.3.4 Ejemplo real

Seleccione una marca disponible en el catálogo y compruebe que los resultados correspondan a esa marca.

[IMAGEN PENDIENTE: panel de filtros abierto y resultado filtrado]

#### 5.3.5 Resultado esperado

La lista se limita a los productos que coinciden con los criterios seleccionados.

#### 5.3.6 Errores comunes y cómo resolverlos

- **No hay coincidencias:** quite uno o más filtros o pruebe con otra opción.
- **No encuentra una marca/modelo:** confirme que el catálogo ya terminó de cargar y busque el valor en el selector.

### 5.4 Consultar productos nuevos y promociones

#### 5.4.1 ¿Para qué sirve?

Permite consultar los productos que la tienda clasifica como nuevos o en promoción.

#### 5.4.2 Requisitos previos

Abra la vista **“Tienda”**.

#### 5.4.3 Paso a paso

1. Seleccione **“Nuevos”** para consultar productos nuevos, o **“Promoción”** para consultar los productos destacados en promoción.
2. Revise los productos que aparecen.
3. Abra una ficha para consultar sus detalles antes de agregarlos al carrito.
4. Vuelva a la vista del catálogo o limpie los filtros para ver otros productos.

#### 5.4.4 Ejemplo real

Seleccione **“Nuevos”** y revise las fichas que devuelve la tienda.

[IMAGEN PENDIENTE: catálogo en vista de productos nuevos o promoción]

#### 5.4.5 Resultado esperado

El catálogo se actualiza con los productos asociados a la vista elegida.

#### 5.4.6 Errores comunes y cómo resolverlos

- **La lista queda vacía:** compruebe si la opción está seleccionada y quite otros filtros activos.
- **No puede agregar un producto:** revise si aparece como agotado o ya ordenado.

### 5.5 Consultar detalles y agregar productos al carrito

#### 5.5.1 ¿Para qué sirve?

Permite revisar la información del producto y preparar una selección para un pedido.

#### 5.5.2 Requisitos previos

Encuentre el producto en **“Tienda”**. Para finalizar la compra, necesitará iniciar sesión.

#### 5.5.3 Paso a paso

1. Seleccione la ficha o la acción **“Ver detalles de…”** para abrir el detalle del producto.
2. Revise descripción, marca, modelo, referencia, precio y disponibilidad.
3. Si el producto admite pedido, indique la cantidad en el selector de cantidad.
4. Seleccione **“Ordenar”**.
5. Abra el carrito y compruebe que el producto y la cantidad aparezcan correctamente.
6. Repita el proceso para cada producto que desee incluir.

**Advertencia:** que una referencia aparezca en el catálogo no garantiza que tenga unidades disponibles. Compruebe el estado y vuelva a revisar el carrito antes de confirmar.

#### 5.5.4 Ejemplo real

Seleccione una ficha disponible, revise la referencia y agregue una unidad. Compruebe que el total del carrito refleje el artículo.

[IMAGEN PENDIENTE: detalle de producto y producto agregado al carrito]

#### 5.5.5 Resultado esperado

El artículo aparece en el carrito con la cantidad elegida y sus importes.

#### 5.5.6 Errores comunes y cómo resolverlos

- **La ficha muestra “Agotado”:** no es posible ordenar esa referencia desde esa ficha en ese momento.
- **La ficha muestra “Ordenado”:** revise el carrito para confirmar si el producto ya está incluido.
- **No se actualiza el carrito:** vuelva a abrirlo y compruebe la conexión; si el producto no aparece, intente agregarlo una vez más.

### 5.6 Gestionar el carrito

#### 5.6.1 ¿Para qué sirve?

Permite revisar, buscar, modificar o retirar los productos antes de crear el pedido.

#### 5.6.2 Requisitos previos

Agregue al menos un producto. Inicie sesión para completar la compra.

#### 5.6.3 Paso a paso

1. Seleccione el botón del carrito.
2. Use **“Buscar en el carrito”** para localizar un artículo, si lo necesita.
3. Cambie la cantidad en el campo **“Cantidad de…”**. La cantidad debe ser al menos uno y no puede superar el máximo permitido por la disponibilidad.
4. Para retirar un artículo, seleccione el control **“Eliminar…”** asociado con ese producto.
5. Revise el subtotal, el IVA y el total.
6. Cuando la selección esté correcta, seleccione **“Finalizar compra”**.

#### 5.6.4 Ejemplo real

Busque un artículo dentro del carrito, ajuste su cantidad y confirme que el importe de la línea y los totales se actualicen.

[IMAGEN PENDIENTE: carrito con cantidades, subtotal, IVA y total]

#### 5.6.5 Resultado esperado

El carrito conserva únicamente los productos y cantidades seleccionados y muestra sus totales.

#### 5.6.6 Errores comunes y cómo resolverlos

- **“Cantidad máxima alcanzada”:** el valor solicitado supera las unidades permitidas. Reduzca la cantidad.
- **No encuentra un producto:** borre el texto de **“Buscar en el carrito”**.
- **El carrito está vacío:** vuelva a la tienda y agregue los productos necesarios.
- **“Finalizar compra” no está disponible:** compruebe que el carrito tenga productos.

### 5.7 Crear y confirmar un pedido

#### 5.7.1 ¿Para qué sirve?

Convierte los artículos revisados en el carrito en una solicitud de pedido con una dirección y un método de pago.

#### 5.7.2 Requisitos previos

- Inicie sesión.
- Revise productos, cantidades, precios y total del carrito.
- Tenga una dirección de entrega disponible o los datos para agregar una nueva.
- Para pagar a crédito, la cuenta debe tener cupo suficiente.
- Para transferencia, tenga listo un comprobante en imagen o PDF.

#### 5.7.3 Paso a paso

1. En el carrito, seleccione **“Finalizar compra”**.
2. En **“Entrega”**, elija una dirección registrada y seleccione **“Establecer dirección”**; o agregue una dirección en **“Agregar una nueva dirección de entrega”** y confírmela; también puede elegir una ubicación en el mapa y confirmarla.
3. Compruebe que la dirección seleccionada sea la correcta.
4. En **“Método de pago”**, seleccione una opción disponible: efectivo, transferencia o crédito cuando su cuenta tenga cupo.
5. Si elige efectivo, seleccione esa opción y revise el valor a pagar.
6. Si elige transferencia, consulte los datos de transferencia mostrados, adjunte el comprobante y seleccione la opción para confirmar el método. Se aceptan imágenes y archivos PDF.
7. Si elige crédito, revise el crédito disponible y el plazo que aparece. El total del pedido no puede superar el cupo disponible.
8. Revise nuevamente el resumen del pedido.
9. Seleccione la acción para confirmar el pedido y espere el mensaje de resultado.

**Advertencia:** seleccionar un método de pago no equivale a verificar un comprobante. Los comprobantes de transferencia pueden quedar pendientes de revisión.

#### 5.7.4 Ejemplo real

Desde un carrito con productos, seleccionar una dirección registrada, elegir un método disponible y confirmar el pedido después de revisar el resumen.

[IMAGEN PENDIENTE: pasos de entrega, método de pago y resumen antes de confirmar]

#### 5.7.5 Resultado esperado

La aplicación confirma el resultado de la operación y el pedido puede consultarse en **“Historial”**. **[POR CONFIRMAR]** Texto exacto de confirmación y estados iniciales que muestra la aplicación.

#### 5.7.6 Errores comunes y cómo resolverlos

- **Debe iniciar sesión:** ingrese a su cuenta e intente finalizar de nuevo.
- **No hay dirección disponible:** agregue una dirección nueva o seleccione una ubicación en el mapa.
- **No se seleccionó una ubicación:** elija un punto en el mapa antes de confirmarlo.
- **Falta el comprobante de transferencia:** adjunte un archivo de imagen o PDF.
- **No hay crédito disponible o el pedido supera el cupo:** seleccione otro método de pago o comuníquese con el área responsable del crédito.
- **La confirmación no termina:** no repita la operación de inmediato; revise el historial y contacte a soporte si no aparece el pedido.

### 5.8 Registrar un abono de un pedido a crédito

#### 5.8.1 ¿Para qué sirve?

Permite enviar un pago parcial para un pedido a crédito y consultar el saldo pendiente y los abonos registrados.

#### 5.8.2 Requisitos previos

- Inicie sesión.
- Abra un pedido a crédito que permita registrar abonos.
- Tenga los datos solicitados por el formulario. Para transferencia, tenga un comprobante en imagen o PDF.

#### 5.8.3 Paso a paso

1. Abra **“Historial”** y seleccione el pedido correspondiente.
2. Abra la sección de pagos o abonos del pedido.
3. Revise el saldo pendiente, el monto verificado y el disponible para un nuevo abono.
4. Seleccione **“Efectivo”** o **“Transferencia”**.
5. Complete los datos que solicite la pantalla. El importe debe respetar el saldo disponible para abonar.
6. Si elige transferencia, adjunte el comprobante de pago.
7. Seleccione **“Formalizar pago”**.
8. Revise el mensaje de resultado y vuelva a la información de pagos para consultar el estado del abono.

#### 5.8.4 Ejemplo real

Registrar un abono inferior o igual al saldo disponible y comprobar que aparezca en la lista de abonos del pedido.

[IMAGEN PENDIENTE: resumen de abonos y formulario de nuevo abono, sin datos bancarios personales]

#### 5.8.5 Resultado esperado

El abono se envía a revisión. La aplicación indica que está **“en revisión”** hasta que un asesor lo verifique. El saldo verificado puede no cambiar hasta que se apruebe el pago.

#### 5.8.6 Errores comunes y cómo resolverlos

- **Faltan datos de pago:** complete los campos obligatorios.
- **El abono supera el saldo:** reduzca el monto al disponible para un nuevo abono.
- **No se adjuntó el comprobante:** seleccione una imagen o PDF válido.
- **No fue posible registrar el pago:** verifique el pedido y vuelva a intentarlo; si persiste, contacte a soporte.
- **El abono aparece en revisión:** no lo registre nuevamente; espere la verificación o consulte a soporte.

### 5.9 Subir un pedido masivo con Excel

#### 5.9.1 ¿Para qué sirve?

Permite preparar una lista de productos en Excel, comparar las cantidades solicitadas con el stock y enviar los productos elegidos al carrito.

#### 5.9.2 Requisitos previos

- Inicie sesión.
- Tenga un archivo `.xlsx` o `.xls`.
- Use la plantilla **`formatoexel.xlsx`** y conserve las columnas **`Codigo`** y **`cantidad`**.
- Incluya al menos cinco códigos válidos para procesar el pedido. El máximo es 251 líneas en total, contando la fila de encabezado; es decir, hasta 250 filas de productos.
- Cada cantidad debe ser un número entero mayor que cero.

#### 5.9.3 Paso a paso

1. Abra las opciones de perfil y entre en **“Subida masiva”**. **[POR CONFIRMAR]** Nombre exacto y ruta visible del acceso en la interfaz.
2. Seleccione **“Descargar plantilla”**.
3. En Excel, escriba un código de producto y su cantidad en cada fila. Mantenga los encabezados de la primera fila.
4. Guarde el archivo como `.xlsx` o `.xls`.
5. En la aplicación, seleccione **“Cargar archivo”** y elija el documento.
6. Espere a que termine la conversión. Revise las líneas omitidas y los códigos duplicados; los códigos repetidos se consolidan sumando sus cantidades.
7. Seleccione **“Procesar pedido”** para comparar el archivo con el stock disponible.
8. Revise el resultado de cada código: **“Ok”**, **“con novedad”** o **“agotado”**.
9. Seleccione **“Continuar”** para enviar los productos Ok y con novedad al carrito, o **“Continuar sin novedad”** para enviar únicamente los productos Ok. Seleccione **“Cancelar”** si no desea continuar con ese procesamiento.
10. Revise el resumen de productos enviados y los que no se agregaron.
11. Abra el carrito y continúe con la revisión y confirmación normal del pedido.

**Nota:** subir el archivo no confirma ni paga el pedido; los productos seleccionados se envían al carrito.

#### 5.9.4 Ejemplo real

En la plantilla, escribir cinco códigos válidos con cantidades enteras positivas, cargar el archivo, comparar el stock y enviar al carrito solo los productos Ok.

[IMAGEN PENDIENTE: plantilla, comparación de stock y resultado de envío al carrito]

#### 5.9.5 Resultado esperado

La aplicación informa los resultados de la comparación y agrega al carrito la selección confirmada. Las líneas incorrectas, agotadas o excluidas quedan identificadas para revisión.

#### 5.9.6 Errores comunes y cómo resolverlos

- **Tipo de archivo no permitido:** use `.xlsx` o `.xls`.
- **Encabezados incorrectos:** la primera fila debe contener `Codigo` y `cantidad`, en columnas distintas. El sistema reconoce ambos nombres aunque estén intercambiados; también reconoce `stock` como nombre histórico de la columna de cantidad.
- **Código sin cantidad o cantidad sin código:** complete ambos datos en la misma fila.
- **Cantidad inválida:** use un entero mayor que cero, por ejemplo `3`; no use cero, números negativos ni fracciones.
- **Menos de cinco códigos válidos:** agregue suficientes líneas válidas antes de procesar.
- **Producto agotado o con novedad:** revise el estado en el panel y elija si desea continuar incluyendo novedades o solo con productos Ok.
- **Archivo con códigos duplicados:** el sistema suma sus cantidades; revise el total antes de enviar al carrito.
- **No hay sesión iniciada:** ingrese a la cuenta y vuelva a cargar o procesar el archivo.

### 5.10 Descargar el listado de precios

#### 5.10.1 ¿Para qué sirve?

Permite obtener un listado de precios en PDF o preparar una descarga en Excel.

#### 5.10.2 Requisitos previos

Tenga abierta la tienda y espere a que el catálogo esté disponible.

#### 5.10.3 Paso a paso

1. Abra el perfil y seleccione la función del listado de precios. **[POR CONFIRMAR]** Nombre exacto de la opción y si requiere sesión.
2. En **“Método de descarga”**, seleccione **“PDF”** o **“Excel”**.
3. Si seleccionó PDF, espere a que el navegador descargue `listado-precios.pdf`.
4. Si seleccionó Excel, siga las opciones que muestre la aplicación para completar la descarga. **[POR CONFIRMAR]** Paso final de la exportación Excel.
5. Abra el archivo descargado y compruebe que se pueda leer.

#### 5.10.4 Ejemplo real

Generar el listado en PDF y comprobar que el archivo descargado contenga productos del catálogo.

[IMAGEN PENDIENTE: selección de formato y descarga completada]

#### 5.10.5 Resultado esperado

Se descarga el formato elegido con la información disponible del catálogo.

#### 5.10.6 Errores comunes y cómo resolverlos

- **No inicia la descarga:** revise los permisos de descarga del navegador y vuelva a seleccionar el formato.
- **El listado está incompleto o vacío:** compruebe que el catálogo cargó y vuelva a generarlo.

### 5.11 Consultar el historial de pedidos

#### 5.11.1 ¿Para qué sirve?

Permite consultar pedidos asociados a la cuenta y abrir el detalle disponible.

#### 5.11.2 Requisitos previos

Inicie sesión.

#### 5.11.3 Paso a paso

1. Seleccione **“Historial”** en la navegación principal.
2. Busque el pedido que desea consultar.
3. Abra la tarjeta o el detalle correspondiente.
4. Revise los artículos, el estado y la información de pago que muestre la aplicación.
5. Si el pedido a crédito permite abonos, utilice la sección de pagos para registrar uno.

**[POR CONFIRMAR]** Opciones de búsqueda, filtros, estados completos, etiquetas y posibilidad de cancelar pedidos.

#### 5.11.4 Ejemplo real

Abrir un pedido existente y localizar su estado y detalle.

[IMAGEN PENDIENTE: vista de Historial y detalle de pedido con información anonimizada]

#### 5.11.5 Resultado esperado

Se muestra la información del pedido seleccionado.

#### 5.11.6 Errores comunes y cómo resolverlos

- **No encuentra el pedido:** confirme que inició sesión con la cuenta que lo creó.
- **El detalle no carga:** actualice la vista y compruebe la conexión.
- **El estado no cambia inmediatamente:** espere la actualización o consulte a soporte; no cree otro pedido por duplicado.

### 5.12 Utilizar el chatbot

#### 5.12.1 ¿Para qué sirve?

Ofrece un canal conversacional para realizar consultas sobre productos o el uso de la tienda, según las capacidades habilitadas.

#### 5.12.2 Requisitos previos

Abra la tienda y seleccione **“Chat”**.

#### 5.12.3 Paso a paso

1. Seleccione **“Chat”**.
2. Escriba una pregunta concreta en el campo del chat.
3. Envíe el mensaje y lea la respuesta.
4. Si la respuesta no resuelve la consulta, vuelva a formularla con más datos o contacte a soporte.

**[POR CONFIRMAR]** Nombre del campo de texto, alcance de las consultas, posibilidad de buscar/agregar productos desde el chat, horario y derivación a un asesor.

#### 5.12.4 Ejemplo real

Consultar por una referencia de producto y verificar la respuesta en el catálogo antes de hacer el pedido.

[IMAGEN PENDIENTE: chat con una consulta de ejemplo, sin datos personales]

#### 5.12.5 Resultado esperado

El chat muestra una respuesta o una indicación para buscar ayuda por otro canal.

#### 5.12.6 Errores comunes y cómo resolverlos

- **No aparece una respuesta:** compruebe la conexión y vuelva a enviar una pregunta breve.
- **La respuesta no coincide con el catálogo:** confirme la información directamente en la ficha del producto y reporte la diferencia.
- **La consulta requiere atención de una persona:** use los canales oficiales de soporte.

## 6. Tablas de referencia

### Campos de formularios conocidos

| Campo | Tipo | Obligatorio | Ejemplo | Validación o nota |
|---|---|---:|---|---|
| Correo | Texto/correo | Sí | cliente@empresa.com | Debe corresponder a una cuenta activa. |
| Contraseña | Contraseña | Sí | No incluir en este manual | Se utiliza para iniciar sesión; no compartir. |
| Cantidad del producto | Número entero | Sí para ordenar | 2 | Debe respetar la disponibilidad mostrada. |
| Nueva dirección | Texto | Si se agrega una dirección | Calle, número, ciudad | Complete una dirección que permita identificar el lugar de entrega. |
| Comprobante de transferencia | Archivo | Sí para transferencia | Imagen o PDF | La aplicación acepta imágenes y PDF. |
| Codigo | Texto en Excel | Sí por fila válida | 7700000 | Encabezado de plantilla; cada código identifica un producto. |
| cantidad | Número entero en Excel | Sí por fila válida | 3 | Debe ser mayor que cero. |
| Monto del abono | Importe | Sí | Según saldo | No puede superar el saldo disponible para abonar. |

**[POR CONFIRMAR]** Límites oficiales de tamaño de archivo para comprobantes y carga masiva.

### Estados y etiquetas observados

| Texto | Significado para el cliente |
|---|---|
| Agotado | La ficha no permite ordenar ese producto en el estado actual. |
| Ordenado | La acción de la ficha aparece deshabilitada; compruebe el carrito para confirmar si ya está incluido. |
| Ok | El producto de la carga masiva está disponible según la comparación mostrada. |
| Con novedad | La comparación encontró una diferencia que debe revisar antes de continuar. |
| Agotado (carga masiva) | El producto no se agrega como disponible desde esa comparación. |
| En revisión | Un abono fue enviado y espera verificación por un asesor. |
| Pendiente / error | **[POR CONFIRMAR]** Definición y uso exactos en las pantallas de pedido. |

Los colores asociados a cada estado deben confirmarse con la interfaz final antes de describirlos; no se asignan colores en esta versión textual.

### Mensajes conocidos

| Mensaje o situación | Causa probable | Qué hacer |
|---|---|---|
| Inicie sesión para finalizar la compra | No hay sesión autenticada. | Inicie sesión y vuelva al carrito. |
| Inicia sesión para consultar stock masivo | No hay sesión autenticada al procesar el archivo. | Inicie sesión y vuelva a procesarlo. |
| Suba el comprobante de transferencia | Falta el archivo de comprobante. | Adjunte una imagen o PDF. |
| El pedido supera el cupo de crédito | El total excede el crédito disponible. | Reduzca el pedido o seleccione otro método disponible. |
| El abono supera el saldo disponible | El monto excede el saldo habilitado para el nuevo abono. | Ajuste el monto al disponible indicado. |
| Cantidad máxima alcanzada | La cantidad supera la disponibilidad permitida. | Reduzca la cantidad. |
| No se encontraron productos | La búsqueda o combinación de filtros no devolvió resultados. | Revise el texto y limpie los filtros. |

### Atajos de teclado

No se han confirmado atajos de teclado propios de la aplicación. Para acceder a los controles, use la navegación habitual del navegador con `Tab`, `Mayús + Tab` y `Enter` cuando el control lo permita.

## 7. Preguntas frecuentes

**¿Necesito iniciar sesión para buscar productos?**  
El catálogo puede mostrarse antes del inicio de sesión; para finalizar una compra o procesar una carga masiva se solicita una sesión. Consulte [Iniciar sesión](#iniciar-sesión).

**¿Qué hago si un producto aparece como “Agotado”?**  
No puede ordenarlo desde esa ficha en ese momento. Revise otras opciones o consulte más adelante. Consulte [Consultar detalles y agregar productos al carrito](#55-consultar-detalles-y-agregar-productos-al-carrito).

**¿La carga masiva confirma el pedido?**  
No. Envía la selección al carrito; debe revisar el carrito y completar el proceso de compra. Consulte [Subir un pedido masivo con Excel](#59-subir-un-pedido-masivo-con-excel).

**¿Puedo enviar un abono con transferencia?**  
Sí, cuando la opción esté disponible para el pedido. Debe adjuntar el comprobante y el abono queda en revisión. Consulte [Registrar un abono](#58-registrar-un-abono-de-un-pedido-a-crédito).

**¿Cuándo aparece el pago a crédito?**  
Cuando la cuenta tiene crédito disponible suficiente para cubrir el total del pedido. Consulte [Crear y confirmar un pedido](#57-crear-y-confirmar-un-pedido).

**¿Qué formato de archivo acepta la carga masiva?**  
Archivos `.xlsx` o `.xls` con las columnas `Codigo` y `cantidad`. Consulte [Subir un pedido masivo con Excel](#59-subir-un-pedido-masivo-con-excel).

**¿Qué hago si el abono aparece “en revisión”?**  
No lo registre de nuevo. Espere la verificación del asesor o comuníquese con soporte.

## 8. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| La aplicación no carga | Conexión interrumpida o servicio temporalmente no disponible | Revise Internet, actualice la página y vuelva a intentar. Si persiste, contacte a soporte. |
| No puedo iniciar sesión | Correo o contraseña incorrectos, o cuenta sin acceso | Revise los datos y solicite ayuda por el canal oficial si el problema continúa. |
| El catálogo no muestra resultados | Texto de búsqueda o filtros demasiado específicos | Limpie búsqueda y filtros y vuelva a intentar. |
| No puedo cambiar una cantidad | Límite de disponibilidad o actualización en curso | Espere a que termine la actualización y use una cantidad dentro del máximo. |
| No puedo finalizar la compra | No inició sesión o el carrito está vacío | Inicie sesión y confirme que el carrito contenga productos. |
| La transferencia no se confirma | Falta el comprobante o el archivo no se pudo leer | Seleccione una imagen o PDF válido y vuelva a confirmar. |
| El pago a crédito no aparece | La cuenta no tiene cupo disponible suficiente | Revise el crédito disponible o elija otro método habilitado. |
| El pedido masivo no procesa el archivo | Extensión, encabezados o cantidades inválidas | Use `.xlsx`/`.xls`, revise `Codigo` y `cantidad` y corrija valores no enteros o menores que uno. |
| Un código de la carga masiva se omitió | La fila está incompleta o contiene una cantidad inválida | Revise el número de fila y el motivo mostrado en el panel de información. |
| El abono quedó en revisión | Está pendiente de verificación por un asesor | Espere la validación; no vuelva a registrar el mismo pago. |
| No encuentra un pedido en Historial | Inició sesión con otra cuenta o la lista no se actualizó | Compruebe la cuenta, actualice la vista y contacte a soporte si falta el pedido. |

Los errores HTTP como 401, códigos internos y mensajes técnicos no se incluyen porque no se han validado en las pantallas para clientes.

## 9. Buenas prácticas

- Revise descripción, marca, modelo, referencia y disponibilidad antes de ordenar.
- Compruebe productos, cantidades, dirección, método de pago y total antes de confirmar.
- No comparta sus credenciales ni deje abierta la sesión en equipos compartidos.
- En pagos por transferencia, adjunte el comprobante correcto y guarde una copia hasta que el abono sea verificado.
- No registre de nuevo un pago que ya aparece en revisión.
- En la carga masiva, use la plantilla vigente, revise las líneas omitidas y valide los códigos duplicados antes de enviar.
- Espere la respuesta de la aplicación antes de volver a pulsar una acción de confirmación.
- Guarde mensajes de error y anote la hora aproximada en que ocurrió el problema; no incluya contraseñas en reportes.
- Considere los precios y el stock como información que debe revisarse nuevamente antes de completar el pedido.

## 10. Glosario

- **Abono:** pago parcial aplicado a una deuda o pedido a crédito.
- **Carrito:** lista temporal de productos que se revisa antes de finalizar una compra.
- **Cartera:** sección asociada a información financiera de la cuenta. **[POR CONFIRMAR]** Contenido exacto visible para el cliente.
- **Código o referencia:** identificador que permite distinguir un producto en el catálogo y en la plantilla de carga masiva.
- **Comprobante:** archivo que respalda una transferencia o pago.
- **Crédito disponible:** cupo que la cuenta puede usar para hacer pedidos a crédito.
- **Historial:** vista donde se consultan pedidos asociados a la cuenta.
- **IVA:** impuesto que se muestra separado en el resumen del carrito.
- **Pedido masivo:** selección de varios productos preparada desde una hoja Excel.
- **Stock:** cantidad disponible de un producto según la información consultada por la aplicación.
- **En revisión:** estado de un pago que todavía no ha sido verificado por un asesor.

## 11. Soporte y contacto

**[POR COMPLETAR ANTES DE PUBLICAR]**

- Correo de soporte: [POR CONFIRMAR]
- Teléfono o WhatsApp: [POR CONFIRMAR]
- Chat o mesa de ayuda: [POR CONFIRMAR]
- Horario de atención: [POR CONFIRMAR]
- Tiempo de respuesta esperado (SLA): [POR CONFIRMAR]

Al reportar un problema, incluya:

1. Correo de la cuenta o identificador de cliente, por un canal privado y oficial.
2. Fecha y hora aproximada del incidente.
3. Nombre de la sección y pasos realizados.
4. Texto exacto del mensaje de error.
5. Navegador y dispositivo utilizados.
6. Captura de pantalla sin contraseñas, datos bancarios completos ni información de otras personas.
7. Referencia del producto o número del pedido si es necesario.

Nunca envíe su contraseña ni datos completos de tarjetas o medios de pago.

## 12. Anexos

### Diagramas de flujo en texto

**Compra normal:**  
Tienda → buscar o filtrar productos → revisar ficha → agregar al carrito → revisar cantidades y total → finalizar compra → establecer entrega → seleccionar método de pago → confirmar pedido → consultar en Historial.

**Pedido masivo:**  
Descargar plantilla → completar códigos y cantidades → cargar archivo → validar filas → comparar stock → elegir productos con o sin novedades → enviar selección al carrito → revisar carrito → finalizar compra.

**Abono de pedido a crédito:**  
Historial → abrir pedido → revisar saldo → elegir efectivo o transferencia → completar datos y adjuntar comprobante si corresponde → formalizar pago → esperar verificación.

### Capturas y recursos visuales

Las capturas, ampliaciones, diagramas gráficos y enlaces a plantillas se incorporarán después de revisar y aprobar el contenido textual. No incluya información personal o financiera en las imágenes.

## 13. Pendientes antes de publicar

- Confirmar la dirección oficial de producción y si la aplicación dispone de una experiencia móvil soportada.
- Verificar requisitos de navegador, hardware, conectividad, tamaños máximos de archivos y permisos por módulo.
- Revisar en la interfaz los pasos y nombres exactos de filtros, perfil, descarga Excel, carga masiva, historial, chatbot y abonos.
- Probar un pedido de principio a fin en un entorno de prueba y validar mensajes de confirmación, estados y consecuencias de cada método de pago.
- Confirmar qué estados y badges ve el cliente, qué significan y qué colores corresponden.
- Confirmar canales de soporte, horarios y SLA.
- Confirmar escritura oficial de autores, fecha de publicación y versión final.
- Validar este manual con una persona cliente antes de publicar.
- Solo después de aprobar el texto, reemplazar las marcas **[IMAGEN PENDIENTE]** con capturas finales y actualizadas.

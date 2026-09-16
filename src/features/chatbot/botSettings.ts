const STORAGE_KEY = 'botip-settings'

import { clampPipelineConfig, DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from './pipelineConfig'
import { readStore, removeStore } from './storage'
import { getActiveDocument, saveActiveDocument, resetActiveMarkdown, settingsFromDocument } from './botip/store'
import { ACTIVE_MD_KEY, FACTORY_LOCAL_KEY, UPLOADED_MD_KEY } from './botip/schema'
import { variantBias } from './botip/sliders'
import type { SessionLanguage } from './sessionContext'
import { LANDING_CONTACT, LANDING_PAYMENTS } from './fallbacks'
import { liveBrandNames, liveCatalogLabels, liveShipping } from './botip/liveData'
import { nextAskPhrase } from './askPhrase'

export const VACANCY_EXACT_WORDS = [
  'vacantes',
  'vacante',
  'trabajos',
  'trabajar',
  'empleo',
  'postular',
  'curriculum',
  'hoja',
] as const

export type BotReplyConfig = {
  keywords: string
  paused?: string
  text: string
  texts?: string[]
  textsEn?: string[]
}

export type BotSettings = {
  minChars: number
  maxChars: number
  blockMinutes: number
  burstLimit: number
  replyDelayMs: number
  welcome: string
  replies: Record<string, BotReplyConfig>
  pipeline: PipelineConfig
}

export const BOT_REPLY_FIELDS: Array<{ id: string; label: string }> = [
  { id: 'catalog', label: 'Catálogo' },
  { id: 'whatsapp', label: 'WhatsApp / contacto' },
  { id: 'product', label: 'Producto del catálogo' },
  { id: 'parts', label: 'Repuestos' },
  { id: 'namedPart', label: 'Pieza sin ficha' },
  { id: 'accessory', label: 'Accesorio' },
  { id: 'attention', label: 'Atención / asesor / ayuda' },
  { id: 'complaint', label: 'Queja' },
  { id: 'quote', label: 'Precio / stock' },
  { id: 'vacancy', label: 'Vacantes' },
  { id: 'location', label: 'Ubicación' },
  { id: 'credit', label: 'Crédito' },
  { id: 'payment', label: 'Medios de pago' },
  { id: 'shipping', label: 'Envíos / domicilio' },
  { id: 'orderStatus', label: 'Estado de pedido' },
  { id: 'company', label: 'Empresa' },
  { id: 'social', label: 'Redes' },
  { id: 'thanks', label: 'Gracias' },
  { id: 'greeting', label: 'Saludo (palabras clave)' },
  { id: 'insult', label: 'Insulto' },
  { id: 'sexual', label: 'Contenido no admitido' },
  { id: 'violence', label: 'Tema no admitido' },
  { id: 'food', label: 'Alimento' },
  { id: 'creature', label: 'No es repuesto' },
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'person', label: 'Nombre no encontrado' },
  { id: 'fallback', label: 'Sin coincidencia' },
  { id: 'fallbackCompany', label: 'Palabra de la empresa' },
  { id: 'fallbackShort', label: 'Palabra corta sin coincidencia' },
  { id: 'fallbackLong', label: 'Palabra larga sin coincidencia' },
  { id: 'fallbackWide', label: 'Mensaje extenso sin coincidencia' },
  { id: 'fallbackMixed', label: 'Mayúsculas mezcladas' },
  { id: 'teamMember', label: 'Persona del equipo' },
  { id: 'teamGroup', label: 'Grupo del equipo' },
  { id: 'teamSuggest', label: 'Nombre parecido del equipo' },
  { id: 'teamEmpty', label: 'Grupo del equipo vacío' },
  { id: 'ackRepeat', label: 'Reconocimiento de repetición' },
  { id: 'ackKeywordRepeat', label: 'Palabra repetida' },
  { id: 'fallbackMenu', label: 'Menú tras fallbacks' },
  { id: 'humanHandoff', label: 'Traslado a asesor' },
  { id: 'clarification', label: 'Aclaración (vacío o emoji)' },
  { id: 'disambiguation', label: 'Desambiguación' },
  { id: 'rectifyTypo', label: 'Rectificar typo' },
  { id: 'rectifyFocus', label: 'Rectificar foco' },
  { id: 'rectifyNeedPart', label: 'Pedir pieza' },
  { id: 'farewell', label: 'Despedida' },
]

export const DEFAULT_REPLIES: Record<string, BotReplyConfig> = {
  greeting: {
    keywords: 'hola, buenas, buenos, saludo, hey, holas, holis, hello, hi, saludos, buen, tardes, noches',
    text: '',
    texts: [
      'Hola, bienvenido al chat Premium. soy botIP! Cuéntanos tu duda o el motivo de la consulta.',
      'Buenas, te atiendo. Soy botIP! Dime qué pieza, marca o modelo buscas.',
      'Hola, con gusto te ayudo. Soy botIP! Escribe tu consulta cuando quieras.',
      'Hola, soy botIP! Cuéntanos tu duda o el motivo de la consulta.',
    ],
    textsEn: [
      'Hello, how can I help you?',
      'Hi! What do you need?',
      'Good day, how can I help?',
    ],
  },
  catalog: {
    keywords: 'catalogo, productos, surtido, linea, producto, products, catalog, catalogs, catalogos, listado, portafolio, pdf, referencias, inventario, categorias, categoria, lineas',
    text: 'Veras nuestro catalogo cuenta con productos como: {catalog}. Puedes verlo completo en línea, descargarlo o cotizar con un asesor real al la linea {phone}. Escribe la pieza que buscas y te oriento.',
    texts: [
      'Estas son las líneas del catálogo: {catalog}. Elige si lo ves en línea, lo descargas o hablas con un asesor al {phone}. Dime la pieza para afinar.',
      'El catálogo incluye {catalog}. Puedes abrirlo, descargarlo o pedir cotización por WhatsApp {phone}. ¿Qué pieza necesitas?',
    ],
  },
  whatsapp: {
    keywords: 'whatsapp, contacto, telefono, celular, correo, email, llamar, escribir, wsp, wa, numero, cel, mail, mensajear, contactanos, comunicarme',
    text: 'Puedes escribirnos por WhatsApp al {phone} o al correo {email}. {ask}',
    texts: [
      'WhatsApp {phone} y correo {email} están disponibles. Si ya sabes el producto, indícame marca y modelo para pasar una consulta completa.',
      'Escríbenos al {phone}',
    ],
  },
  product: {
    keywords: 'referencia, ficha, sku, codigo, item, articulo, coincidencia, coincidencias, oem',
    text: 'Encontré {term} en inventario:\n\n{offer}\n\nSi quieres, Validamos la informacion con un asesor real',
    texts: [
      'Para {term} el precio de lista es este:\n\n{offer}\n\nDime marca y modelo si necesitas otra referencia, o escribe al {phone}.',
      '{term} coincide con {names}.\n\n{offer}\n\nUn asesor real confirma que siga vigente.',
    ],
  },
  parts: {
    keywords: 'repuesto, repuestos, pieza, piezas, componente, componentes, recambio, recambios, refaccion, refacciones',
    text: 'Estas son las líneas de repuestos publicadas: {catalog}. {ask} Precio y stock los confirma un asesor al {phone}.',
    texts: [
      'En el catálogo están {catalog}. Escribe la pieza que buscas y el vehículo para orientarte, o cotiza con un asesor al {phone}.',
      'Publicamos {catalog}. Indícame pieza, marca y modelo o elige una de las opciones a continuación.',
    ],
  },
  namedPart: {
    keywords: 'ficha, equivalencia, generico, original, compatible, consulta, consultar',
    text: '{term} no tiene ficha en este chat, así que no invento datos inprecisos. {ask} .',
    texts: [
      'No ubico una ficha publicada para {term}. {ask} También puedes consultar con un asesor al {phone}.',
      '{term} no está en el catálogo de este chat. Pásame marca y modelo del vehículo o escríbenos al {phone} para validar la referencia.',
    ],
  },
  accessory: {
    keywords: 'accesorio, accesorios, complemento, complementos, extra, extras, equipamiento, proteccion',
    text: '{term} se consulta con un asesor porque aquí no confirmo ficha, precio ni stock. {ask} WhatsApp {phone}.',
    texts: [
      'No tengo ficha de {term} en este chat. {ask} Un asesor te confirma disponibilidad al {phone}.',
      '{term} no está detallado aquí. Indica marca y modelo del vehículo o escribe al {phone}.',
    ],
  },
  attention: {
    keywords: 'asesor, asesoria, comprar, obtener, atencion, ayuda, servicio, asesores, soporte, humano, orientacion',
    text: 'te ayudo con eso, contacta a un asesor al {phone}. el te ayudara a obtener la informacion que necesitas.',
    texts: [
      'Con gusto te ayudo. {ask} O habla con un asesor al {phone}.',
      'Puedo orientarte aquí o pasarte con alguien del equipo al {phone}. {ask}',
    ],
  },
  complaint: {
    keywords: 'queja, reclamo, reclamar, quejar, molestia, problema, garantia, pqr, devolucion, inconforme, inconformidad, falla, defectuoso',
    text: 'Lamentamos el inconveniente. Cuéntame qué pasó (producto, pedido o fecha si los tienes) y te ayudo a dejarlo radicado. También puedes escribir al WhatsApp {phone} o a {email}.',
    texts: [
      'Registramos tu molestia. Describe el caso con el mayor detalle que tengas, o envíalo al {phone} / {email} para que un asesor lo atienda.',
      'Vamos a ayudarte. Cuéntame el problema o contacta {phone} y {email} para dejar constancia.',
    ],
  },
  quote: {
    keywords: 'precio, precios, stock, cotizar, cotizacion, vale, cuesta, disponibilidad, valor, costo, cuanto, tarifa, existencias, cotice',
    text: 'Referencia de {term}: precio y stock publicados (pueden estar desactualizados; un asesor real debe confirmarlos). {ask} WhatsApp {phone}. Catálogo: {catalog}.',
    texts: [
      'Sobre {term}: te paso el valor de referencia del inventario. Puede estar desactualizado; valídalo con un asesor al {phone}.',
      'Hay ficha de {term} con precio y existencias de referencia. Un asesor real confirma el dato vigente al {phone}.',
    ],
  },
  vacancy: {
    keywords: VACANCY_EXACT_WORDS.join(', '),
    text: 'Las vacantes vigentes están en Trabaja con nosotros. Ahí ves el perfil, los requisitos y puedes postularte. Si quieres orientación, escríbenos al {phone}.',
    texts: [
      'Revisa las ofertas publicadas en Trabaja con nosotros y postula desde esa sección. También te oriento por WhatsApp {phone}.',
      'El proceso de empleo está en Trabaja con nosotros. Entra a ver vacantes o escribe al {phone} si tienes una duda puntual.',
    ],
  },
  location: {
    keywords: 'direccion, ubicacion, ubicados, donde, sede, local, sucursal, mapa, maps, google, llegar, llego, horario, horarios, visita, visitarnos, medellin, antioquia, colombia, ciudad, encuentran, alpujarra, hora, horas, abre, abren, abierto, abierta, cierra, cierran',
    text: 'Estamos en {area}, {region} ({country}), en {address}, {landmark}. Atendemos {hours}.',
    texts: [
      'Nuestro local está en {city}, {region} ({country}). Dirección {address}, {landmark}. Horario: {hours}.',
      'Nos encuentras en {city}, {region}. {address}. {landmark}. Horario {hours}. WhatsApp {phone}.',
    ],
  },
  credit: {
    keywords: 'credito, creditos, sistecredito, fiado, financiacion, financiamiento, financiar, cupo',
    text: 'Para temas de crédito, únicamente los clientes Premium que llevan una gran trayectoria pueden disfrutar de este beneficio. No manejamos Sistecrédito ni financiación de terceros.',
    texts: [
      'El crédito es un beneficio solo para clientes Premium con gran trayectoria. Sistecrédito u otras financieras no las manejamos aquí.',
      'No abrimos crédito al público general. Si ya eres cliente Premium con trayectoria, un asesor valida tu cupo.',
    ],
  },
  payment: {
    keywords: 'pago, pagos, pagar, efectivo, transferencia, consignar, consignacion, comprar, obtener, adquirir, medios, nequi, daviplata, bancolombia, cuenta',
    text: 'Manejamos pago inmediato con efectivo o transferencia. {bank}, {accountType}, a nombre de {holder}. {accountNumber}.',
    texts: [
      'Puedes pagar de inmediato en efectivo o por transferencia. Datos: {bank} · {accountType} · {holder}.',
      'Para comprar: efectivo o transferencia inmediata. Banco {bank}, {accountType}, titular {holder}.',
    ],
  },
  shipping: {
    keywords: 'envio, envios, enviar, domicilio, domicilios, despacho, contraentrega',
    text: 'Hacemos envíos a todo el país. Envío gratis en el {cityScope} si la compra es mayor a ${freeMetroFrom} COP. También hacemos envíos el mismo día y seguros hasta la puerta.',
    texts: [
      'Enviamos a todo el país. En el {cityScope} el envío es gratis en compras mayores a ${freeMetroFrom} COP. Hay envíos el mismo día y seguros hasta la puerta.',
      'Domicilios a nivel nacional. Gratis en el {cityScope} desde ${freeMetroFrom} COP. Mismo día y entrega segura en la puerta.',
    ],
  },
  orderStatus: {
    keywords: 'pedido, pedidos, estado, rastreo, rastrear, tracking',
    text: 'Este chat no consulta el estado de pedidos. Esa información la confirma tu vendedor o ingresando a tu usuario cliente Premium.',
    texts: [
      'No rastreamos pedidos desde el chat. Consulta con tu vendedor o entra a tu usuario cliente Premium para ver el estado.',
      'El estado del pedido no está en este chat. Un vendedor o tu usuario cliente Premium te lo muestran.',
    ],
  },
  rectifyTypo: {
    keywords: '',
    text: '¿Quisiste decir {guess}?',
    texts: ['¿Te referías a {guess}?'],
  },
  rectifyFocus: {
    keywords: '',
    text: '¿Seguimos con {term} o me dices otra pieza?',
    texts: ['No relacioné eso con una pieza nueva. ¿Seguimos con {term} o cambias de producto?'],
  },
  rectifyNeedPart: {
    keywords: '',
    text: 'Si me pasas la pieza y el vehículo, te oriento mejor.',
    texts: [
      '¿Qué repuesto buscas y para qué moto es?',
      'Con el nombre de la pieza y la referencia del vehículo te afino la respuesta.',
      'Cuéntame qué componente necesitas y de qué marca o modelo.',
    ],
  },
  company: {
    keywords: 'vision, mision, nosotros, marca, marcas, empresa, quienes, somos, historia, aliados, aliadas, acerca',
    text: 'Importadora Premium: puedes conocer la visión, el equipo y marcas aliadas como {brands}. Dime si buscas empresa, una persona del equipo o un producto.',
    texts: [
      'Somos Importadora Premium. En el sitio están visión, equipo y marcas ({brands}). ¿Quieres datos de la empresa o de un repuesto?',
      'Te oriento: visión, misión, equipo o marcas aliadas ({brands}) están en la página. También puedo ayudarte con una pieza si me das marca y modelo.',
    ],
  },
  social: {
    keywords: 'instagram, tiktok, facebook, redes, red, ig, face, youtube, seguir, seguirme, fanpage, social',
    text: 'Puedes seguirnos en {social}. Elige la red desde las opciones o dime si buscas un producto.',
    texts: [
      'Estamos en {social}. Abre la que uses o cuéntame la pieza que necesitas.',
      'Encuentranos en Nuestras {social}.',
    ],
  },
  thanks: {
    keywords: 'gracias, gracia, adios, chao, bye, thanks, listo, perfecto, milgracias, muchas, ok, hasta',
    text: 'Con todo el gusto. Dime si necesitas existe algo mas en lo que pueda ayudarte?, estoy a tu servicio 24/7.',
    texts: [
      'Con gusto. Si surge otra consulta, aqui sigo.',
      'Listo. Dime si buscas otra pieza o un asesor.',
      'Gracias a ti. Quedo atento si necesitas algo mas.',
    ],
  },
  insult: {
    keywords: 'insulto, groseria, groserias, ofensa, irrespeto, grosero',
    text: 'no comprendo tu consulta. Dime el producto o el motivo, con respeto por favor o el chat sera bloqueado por violar los terminos de uso de el chat.',
    texts: [
      'Esa expresion no es una consulta. Dime el producto con respeto o el chat se bloquea.',
      'Mantengamos el respeto. Escribe la pieza o el motivo de la consulta.',
      'No atiendo groserias. Dime que producto buscas o se bloquea el chat.',
    ],
  },
  sexual: {
    keywords: 'contenido, inapropiado, explicito, inadecuado',
    text: 'no comprendo tu consulta. Proporcionamemas informacion sobre el producto que buscas.',
    texts: [
      'Eso no es una consulta de este chat. Dime el producto que buscas.',
      'Aqui atendemos repuestos. Escribe la pieza, la marca o el modelo.',
      'Ese tema no aplica. Dime que repuesto o accesorio necesitas.',
    ],
  },
  violence: {
    keywords: 'amenaza, violento, agresion, delito',
    text: '{term} es un termino que viola los terminos de uso de el chat. Dime si estas interesado en consultar algo mas?.',
    texts: [
      '{term} no es un tema de este chat. Si buscas un repuesto, dime la pieza.',
      'No atiendo consultas sobre {term}. Escribe una pieza, marca o modelo.',
      '{term} queda fuera de este chat. Dime si quieres un producto del catalogo.',
    ],
  },
  food: {
    keywords: 'alimento, alimentos, comida, bebidas',
    text: '{term} no comprendo tu consulta. Importadora premium es tu mejor aliado en cuanto a repuestos y accesorios, así que proporcioname mas informacion sobre tu consulta.',
    texts: [
      '{term} no es un producto de este chat. Dime la pieza que buscas.',
      'Aqui no manejamos {term}. Escribe el repuesto, la marca o el modelo.',
      '{term} no esta en el catalogo. Dime que pieza necesitas para el vehiculo.',
    ],
  },
  creature: {
    keywords: 'animal, animales, mascota, mascotas',
    text: '{term} no es un repuesto. proporcioname la informacion exacta relacionada con el producto que buscas.',
    texts: [
      '{term} no es un repuesto. Dime la pieza que buscas.',
      'No relaciono {term} con el catalogo. Escribe el nombre de la pieza.',
      '{term} no aplica aqui. Indica marca, modelo y pieza.',
    ],
  },
  vehicle: {
    keywords: 'vehiculo, vehiculos, automotor, rodante',
    text: '{term} es un vehículo, en nuestro catalogo encontraras miles de referencias que te ayudan con el cuidado y mantenimiento de las piesas de tu vehiculo. Dime la marca, el modelo y la pieza.',
    texts: [
      '{term} es un vehiculo, no un producto. Dime la marca, el modelo y la pieza.',
      'Para un {term} necesito la pieza concreta y el modelo.',
      '{term} no es una ficha del catalogo. Escribe que repuesto buscas y el modelo.',
    ],
  },
  person: {
    keywords: 'nombre, persona, alguien, quien',
    text: '{term} no coincide con ninguna respuesta que pueda darte. puedes repetir la consulta o elegir alguna de las opciones a continuación.',
    texts: [
      '{term} no esta en el equipo ni en el catalogo. Dime si es un nombre o una pieza.',
      'No ubico a {term}. Escribe un nombre del equipo o la pieza que buscas.',
      '{term} no me alcanza. Dime si quieres un asesor o un repuesto.',
    ],
  },
  fallback: {
    keywords: 'no se, nose, nada, cualquiera, otra, otros',
    text: 'No reconoci "{term}" como una consulta de catálogo. {ask} O elige una de las opciones.',
    texts: [
      'No ubiqué "{term}". {ask}',
      'Con "{term}" no me alcanza. {ask}',
      'No relacioné "{term}". {ask} O usa las opciones.',
    ],
  },
  fallbackCompany: {
    keywords: 'premium, importacion, importar, importadores',
    text: '"{term}" se refiere a nosotros, Importadora Premium. Esa palabra sola no me dice qué necesitas. ¿Buscas un repuesto concreto, por ejemplo pastillas AKT?',
    texts: [
      '"{term}" habla de la empresa, no del producto. {ask}',
      'Importadora Premium somos nosotros. ¿Qué repuesto buscas, por ejemplo pastillas AKT?',
      '"{term}" no me dice el repuesto. {ask}',
    ],
  },
  fallbackShort: {
    keywords: 'si, no, ok, ya',
    text: '"{term}" es muy corto. Escribe el nombre de la pieza y el modelo.',
    texts: [
      '"{term}" es muy corto. Escribe la pieza y el modelo, por ejemplo filtro AKT.',
      'Con "{term}" no alcanzo. Completa con la pieza y la marca o el modelo.',
      '"{term}" no me da un dato útil. Dime la pieza y el vehículo.',
    ],
  },
  fallbackLong: {
    keywords: 'palabra, termino, texto',
    text: 'No ubiqué "{term}" como pieza. Repite la consulta con la marca o el modelo.',
    texts: [
      '"{term}" no la ubiqué como pieza. Escríbela completa o dime marca y modelo.',
      'No relacioné "{term}". Si es una pieza, usa el nombre de catálogo.',
      '"{term}" es larga y no la asocié. Dime la pieza con marca o modelo.',
    ],
  },
  fallbackWide: {
    keywords: 'parrafo, extenso, largo',
    text: 'El mensaje es muy largo y no lo relacioné. Déjalo en una frase con la pieza y el modelo, por ejemplo pastillas para AKT 125.',
    texts: [
      'Hay demasiada información junta. Resume: qué pieza buscas y el modelo.',
      'Acorta el mensaje a una frase con la pieza y el modelo del vehículo.',
      'No relacioné el texto largo. Deja pieza + modelo, por ejemplo pastillas AKT 125.',
    ],
  },
  fallbackMixed: {
    keywords: 'mayusculas, minusculas, mezclado',
    text: 'No entendí "{term}". Escríbelo con mayúsculas normales y agrega la pieza o el producto.',
    texts: [
      '"{term}" mezcla mayúsculas. Escríbelo normal y agrega la pieza o el modelo.',
      'No leí bien "{term}". Usa mayúsculas normales y dime la pieza.',
      'Escribe "{term}" sin mezclar mayúsculas y suma la pieza o el producto.',
    ],
  },
  teamMember: {
    keywords: 'colaborador, colaboradora, integrante, funcionario',
    text: 'claro que si! {name} pertenece a nuestro grupo {role}. su linea de contacto es {phone}.',
    texts: [
      '{name} es {role}. Puedes escribirle al {phone}.',
      'En el equipo esta {name} ({role}). Contacto: {phone}.',
      '{name} atiende como {role}. Su telefono es {phone}.',
    ],
  },
  teamGroup: {
    keywords: 'asesores, administrativos, grupo, area, departamento',
    text: 'Nuestro grupo se conforma por  {group} están {names}.  puedes escribirme el nombre de el integrante y te doy el teléfono.',
    texts: [
      'En el grupo de {group} estan {names}. Dime un nombre y te paso el telefono.',
      'El area de {group} incluye a {names}. Escribe un nombre para el contacto.',
      '{group}: {names}. Dime a quien buscas.',
    ],
  },
  teamSuggest: {
    keywords: 'parecido, similar, talvez, quizas',
    text: 'No encuentro a {asked}. ¿Te refieres a {name}? Es {role} y puedes escribirle al {phone}.',
    texts: [
      'No ubico a {asked}. Puede ser {name} ({role}). Telefono {phone}.',
      '{asked} no coincide. {name} es {role} y su linea es {phone}.',
      'No hay {asked} en el listado. Te suena {name}? Es {role}, {phone}.',
    ],
  },
  teamEmpty: {
    keywords: 'nadie, vacio, personal',
    text: 'Por ahora no hay {group} en el equipo.',
    texts: [
      'En este momento no hay {group} publicados.',
      'El grupo de {group} no tiene integrantes visibles ahora.',
      'Aun no hay {group} en el carrusel del equipo.',
    ],
  },
  ackRepeat: {
    keywords: 'mismo, igual',
    text: 'Sigo con eso.',
    texts: [
      'Claro, seguimos con {topic}.',
      'De acuerdo, {topic}.',
    ],
    textsEn: [
      'Do you mean the same as before?',
      'You are repeating that. Still about {topic}?',
      'As I mentioned, {topic}. Shall we continue?',
    ],
  },
  ackKeywordRepeat: {
    keywords: '',
    text: "Veo que mencionas '{token}' varias veces. ¿Quieres precio, disponibilidad o compatibilidad?",
    texts: [
      "Entiendo que te interesa '{token}'. ¿Qué necesitas saber?",
      "'{token}' es importante para ti. ¿Me concretas qué buscas?",
    ],
    textsEn: [
      "You mention '{token}' a lot. Price, availability or compatibility?",
      "I see '{token}' matters. What do you need to know?",
      "'{token}' is the focus. Can you be more specific?",
    ],
  },
  fallbackMenu: {
    keywords: '',
    text: 'Elige una opción para continuar:',
    texts: [
      'Puedo ayudarte con una de estas opciones:',
      'Dime por cuál quieres seguir:',
    ],
    textsEn: [
      'Pick an option to continue:',
      'I can help with one of these:',
      'Which one do you want?',
    ],
  },
  humanHandoff: {
    keywords: '',
    text: '¿Quieres que te conecte con un asesor humano?',
    texts: [
      'Puedo pasarte con una persona del equipo. ¿Te parece?',
      'Si prefieres, te derivo con un humano. ¿Lo hago?',
    ],
    textsEn: [
      'Want me to connect you with a human advisor?',
      'I can pass you to the team. Sound good?',
      'Prefer a person? I can hand you off.',
    ],
  },
  clarification: {
    keywords: '',
    text: 'No alcancé a leer un mensaje. {ask}',
    texts: [
      'Necesito un texto con letras. Dime qué buscas.',
      'Cuando quieras, escribe tu consulta en palabras.',
    ],
    textsEn: [
      'I could not read a message. Write the part, brand or model.',
      'I need words. Tell me what you need.',
      'Write your question when you are ready.',
    ],
  },
  disambiguation: {
    keywords: '',
    text: '¿Te refieres a {left} o a {right}?',
    texts: [
      'Puede ser {left} o {right}. ¿Cuál de las dos?',
      'Para no adivinar: ¿{left} o {right}?',
    ],
    textsEn: [
      'Do you mean {left} or {right}?',
      'It could be {left} or {right}. Which one?',
      'To avoid guessing: {left} or {right}?',
    ],
  },
  farewell: {
    keywords: 'adios, chao, bye, hasta',
    text: '¡Hasta luego!',
    texts: [
      'Que tengas buen día.',
      '¡Nos vemos! Cualquier cosa, aquí estoy.',
    ],
    textsEn: [
      'See you later!',
      'Have a good day.',
      'Bye! I am here if you need anything.',
    ],
  },
}

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  minChars: 3,
  maxChars: 1000,
  blockMinutes: 1,
  burstLimit: 8,
  replyDelayMs: 3000,
  welcome:
    'Hola, soy BotIP, tu asistente Premium. Puedes indicarme cuál es tu duda en un solo mensaje. Puedo ayudarte a encontrar piezas o productos por marca o modelo, o si necesitas consultar el precio de un repuesto o accesorio, información sobre nosotros o hablar con un asesor.',
  replies: DEFAULT_REPLIES,
  pipeline: DEFAULT_PIPELINE_CONFIG,
}

const LEGACY_REPLY_TEXT = new Set([
  '{term}',
  '{term}. Dime un nombre para el dato.',
  'Catálogo. Elige una opción:',
  'WhatsApp {phone}. Correo {email}.',
  '{term}: {names}. Indica marca o modelo para afinar.',
  'Encontré {term} en el catálogo: {names}. Dime la marca o el modelo para afinar la búsqueda.',
  '{term} coincide con varios productos en el catálogo, proporcioname mas detalles sobre el producto para poder ayudarte.',
  ' {term} coincide con varios productos en el catálogo, proporcioname mas detalles sobre el producto para poder ayudarte.',
  'Repuestos publicados: {catalog}. Dime la pieza.',
  '{term} no tiene ficha aquí. Indica marca o modelo. Precio y stock los confirma un asesor.',
  '{term} no tiene ficha aquí. Indica marca o modelo.',
  'Te atiendo. Dime el producto o la referencia. WhatsApp {phone}.',
  'Lamentamos el inconveniente. Cuéntame qué pasó. WhatsApp {phone} o {email}.',
  'Precio y stock{term} no los confirmo aquí. Indica marca o modelo.',
  'Visión, equipo y marcas ({brands}).',
  'Redes: {social}.',
  'Estamos en {address}.',
  'No tengo información sobre "{term}".proprocioname mas informacion o elije alguna de las opciones de abajo.',
  'No tengo información sobre "{term}". Dame más detalle o elige una de las opciones de abajo.',
  'No entontre coincidencia con "{term}". Dame más detalles o elige una opcione acontinuacion.',
  'No relacioné "{term}". Dime la pieza, la marca o el modelo.',
  'Puedo ayudarte con: 1) precios 2) productos 3) soporte técnico.',
  'No confirmo el precio ni el stock de {term} en este chat. Dime la marca o el modelo.',
  'Te muestro el catálogo. Elige alguna opcion acontinuacion.',
  'Te muestro el catálogo. Elige cómo quieres verlo.',
  'Puedes visitarnos en {address}.',
  'aqui te indico todos nuestros canales de contacto, puedes escribirnos por WhatsApp al {phone} o al correo {email}.',
  'En el catálogo encontré coincidencias para {term}: {names}. Precio y stock no los confirmo aquí. {ask}.',
  'Tu consulta de {term} coincide con {names}. {ask} El valor lo confirma un asesor real.',
])

const LEGACY_KEYWORDS: Record<string, string[]> = {
  greeting: ['hola, buenas, buenos, saludo, hey'],
  catalog: [
    'catalogo, productos, surtido, linea',
    'catalogo, productos, surtido, linea,producto ,products ,catalog ,catalogs,',
  ],
  whatsapp: ['whatsapp, contacto, telefono, celular, correo, email, llamar, escribir'],
  product: [''],
  parts: ['repuesto, repuestos, pieza, piezas, componente'],
  namedPart: [''],
  accessory: ['accesorio, accesorios'],
  attention: ['asesor, asesoria, pedido, comprar, obtener, atencion, ayuda, servicio'],
  complaint: ['queja, reclamo, reclamar, quejar, molestia, problema, garantia'],
  quote: ['precio, precios, stock, cotizar, cotizacion, vale, cuesta, disponibilidad'],
  vacancy: [
    'vacante, vacantes, empleo, trabajo, postular, hoja',
    'vacante, vacantes, empleo, trabajo, postular, hoja, curriculum, cv, laboral, contratar, ofertas',
  ],
  location: ['direccion, ubicacion, donde, sede, local'],
  credit: [''],
  payment: [''],
  shipping: [''],
  orderStatus: [''],
  company: ['vision, mision, equipo, nosotros, marca, marcas, empresa, quienes'],
  social: ['instagram, tiktok, facebook, redes, red'],
  thanks: ['gracias, gracia, adios, chao, bye'],
  insult: [''],
  sexual: [''],
  violence: [''],
  food: [''],
  creature: [''],
  vehicle: [''],
  person: [''],
  fallback: [''],
  fallbackCompany: [''],
  fallbackShort: [''],
  fallbackLong: [''],
  fallbackWide: [''],
  fallbackMixed: [''],
  teamMember: [''],
  teamGroup: [''],
  teamSuggest: [''],
  teamEmpty: [''],
}

function keywordFingerprint(raw: string) {
  return parseKeywordList(raw).map((item) => item.word).join(',')
}

function isLegacyKeywords(id: string, raw: string | undefined) {
  const current = keywordFingerprint(raw ?? '')
  return (LEGACY_KEYWORDS[id] ?? []).some((item) => keywordFingerprint(item) === current)
}

function pickVersion(seed: string, versions: readonly string[]) {
  if (!versions.length) return ''
  const index = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % versions.length
  return versions[index] || versions[0]
}

export type LiveContact = {
  phoneDisplay: string
  email: string
  addressLabel: string
  address: string
  city: string
  region: string
  country: string
  area: string
  landmark: string
  hoursWeekdays: string
  hoursSaturday: string
  hoursDisplay: string
  mapsShareUrl: string
  lat: number
  lng: number
  zoom: number
  whatsappUrl: string
  social: Array<{ id?: string; label: string; href: string }>
}

export type LivePayments = {
  cashLabel: string
  transferLabel: string
  bank: string
  accountType: string
  accountNumber: string
  holder: string
}

function digitsFromPhone(display: string) {
  return display.replace(/\D/g, '')
}

/** Contacto y pagos del `botIP.md` activo, con respaldo a los valores de fábrica. */
export function liveContact(): LiveContact {
  const base: LiveContact = {
    ...LANDING_CONTACT,
    social: LANDING_CONTACT.social.map((item) => ({ ...item })),
  }
  try {
    const raw = getActiveDocument().catalog?.contact as Partial<LiveContact> | undefined
    if (!raw || typeof raw !== 'object') return base
    const merged: LiveContact = {
      ...base,
      ...raw,
      social: Array.isArray(raw.social) && raw.social.length ? raw.social : base.social,
    }
    if (raw.phoneDisplay && !raw.whatsappUrl) {
      const digits = digitsFromPhone(raw.phoneDisplay)
      if (digits) merged.whatsappUrl = `https://wa.me/${digits}`
    }
    return merged
  } catch {
    return base
  }
}

export function livePayments(): LivePayments {
  const base: LivePayments = { ...LANDING_PAYMENTS }
  try {
    const raw = getActiveDocument().catalog?.payments as Partial<LivePayments> | undefined
    if (!raw || typeof raw !== 'object') return base
    return { ...base, ...raw }
  } catch {
    return base
  }
}

export function liveIdentity() {
  try {
    return getActiveDocument().identity
  } catch {
    return {
      name: 'botIP',
      role: 'Asistente de Importadora Premium',
      language: 'es',
      tone: 'claro y cercano',
      formality: 3,
      naturalness: 3,
    }
  }
}

function liveCatalog() {
  return liveCatalogLabels() || 'el catálogo publicado'
}

function liveBrands() {
  return liveBrandNames().slice(0, 3).join(', ') || 'nuestras marcas'
}

function builtinVars(): Record<string, string> {
  const contact = liveContact()
  const payments = livePayments()
  const identity = liveIdentity()
  return {
    phone: contact.phoneDisplay,
    email: contact.email,
    address: contact.address,
    hours: contact.hoursDisplay,
    city: contact.city,
    landmark: contact.landmark,
    area: contact.area,
    region: contact.region,
    country: contact.country,
    bank: payments.bank,
    accountType: payments.accountType,
    accountNumber: payments.accountNumber || 'el número vigente que te confirma un asesor',
    holder: payments.holder,
    freeMetroFrom: liveShipping().freeMetroFrom,
    cityScope: liveShipping().cityScope,
    social: contact.social.map((item) => item.label).join(', '),
    catalog: liveCatalog(),
    brands: liveBrands(),
    botName: identity.name,
    botRole: identity.role,
    term: 'el producto que buscas',
    token: 'eso',
    topic: 'eso',
    ask: nextAskPhrase(),
    left: 'esta opción',
    right: 'la otra',
    asked: 'ese nombre',
    name: 'la persona',
    role: 'el equipo',
    group: 'el grupo',
    names: 'el equipo',
    offer: 'Un asesor confirma precio y disponibilidad al escribirte.',
  }
}

export function interpolate(source: string, vars: Record<string, string | number> = {}) {
  const all = { ...builtinVars(), ...vars }
  const filled = Object.entries(all).reduce(
    (text, [key, value]) => text.split(`{${key}}`).join(String(value ?? '')),
    source,
  )
  return filled.replace(/\{[a-zA-Z]+\}/g, (token) => {
    const key = token.slice(1, -1)
    return builtinVars()[key] ?? ''
  })
}

export function getBotSettings(): BotSettings {
  try {
    const fromMd = settingsFromDocument(getActiveDocument())
    const legacy = readStore('local', STORAGE_KEY)
    const hasMarkdownCopy =
      Boolean(readStore('local', ACTIVE_MD_KEY)) ||
      Boolean(readStore('local', UPLOADED_MD_KEY)) ||
      Boolean(readStore('local', FACTORY_LOCAL_KEY))
    if (!hasMarkdownCopy && legacy) {
      const saved = JSON.parse(legacy) as Partial<BotSettings>
      const replies = { ...fromMd.replies }
      for (const [id, config] of Object.entries(saved.replies ?? {})) {
        const text = config?.text?.trim()
        if (text && LEGACY_REPLY_TEXT.has(text)) continue
        const next = {
          ...fromMd.replies[id],
          ...config,
          texts: fromMd.replies[id]?.texts,
          textsEn: fromMd.replies[id]?.textsEn,
        }
        if (isLegacyKeywords(id, config?.keywords)) {
          next.keywords = fromMd.replies[id]?.keywords ?? next.keywords
        }
        replies[id] = next
      }
      const merged: BotSettings = {
        ...fromMd,
        ...saved,
        replies,
        pipeline: clampPipelineConfig(saved.pipeline ?? fromMd.pipeline),
      }
      saveBotSettings(merged)
      return merged
    }
    return fromMd
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_BOT_SETTINGS)) as BotSettings
  }
}

export function saveBotSettings(next: BotSettings) {
  const doc = getActiveDocument()
  saveActiveDocument({
    ...doc,
    origin: doc.origin === 'original' ? 'modificado' : doc.origin,
    settings: next,
    exportedAt: new Date().toISOString(),
  })
}

export function resetBotSettings() {
  resetActiveMarkdown()
  removeStore('local', STORAGE_KEY)
}

export type ApplyBotOptions = {
  language?: SessionLanguage
  avoid?: readonly string[]
  seed?: string
}

export const TEXTS_EN: Record<string, string[]> = {
  catalog: [
    'The published catalog includes {catalog}. You can view it, download the PDF or quote with an advisor at {phone}. Tell me the part you need.',
    'Catalog lines: {catalog}. Open it, download it or write {phone}. Which part are you looking for?',
  ],
  whatsapp: [
    'WhatsApp {phone} and email {email} are available. If you already know the product, send brand and model so the quote is complete.',
    'Write to {phone} or {email}. Part, brand and model help us answer fully.',
  ],
  product: [
    'Inventory for {term}:\n\n{offer}\n\nAn advisor can validate the current figure at {phone}.',
    '{term} matches {names}.\n\n{offer}\n\nA real advisor confirms it is still valid.',
  ],
  parts: [
    'Published parts lines: {catalog}. Tell me the exact part, brand and model. Price is confirmed at {phone}.',
    'We list {catalog}. Name the part and vehicle, or quote with an advisor at {phone}.',
  ],
  namedPart: [
    '{term} has no card here, so I do not invent price or stock. {ask} An advisor confirms the reference at {phone}.',
    'No published card for {term}. {ask} You can also write {phone}.',
  ],
  accessory: [
    '{term} is checked with an advisor. I do not confirm a card, price or stock here. {ask} WhatsApp {phone}.',
    'No card for {term} here. {ask} Availability is confirmed at {phone}.',
  ],
  attention: [
    'I can help. Tell me the part, brand and model, or write an advisor at {phone}.',
    'Send the part and vehicle, or talk to someone at {phone}. {ask}',
  ],
  complaint: [
    'Sorry about that. Tell me what happened (product, order or date if you have them), or write {phone} / {email}.',
    'We will help. Describe the issue or contact {phone} and {email} to log it.',
  ],
  quote: [
    'Reference for {term}: published price and stock may be outdated; a real advisor must confirm. {ask} WhatsApp {phone}. Catalog: {catalog}.',
    'About {term}: I can share a reference value. A real advisor validates the current figure at {phone}.',
  ],
  vacancy: [
    'Open roles are in Work with us, with profile and how to apply. I can also help at {phone}.',
    'Check published offers in Work with us, or write {phone} with a specific question.',
  ],
  location: [
    'Hours are {hours}. We are at {address}. Open the map or ask for directions on WhatsApp {phone}.',
    'Visit us at {address}. Hours: {hours}. The map or an advisor at {phone} can guide you.',
  ],
  shipping: [
    'We ship nationwide. Free shipping in the {cityScope} on purchases over ${freeMetroFrom} COP. Same-day and door-safe delivery.',
    'Nationwide delivery. Free in the {cityScope} from ${freeMetroFrom} COP. Same day to your door.',
  ],
  orderStatus: [
    'This chat does not track orders. Ask your advisor or sign in to your Premium client account.',
    'Order status is not available here. Your seller or Premium client login can show it.',
  ],
  rectifyTypo: ['Did you mean {guess}?'],
  rectifyFocus: ['Do we stay with {term} or do you want another part?'],
  rectifyNeedPart: ['Tell me the part and, if you have them, the brand or model.'],
  company: [
    'Importadora Premium: vision, team and partner brands such as {brands} are on the site. Ask for the company or for a part.',
    'See vision, team and brands ({brands}). If you need a part, tell me brand and model.',
  ],
  social: [
    'Find us on {social}. Open a network or tell me the part you need.',
    'Our networks: {social}. For catalog or price, send part, brand and model.',
  ],
  thanks: ['Gladly. If another question comes up, I am here.', 'Done. Ask for another part or an advisor.', 'Thank you. I remain available.'],
  fallback: [
    'I did not match "{term}" as a part, brand or model. Add the part and the vehicle, or pick an option below.',
    '"{term}" is not enough to quote. Tell me part, brand and model, or use the options.',
  ],
}

export function listReplyVariants(id: string, language: SessionLanguage = 'es') {
  const reply = getBotSettings().replies[id]
  if (!reply) return [] as string[]
  if (language === 'en') {
    const fromMd = [...(reply.textsEn ?? [])].map((item) => item.trim()).filter(Boolean)
    if (fromMd.length) return [...new Set(fromMd)]
    return [...new Set((TEXTS_EN[id] ?? []).map((item) => item.trim()).filter(Boolean))]
  }
  return [reply.text, ...(reply.texts ?? [])].map((item) => item.trim()).filter(Boolean)
}

export function applyBotText(
  id: string,
  fallback: string,
  vars: Record<string, string | number> = {},
  options: ApplyBotOptions = {},
) {
  let variants = listReplyVariants(id, options.language || 'es')
  if (!variants.length) variants = [fallback]
  const interpolated = variants.map((item) => interpolate(item, vars))
  const avoid = new Set(options.avoid ?? [])
  const unused = interpolated.filter((item) => !avoid.has(item))
  const pool = unused.length ? unused : interpolated
  const bias = variantBias(getActiveDocument().sliders)
  if (bias.preferFirst || !bias.rotate) {
    return interpolate(pool[0] || fallback, vars)
  }
  const seed = options.seed || String(vars.term ?? vars.name ?? id)
  return interpolate(pickVersion(seed, pool) || fallback, vars)
}

export function defaultKeywords(id: string): string[] {
  const fromMd = getBotSettings().replies[id]?.keywords
  return parseKeywordList(fromMd || DEFAULT_REPLIES[id]?.keywords || '').map((item) => item.word)
}

export type BotKeywordItem = {
  word: string
  enabled: boolean
}

export function parseKeywordList(keywords: string, paused = ''): BotKeywordItem[] {
  const pausedSet = new Set(
    paused.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean),
  )
  const seen = new Set<string>()
  const list: BotKeywordItem[] = []
  for (const raw of keywords.split(',')) {
    const word = raw.trim().toLowerCase()
    if (!word || seen.has(word)) continue
    seen.add(word)
    list.push({ word, enabled: !pausedSet.has(word) })
  }
  return list
}

export function serializeKeywordList(list: readonly BotKeywordItem[]) {
  return {
    keywords: list.map((item) => item.word).join(', '),
    paused: list.filter((item) => !item.enabled).map((item) => item.word).join(', '),
  }
}

export function keywordsOf(id: string, fallback: readonly string[] = []) {
  const reply = getBotSettings().replies[id]
  const raw = reply?.keywords
  if (!raw?.trim()) return fallback.length ? [...fallback] : defaultKeywords(id)
  return parseKeywordList(raw, reply?.paused).filter((item) => item.enabled).map((item) => item.word)
}

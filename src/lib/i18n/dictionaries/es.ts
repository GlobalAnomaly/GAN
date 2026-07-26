import type { Dictionary } from "./en";

/**
 * Spanish. Addressed with "tú" rather than "usted": the site talks to its
 * reader directly in English and switching to a formal register here would
 * make the Spanish read like a different, stiffer publication.
 */
export const es: Dictionary = {
  nav: {
    cases: "Casos",
    science: "Ciencia",
    browse: "Explorar",
    about: "Acerca de",
    search: "Búsqueda",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    skipToContent: "Ir al contenido",
  },

  support: {
    nav: "Invítame a un café",
    footer: "Invítame a un café",
    footerLead:
      "Gratis, y así va a seguir. Si te resulta útil, puedes ayudar a cubrir lo que cuesta mantenerlo.",
  },

  language: {
    label: "Idioma",
    readIn: "Leer en",
    machineNotice:
      "Esta versión ha sido traducida automáticamente. La versión inglesa es la de referencia.",
  },

  footer: {
    tagline:
      "Un archivo abierto. Cada relato se escribe a partir de fuentes, cada afirmación se atribuye, y lo que sigue siendo desconocido se dice con claridad.",
    about: "Acerca de y nuestros principios",
    submit: "Envíanos algo",
    privacy: "Privacidad",
    terms: "Términos",
    takedown: "Solicitudes de retirada",
    mediaNote:
      "Los vídeos siguen alojados en su plataforma de origen y se integran aquí mediante el reproductor de cada plataforma. Los documentos enlazan a su fuente.",
    contact: "Escríbenos a",
  },

  classification: {
    acknowledged: "Reconocido",
    unverified: "No verificado",
    likely_explained: "Probablemente explicado",
    debunked: "Refutado",
  },

  classificationDefinition: {
    acknowledged:
      "Un gobierno u organismo oficial ha publicado o confirmado el material y no ha ofrecido ninguna explicación convencional.",
    unverified:
      "Un avistamiento público sin validación oficial y sin explicación convencional establecida.",
    likely_explained:
      "Se indica una causa convencional plausible, pero no está demostrada de forma concluyente.",
    debunked:
      "Una causa convencional está establecida de forma concluyente, o el material es demostrablemente falso.",
  },

  continent: {
    north_america: "América del Norte",
    south_america: "América del Sur",
    africa: "África",
    europe: "Europa",
    asia: "Asia",
    oceania: "Oceanía",
    unknown: "Lugar desconocido",
  },

  filters: {
    all: "Todo",
    classification: "Clasificación",
    continent: "Continente",
    alsoFiltering: "También filtrado por",
    clear: "Borrar los filtros",
  },

  cases: {
    title: "Casos",
    intro:
      "Cada entrada indica lo que muestran las pruebas, quién dijo qué, y lo que sigue siendo desconocido. La clasificación de cada caso es nuestro razonamiento, mostrado para que puedas discrepar.",
    empty:
      "Nada coincide con esa combinación por ahora. El archivo aún se está llenando, así que un estante vacío aquí es un hueco y no una respuesta.",
    countOne: "caso",
    countOther: "casos",
  },

  search: {
    title: "Búsqueda",
    hint: "Prueba con un lugar, un año, un testigo, o una palabra del relato. Se buscan tanto los casos como las entradas de ciencia.",
    empty:
      "Nada de aquí coincide con eso. El archivo todavía es pequeño, así que una búsqueda sin resultados suele significar que aún no lo hemos cubierto, no que no sea real.",
    browseInstead: "Ver todos los casos",
    resultOne: "resultado",
    resultOther: "resultados",
    cases: "Casos",
    science: "Ciencia",
  },
};

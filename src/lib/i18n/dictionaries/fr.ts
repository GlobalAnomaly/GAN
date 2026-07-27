import type { Dictionary } from "./en";

/**
 * French. "Cas" rather than "affaires" because that is the word GEIPAN uses,
 * and GEIPAN is where a French reader coming to this subject has already been.
 */
export const fr: Dictionary = {
  nav: {
    cases: "Cas",
    science: "Science",
    map: "Carte",
    browse: "Parcourir",
    about: "À propos",
    search: "Recherche",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    skipToContent: "Aller au contenu",
  },

  support: {
    nav: "Offrez-moi un café",
    footer: "Offrez-moi un café",
    footerLead:
      "Gratuit, et cela ne changera pas. Si le site vous est utile, vous pouvez aider à couvrir les frais de fonctionnement.",
  },

  language: {
    label: "Langue",
    readIn: "Lire en",
    machineNotice:
      "Cette version a été traduite automatiquement. La version anglaise fait référence.",
  },

  footer: {
    tagline:
      "Une archive ouverte. Chaque récit est écrit à partir de sources, chaque affirmation est attribuée, et ce qui reste inconnu est dit clairement.",
    about: "À propos et nos principes",
    submit: "Envoyez-nous quelque chose",
    privacy: "Confidentialité",
    terms: "Conditions",
    takedown: "Demandes de retrait",
    mediaNote:
      "Les vidéos restent hébergées par leur plateforme d'origine et sont intégrées ici via le lecteur de chaque plateforme. Les documents renvoient à leur source.",
    contact: "Écrivez-nous à",
  },

  classification: {
    acknowledged: "Reconnu",
    unverified: "Non vérifié",
    likely_explained: "Probablement expliqué",
    debunked: "Réfuté",
  },

  classificationDefinition: {
    acknowledged:
      "Un gouvernement ou un organisme officiel a publié ou confirmé les éléments sans proposer d'explication conventionnelle.",
    unverified:
      "Une observation publique sans validation officielle et sans explication conventionnelle établie.",
    likely_explained:
      "Une cause conventionnelle plausible est indiquée mais n'est pas démontrée de façon concluante.",
    debunked:
      "Une cause conventionnelle est établie de façon concluante, ou les éléments sont manifestement fabriqués.",
  },

  continent: {
    north_america: "Amérique du Nord",
    south_america: "Amérique du Sud",
    africa: "Afrique",
    europe: "Europe",
    asia: "Asie",
    oceania: "Océanie",
    unknown: "Lieu inconnu",
  },

  filters: {
    all: "Tout",
    classification: "Classification",
    continent: "Continent",
    alsoFiltering: "Filtré aussi par",
    clear: "Effacer les filtres",
  },

  cases: {
    title: "Cas",
    intro:
      "Chaque entrée indique ce que montrent les éléments, qui a dit quoi, et ce qui reste inconnu. Le classement de chaque cas est notre raisonnement, affiché pour que vous puissiez le contester.",
    empty:
      "Rien ne correspond à cette combinaison pour l'instant. L'archive est encore en cours de remplissage, donc une étagère vide ici est une lacune plutôt qu'une réponse.",
    countOne: "cas",
    countOther: "cas",
  },

  search: {
    title: "Recherche",
    hint: "Essayez un lieu, une année, un témoin, ou un mot du récit. Les cas et les entrées scientifiques sont consultés tous les deux.",
    empty:
      "Rien ici ne correspond. L'archive est encore petite, donc une absence signifie le plus souvent que nous ne l'avons pas encore traitée, pas que cela n'existe pas.",
    browseInstead: "Parcourir tous les cas",
    resultOne: "résultat",
    resultOther: "résultats",
    cases: "Cas",
    science: "Science",
  },
};

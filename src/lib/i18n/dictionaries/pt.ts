import type { Dictionary } from "./en";

/**
 * European Portuguese, matching the section headings already written into
 * `case-account.tsx` ("registo", not "registro"). Mixing the two variants
 * inside one page reads as carelessness to speakers of either.
 */
export const pt: Dictionary = {
  nav: {
    cases: "Casos",
    science: "Ciência",
    map: "Mapa",
    browse: "Explorar",
    about: "Sobre",
    search: "Pesquisa",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    skipToContent: "Ir para o conteúdo",
  },

  support: {
    nav: "Ofereça-me um café",
    footer: "Ofereça-me um café",
    footerLead:
      "Gratuito, e vai continuar assim. Se lhe for útil, pode ajudar a cobrir os custos de funcionamento.",
  },

  language: {
    label: "Idioma",
    readIn: "Ler em",
    machineNotice:
      "Esta versão foi traduzida automaticamente. A versão inglesa é a de referência.",
  },

  footer: {
    tagline:
      "Um arquivo aberto. Cada relato é escrito a partir de fontes, cada afirmação é atribuída, e o que permanece desconhecido é dito com clareza.",
    about: "Sobre e os nossos princípios",
    submit: "Envie-nos alguma coisa",
    privacy: "Privacidade",
    terms: "Termos",
    takedown: "Pedidos de remoção",
    mediaNote:
      "Os vídeos continuam alojados na plataforma de origem e são integrados aqui através do leitor de cada plataforma. Os documentos remetem para a sua fonte.",
    contact: "Contacte-nos em",
  },

  classification: {
    acknowledged: "Reconhecido",
    unverified: "Não verificado",
    likely_explained: "Provavelmente explicado",
    debunked: "Refutado",
  },

  classificationDefinition: {
    acknowledged:
      "Um governo ou organismo oficial divulgou ou confirmou o material e não apresentou qualquer explicação convencional.",
    unverified:
      "Um avistamento público sem validação oficial e sem explicação convencional estabelecida.",
    likely_explained:
      "Existe indicação de uma causa convencional plausível, mas não está demonstrada de forma conclusiva.",
    debunked:
      "Uma causa convencional está estabelecida de forma conclusiva, ou o material é comprovadamente falsificado.",
  },

  continent: {
    north_america: "América do Norte",
    south_america: "América do Sul",
    africa: "África",
    europe: "Europa",
    asia: "Ásia",
    oceania: "Oceânia",
    unknown: "Local desconhecido",
  },

  filters: {
    all: "Tudo",
    classification: "Classificação",
    continent: "Continente",
    alsoFiltering: "Também filtrado por",
    clear: "Limpar os filtros",
  },

  cases: {
    title: "Casos",
    intro:
      "Cada entrada indica o que as provas mostram, quem disse o quê, e o que permanece desconhecido. A classificação de cada caso é o nosso raciocínio, mostrado para que possa discordar dele.",
    empty:
      "Nada corresponde a essa combinação por agora. O arquivo ainda está a ser preenchido, por isso uma prateleira vazia aqui é uma lacuna e não uma resposta.",
    countOne: "caso",
    countOther: "casos",
  },

  search: {
    title: "Pesquisa",
    hint: "Experimente um lugar, um ano, uma testemunha, ou uma palavra do relato. São pesquisados tanto os casos como as entradas de ciência.",
    empty:
      "Nada aqui corresponde a isso. O arquivo ainda é pequeno, por isso uma falha significa normalmente que ainda não o cobrimos, e não que não seja real.",
    browseInstead: "Ver todos os casos",
    resultOne: "resultado",
    resultOther: "resultados",
    cases: "Casos",
    science: "Ciência",
  },
};

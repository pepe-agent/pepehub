import type { Locale } from './locales';

export interface UiDictionary {
  common: { and: string };
  meta: { titleSuffix: string; notFoundTitle: string };
  nav: { skills: string; plugins: string; official: string; docs: string; publish: string; logout: string; loginWithGithub: string };
  home: {
    title: string;
    lead: string;
    searchPlaceholder: string;
    search: string;
    tabAll: string;
    tabSkills: string;
    tabPlugins: string;
    allCategories: string;
    empty: string;
    sortTrending: string;
    sortFeatured: string;
    sortOfficial: string;
    sortNew: string;
  };
  category: {
    channel: string;
    tool: string;
    integration: string;
    model: string;
    automation: string;
    other: string;
  };
  publishDocs: {
    title: string;
    step1Title: string;
    step1Lead: string;
    step1Item1: string;
    step1Item2: string;
    step1Item3: string;
    step2Title: string;
    step2Lead1: string;
    step2Lead2: string;
    step2Skills: string;
    step2Plugins: string;
    step3Title: string;
    step3Lead: string;
    step4Title: string;
    step4Lead: string;
    step4Link: string;
  };
  upload: {
    title: string;
    lead: string;
    cliLink: string;
    trustedLink: string;
    howToPackageTitle: string;
    howToPackageLead1: string;
    howToPackageSkillsLink: string;
    howToPackagePluginsLink: string;
    howToPackageLead2: string;
    skillExampleTitle: string;
    skillExampleLead: string;
    pluginExampleTitle: string;
    pluginExampleLead: string;
    loginPrompt: string;
    loginButton: string;
    formTitle: string;
    fieldName: string;
    namePlaceholder: string;
    fieldType: string;
    typeSkill: string;
    typePlugin: string;
    fieldVersion: string;
    versionPlaceholder: string;
    fieldCategory: string;
    fieldSummary: string;
    summaryPlaceholder: string;
    fieldChangelog: string;
    fieldFile: string;
    submit: string;
    errNameFormat: string;
    errVersionFormat: string;
    errFileRequired: string;
    errFileTypeMismatchTemplate: string;
    statusPublishing: string;
    statusPublished: string;
    statusNetworkError: string;
    statusFailedTemplate: string;
  };
  packageDetail: {
    breadcrumbSkills: string;
    breadcrumbPlugins: string;
    by: string;
    downloads: string;
    edit: string;
    save: string;
    cancel: string;
    summaryLabel: string;
    categoryLabel: string;
    tabReadmeSkill: string;
    tabReadmePlugin: string;
    tabFiles: string;
    tabDiff: string;
    tabVersions: string;
    tabRequirements: string;
    loadingLabel: string;
    noVersionYet: string;
    noReadme: string;
    noFiles: string;
    selectFile: string;
    binaryFile: string;
    fileTooLarge: string;
    needTwoVersions: string;
    diffTo: string;
    noDifference: string;
    noRequirements: string;
    download: string;
    sha256Label: string;
    updated: string;
    latestVersion: string;
    star: string;
    starred: string;
    loginToStar: string;
    report: string;
    reportReasonLabel: string;
    reportReasonPlaceholder: string;
    reportSend: string;
    reportCancel: string;
    reportEmptyReason: string;
    reportSendingStatus: string;
    reportSent: string;
    reportNetworkError: string;
    reportFailedTemplate: string;
    installLabel: string;
    savingStatus: string;
    savedStatus: string;
    savingNetworkError: string;
    savingFailedTemplate: string;
    loadFailed: string;
    diffAdded: string;
    diffRemoved: string;
    diffModified: string;
    diffBinary: string;
    scanPending: string;
    scanClean: string;
    scanReview: string;
    scanWarning: string;
    scanMalicious: string;
    scanError: string;
  };
  related: {
    skillsHeading: string;
    pluginsHeading: string;
    noSummary: string;
    moreIn: string;
  };
  card: {
    noSummary: string;
    official: string;
    downloads: string;
  };
  notFound: { title: string; message: string };
}

export const ui: Record<Locale, UiDictionary> = {
  'pt-br': {
    common: { and: 'e' },
    meta: { titleSuffix: 'PepeHub', notFoundTitle: 'Não encontrado' },
    nav: {
      skills: 'Skills',
      plugins: 'Plugins',
      official: 'Official',
      docs: 'Docs',
      publish: 'Publicar',
      logout: 'Sair',
      loginWithGithub: 'Entrar com GitHub',
    },
    home: {
      title: 'Skills e plugins para o Pepe',
      lead: 'Busque, navegue por categoria e instale, publicado por qualquer pessoa e autenticado via GitHub.',
      searchPlaceholder: 'Buscar pacotes e skills...',
      search: 'Buscar',
      tabAll: 'Tudo',
      tabSkills: 'Skills',
      tabPlugins: 'Plugins',
      allCategories: 'Todas categorias',
      empty: 'Nenhum pacote encontrado.',
      sortTrending: 'Em alta',
      sortFeatured: 'Destaque',
      sortOfficial: 'Oficial',
      sortNew: 'Novo',
    },
    category: {
      channel: 'Canal',
      tool: 'Ferramenta',
      integration: 'Integração',
      model: 'Modelo',
      automation: 'Automação',
      other: 'Outro',
    },
    publishDocs: {
      title: 'Como publicar no PepeHub',
      step1Title: '1. Login',
      step1Lead: 'A CLI do Pepe autentica via GitHub Device Flow, o mesmo modelo do gh auth login:',
      step1Item1: 'Rodar pepe skill publish (ou pepe plugin publish) chama POST /api/v1/auth/device/start, que devolve um código de 8 caracteres e um link.',
      step1Item2: 'Abrir o link, colar o código e aprovar com sua conta do GitHub.',
      step1Item3: 'A CLI recebe um token de sessão do PepeHub assim que você aprova, e usa esse token em todo publish seguinte.',
      step2Title: '2. Formato aceito',
      step2Lead1: 'O artefato enviado é um tarball (.tgz) para plugins ou um zip (.zip) para skills, junto de um manifesto JSON com pelo menos kind, version (semver) e category (uma das categorias fixas do PepeHub).',
      step2Lead2: 'O formato completo do manifesto, a estrutura interna do pacote e como declarar comandos, hooks etc. estão documentados no site do Pepe, não aqui, para não duplicar conteúdo:',
      step2Skills: 'skills',
      step2Plugins: 'plugins',
      step3Title: '3. Publicar',
      step3Lead: 'O namespace do pacote (@seu-handle/nome) precisa começar com o seu handle do GitHub: a primeira publicação de um nome cria o pacote automaticamente.',
      step4Title: '4. Prefere não usar a CLI?',
      step4Lead: 'Também é possível publicar diretamente pelo navegador, enviando o arquivo (.zip ou .tgz) em um formulário:',
      step4Link: 'publicar pelo navegador',
    },
    upload: {
      title: 'Publicar pelo navegador',
      lead: 'Envie o arquivo do seu skill ou plugin diretamente por aqui, sem instalar a CLI. Para automação (CI, releases), utilize a CLI ou um publisher confiável em vez disso.',
      cliLink: 'CLI',
      trustedLink: 'publisher confiável',
      howToPackageTitle: 'Como empacotar',
      howToPackageLead1: 'O conteúdo interno de um skill ou plugin é o mesmo de sempre (documentado no site do Pepe:',
      howToPackageSkillsLink: 'skills',
      howToPackagePluginsLink: 'plugins',
      howToPackageLead2: '). O que muda aqui é só o empacotamento do arquivo que você envia.',
      skillExampleTitle: 'Skill → .zip',
      skillExampleLead: 'Um arquivo Markdown na raiz do zip, nomeado como o pacote:',
      pluginExampleTitle: 'Plugin → .tgz',
      pluginExampleLead: 'manifest.json na raiz, junto dos arquivos que ele referencia em files:',
      loginPrompt: 'É necessário estar autenticado para publicar.',
      loginButton: 'Entrar com GitHub',
      formTitle: 'Publicar',
      fieldName: 'Nome do pacote',
      namePlaceholder: 'meu-skill',
      fieldType: 'Tipo',
      typeSkill: 'Skill (.zip)',
      typePlugin: 'Plugin (.tgz)',
      fieldVersion: 'Versão',
      versionPlaceholder: '1.0.0',
      fieldCategory: 'Categoria',
      fieldSummary: 'Resumo',
      summaryPlaceholder: 'O que esse pacote faz, em inglês',
      fieldChangelog: 'Changelog desta versão (opcional)',
      fieldFile: 'Arquivo',
      submit: 'Publicar',
      errNameFormat: 'Nome do pacote precisa começar com letra ou número e usar só minúsculas, números e hífen.',
      errVersionFormat: 'Versão precisa ser um semver válido, tipo 1.0.0.',
      errFileRequired: 'Escolha um arquivo para publicar.',
      errFileTypeMismatchTemplate: 'Tipo "{type}" espera um arquivo {ext}, mas "{name}" não é.',
      statusPublishing: 'Publicando...',
      statusPublished: 'Publicado! Redirecionando...',
      statusNetworkError: 'Falha de rede ao publicar.',
      statusFailedTemplate: 'Falha ao publicar ({status}).',
    },
    packageDetail: {
      breadcrumbSkills: 'Skills',
      breadcrumbPlugins: 'Plugins',
      by: 'por',
      downloads: 'downloads',
      edit: 'Editar',
      save: 'Salvar',
      cancel: 'Cancelar',
      summaryLabel: 'Resumo',
      categoryLabel: 'Categoria',
      tabReadmeSkill: 'SKILL.md',
      tabReadmePlugin: 'README',
      tabFiles: 'Files',
      tabDiff: 'Diff',
      tabVersions: 'Versions',
      tabRequirements: 'Requirements',
      loadingLabel: 'Carregando...',
      noVersionYet: 'Nenhuma versão publicada ainda.',
      noReadme: 'Esse pacote não publicou um README/SKILL.md.',
      noFiles: 'Nenhum arquivo.',
      selectFile: 'Selecione um arquivo à esquerda.',
      binaryFile: 'Arquivo binário, não é possível exibir aqui.',
      fileTooLarge: 'Arquivo grande demais pra exibir aqui, baixe o pacote pra ver o conteúdo completo.',
      needTwoVersions: 'É preciso pelo menos 2 versões publicadas pra comparar.',
      diffTo: 'para',
      noDifference: 'Nenhuma diferença entre essas versões.',
      noRequirements: 'Nenhuma versão declarou requisitos.',
      download: 'Baixar',
      sha256Label: 'sha256:',
      updated: 'Atualizado',
      latestVersion: 'Última versão',
      star: 'Favoritar',
      starred: 'Favoritado',
      loginToStar: 'Entrar pra favoritar',
      report: 'Reportar',
      reportReasonLabel: 'Motivo da denúncia',
      reportReasonPlaceholder: 'Por que está reportando esse pacote?',
      reportSend: 'Enviar',
      reportCancel: 'Cancelar',
      reportEmptyReason: 'Descreva o motivo da denúncia.',
      reportSendingStatus: 'Enviando...',
      reportSent: 'Denúncia enviada.',
      reportNetworkError: 'Falha de rede ao enviar.',
      reportFailedTemplate: 'Falha ao enviar ({status}).',
      installLabel: 'Instalar',
      savingStatus: 'Salvando...',
      savedStatus: 'Salvo.',
      savingNetworkError: 'Falha de rede ao salvar.',
      savingFailedTemplate: 'Falha ao salvar ({status}).',
      loadFailed: 'Falha ao carregar.',
      diffAdded: 'adicionado',
      diffRemoved: 'removido',
      diffModified: 'modificado',
      diffBinary: 'binário, modificado',
      scanPending: 'Verificação pendente',
      scanClean: 'Verificado com VirusTotal',
      scanReview: 'Em revisão',
      scanWarning: 'Alerta de segurança',
      scanMalicious: 'Malicioso, download bloqueado',
      scanError: 'Verificação indisponível',
    },
    related: {
      skillsHeading: 'Skills relacionadas',
      pluginsHeading: 'Plugins relacionados',
      noSummary: 'Sem resumo.',
      moreIn: 'Mais em',
    },
    card: { noSummary: 'Sem resumo.', official: 'oficial', downloads: 'downloads' },
    notFound: { title: '404', message: 'Essa página não existe.' },
  },
  'pt-pt': {
    common: { and: 'e' },
    meta: { titleSuffix: 'PepeHub', notFoundTitle: 'Não encontrado' },
    nav: {
      skills: 'Skills',
      plugins: 'Plugins',
      official: 'Official',
      docs: 'Docs',
      publish: 'Publicar',
      logout: 'Sair',
      loginWithGithub: 'Entrar com GitHub',
    },
    home: {
      title: 'Skills e plugins para o Pepe',
      lead: 'Pesquise, navegue por categoria e instale, publicado por qualquer pessoa e autenticado via GitHub.',
      searchPlaceholder: 'Pesquisar pacotes e skills...',
      search: 'Pesquisar',
      tabAll: 'Tudo',
      tabSkills: 'Skills',
      tabPlugins: 'Plugins',
      allCategories: 'Todas as categorias',
      empty: 'Nenhum pacote encontrado.',
      sortTrending: 'Em alta',
      sortFeatured: 'Destaque',
      sortOfficial: 'Oficial',
      sortNew: 'Novo',
    },
    category: {
      channel: 'Canal',
      tool: 'Ferramenta',
      integration: 'Integração',
      model: 'Modelo',
      automation: 'Automação',
      other: 'Outro',
    },
    publishDocs: {
      title: 'Como publicar no PepeHub',
      step1Title: '1. Sessão',
      step1Lead: 'A CLI do Pepe autentica-se via GitHub Device Flow, o mesmo modelo do gh auth login:',
      step1Item1: 'Correr pepe skill publish (ou pepe plugin publish) chama POST /api/v1/auth/device/start, que devolve um código de 8 caracteres e uma ligação.',
      step1Item2: 'Abrir a ligação, colar o código e aprovar com a sua conta do GitHub.',
      step1Item3: 'A CLI recebe um token de sessão do PepeHub assim que aprova, e usa esse token em todo o publish seguinte.',
      step2Title: '2. Formato aceite',
      step2Lead1: 'O artefacto enviado é um tarball (.tgz) para plugins ou um zip (.zip) para skills, junto de um manifesto JSON com pelo menos kind, version (semver) e category (uma das categorias fixas do PepeHub).',
      step2Lead2: 'O formato completo do manifesto, a estrutura interna do pacote e como declarar comandos, hooks etc. estão documentados no site do Pepe, não aqui, para não duplicar conteúdo:',
      step2Skills: 'skills',
      step2Plugins: 'plugins',
      step3Title: '3. Publicar',
      step3Lead: 'O namespace do pacote (@o-seu-handle/nome) tem de começar pelo seu handle do GitHub: a primeira publicação de um nome cria o pacote automaticamente.',
      step4Title: '4. Prefere não usar a CLI?',
      step4Lead: 'Também é possível publicar diretamente pelo navegador, enviando o ficheiro (.zip ou .tgz) num formulário:',
      step4Link: 'publicar pelo navegador',
    },
    upload: {
      title: 'Publicar pelo navegador',
      lead: 'Envie o ficheiro do seu skill ou plugin diretamente por aqui, sem instalar a CLI. Para automação (CI, releases), utilize a CLI ou um publisher de confiança em vez disso.',
      cliLink: 'CLI',
      trustedLink: 'publisher de confiança',
      howToPackageTitle: 'Como empacotar',
      howToPackageLead1: 'O conteúdo interno de um skill ou plugin é o mesmo de sempre (documentado no site do Pepe:',
      howToPackageSkillsLink: 'skills',
      howToPackagePluginsLink: 'plugins',
      howToPackageLead2: '). O que muda aqui é só o empacotamento do ficheiro que envia.',
      skillExampleTitle: 'Skill → .zip',
      skillExampleLead: 'Um ficheiro Markdown na raiz do zip, com o mesmo nome do pacote:',
      pluginExampleTitle: 'Plugin → .tgz',
      pluginExampleLead: 'manifest.json na raiz, junto dos ficheiros que referencia em files:',
      loginPrompt: 'É necessário ter sessão iniciada para publicar.',
      loginButton: 'Entrar com GitHub',
      formTitle: 'Publicar',
      fieldName: 'Nome do pacote',
      namePlaceholder: 'meu-skill',
      fieldType: 'Tipo',
      typeSkill: 'Skill (.zip)',
      typePlugin: 'Plugin (.tgz)',
      fieldVersion: 'Versão',
      versionPlaceholder: '1.0.0',
      fieldCategory: 'Categoria',
      fieldSummary: 'Resumo',
      summaryPlaceholder: 'O que este pacote faz, em inglês',
      fieldChangelog: 'Changelog desta versão (opcional)',
      fieldFile: 'Ficheiro',
      submit: 'Publicar',
      errNameFormat: 'O nome do pacote tem de começar por letra ou número e usar só minúsculas, números e hífen.',
      errVersionFormat: 'A versão tem de ser um semver válido, tipo 1.0.0.',
      errFileRequired: 'Escolha um ficheiro para publicar.',
      errFileTypeMismatchTemplate: 'O tipo "{type}" espera um ficheiro {ext}, mas "{name}" não é.',
      statusPublishing: 'A publicar...',
      statusPublished: 'Publicado! A redirecionar...',
      statusNetworkError: 'Falha de rede ao publicar.',
      statusFailedTemplate: 'Falha ao publicar ({status}).',
    },
    packageDetail: {
      breadcrumbSkills: 'Skills',
      breadcrumbPlugins: 'Plugins',
      by: 'por',
      downloads: 'downloads',
      edit: 'Editar',
      save: 'Guardar',
      cancel: 'Cancelar',
      summaryLabel: 'Resumo',
      categoryLabel: 'Categoria',
      tabReadmeSkill: 'SKILL.md',
      tabReadmePlugin: 'README',
      tabFiles: 'Files',
      tabDiff: 'Diff',
      tabVersions: 'Versions',
      tabRequirements: 'Requirements',
      loadingLabel: 'A carregar...',
      noVersionYet: 'Ainda nenhuma versão publicada.',
      noReadme: 'Este pacote não publicou um README/SKILL.md.',
      noFiles: 'Nenhum ficheiro.',
      selectFile: 'Selecione um ficheiro à esquerda.',
      binaryFile: 'Ficheiro binário, não é possível apresentá-lo aqui.',
      fileTooLarge: 'Ficheiro demasiado grande para apresentar aqui, transfira o pacote para ver o conteúdo completo.',
      needTwoVersions: 'São precisas pelo menos 2 versões publicadas para comparar.',
      diffTo: 'para',
      noDifference: 'Nenhuma diferença entre estas versões.',
      noRequirements: 'Nenhuma versão declarou requisitos.',
      download: 'Transferir',
      sha256Label: 'sha256:',
      updated: 'Atualizado',
      latestVersion: 'Última versão',
      star: 'Adicionar aos favoritos',
      starred: 'Nos favoritos',
      loginToStar: 'Entrar para adicionar aos favoritos',
      report: 'Denunciar',
      reportReasonLabel: 'Motivo da denúncia',
      reportReasonPlaceholder: 'Porque está a denunciar este pacote?',
      reportSend: 'Enviar',
      reportCancel: 'Cancelar',
      reportEmptyReason: 'Descreva o motivo da denúncia.',
      reportSendingStatus: 'A enviar...',
      reportSent: 'Denúncia enviada.',
      reportNetworkError: 'Falha de rede ao enviar.',
      reportFailedTemplate: 'Falha ao enviar ({status}).',
      installLabel: 'Instalar',
      savingStatus: 'A guardar...',
      savedStatus: 'Guardado.',
      savingNetworkError: 'Falha de rede ao guardar.',
      savingFailedTemplate: 'Falha ao guardar ({status}).',
      loadFailed: 'Falha ao carregar.',
      diffAdded: 'adicionado',
      diffRemoved: 'removido',
      diffModified: 'modificado',
      diffBinary: 'binário, modificado',
      scanPending: 'Verificação pendente',
      scanClean: 'Verificado com VirusTotal',
      scanReview: 'Em revisão',
      scanWarning: 'Alerta de segurança',
      scanMalicious: 'Malicioso, transferência bloqueada',
      scanError: 'Verificação indisponível',
    },
    related: {
      skillsHeading: 'Skills relacionadas',
      pluginsHeading: 'Plugins relacionados',
      noSummary: 'Sem resumo.',
      moreIn: 'Mais em',
    },
    card: { noSummary: 'Sem resumo.', official: 'oficial', downloads: 'downloads' },
    notFound: { title: '404', message: 'Esta página não existe.' },
  },
  es: {
    common: { and: 'y' },
    meta: { titleSuffix: 'PepeHub', notFoundTitle: 'No encontrado' },
    nav: {
      skills: 'Skills',
      plugins: 'Plugins',
      official: 'Official',
      docs: 'Docs',
      publish: 'Publicar',
      logout: 'Salir',
      loginWithGithub: 'Entrar con GitHub',
    },
    home: {
      title: 'Skills y plugins para Pepe',
      lead: 'Busca, navega por categoría e instala, publicado por cualquier persona y autenticado con GitHub.',
      searchPlaceholder: 'Buscar paquetes y skills...',
      search: 'Buscar',
      tabAll: 'Todo',
      tabSkills: 'Skills',
      tabPlugins: 'Plugins',
      allCategories: 'Todas las categorías',
      empty: 'No se encontró ningún paquete.',
      sortTrending: 'Tendencia',
      sortFeatured: 'Destacado',
      sortOfficial: 'Oficial',
      sortNew: 'Nuevo',
    },
    category: {
      channel: 'Canal',
      tool: 'Herramienta',
      integration: 'Integración',
      model: 'Modelo',
      automation: 'Automatización',
      other: 'Otro',
    },
    publishDocs: {
      title: 'Cómo publicar en PepeHub',
      step1Title: '1. Inicio de sesión',
      step1Lead: 'La CLI de Pepe se autentica mediante GitHub Device Flow, el mismo modelo que gh auth login:',
      step1Item1: 'Ejecutar pepe skill publish (o pepe plugin publish) llama a POST /api/v1/auth/device/start, que devuelve un código de 8 caracteres y un enlace.',
      step1Item2: 'Abrir el enlace, pegar el código y aprobar con tu cuenta de GitHub.',
      step1Item3: 'La CLI recibe un token de sesión de PepeHub en cuanto apruebas, y lo usa en cada publish siguiente.',
      step2Title: '2. Formato aceptado',
      step2Lead1: 'El artefacto enviado es un tarball (.tgz) para plugins o un zip (.zip) para skills, junto con un manifiesto JSON con al menos kind, version (semver) y category (una de las categorías fijas de PepeHub).',
      step2Lead2: 'El formato completo del manifiesto, la estructura interna del paquete y cómo declarar comandos, hooks, etc. están documentados en el sitio de Pepe, no aquí, para no duplicar contenido:',
      step2Skills: 'skills',
      step2Plugins: 'plugins',
      step3Title: '3. Publicar',
      step3Lead: 'El namespace del paquete (@tu-handle/nombre) debe empezar con tu handle de GitHub: la primera publicación de un nombre crea el paquete automáticamente.',
      step4Title: '4. ¿Prefieres no usar la CLI?',
      step4Lead: 'También se puede publicar directamente desde el navegador, enviando el archivo (.zip o .tgz) en un formulario:',
      step4Link: 'publicar desde el navegador',
    },
    upload: {
      title: 'Publicar desde el navegador',
      lead: 'Envía el archivo de tu skill o plugin directamente por aquí, sin instalar la CLI. Para automatización (CI, releases), usa la CLI o un publisher de confianza en su lugar.',
      cliLink: 'CLI',
      trustedLink: 'publisher de confianza',
      howToPackageTitle: 'Cómo empaquetar',
      howToPackageLead1: 'El contenido interno de un skill o plugin es el mismo de siempre (documentado en el sitio de Pepe:',
      howToPackageSkillsLink: 'skills',
      howToPackagePluginsLink: 'plugins',
      howToPackageLead2: '). Lo único que cambia aquí es el empaquetado del archivo que envías.',
      skillExampleTitle: 'Skill → .zip',
      skillExampleLead: 'Un archivo Markdown en la raíz del zip, con el mismo nombre que el paquete:',
      pluginExampleTitle: 'Plugin → .tgz',
      pluginExampleLead: 'manifest.json en la raíz, junto con los archivos que referencia en files:',
      loginPrompt: 'Es necesario haber iniciado sesión para publicar.',
      loginButton: 'Entrar con GitHub',
      formTitle: 'Publicar',
      fieldName: 'Nombre del paquete',
      namePlaceholder: 'mi-skill',
      fieldType: 'Tipo',
      typeSkill: 'Skill (.zip)',
      typePlugin: 'Plugin (.tgz)',
      fieldVersion: 'Versión',
      versionPlaceholder: '1.0.0',
      fieldCategory: 'Categoría',
      fieldSummary: 'Resumen',
      summaryPlaceholder: 'Qué hace este paquete, en inglés',
      fieldChangelog: 'Changelog de esta versión (opcional)',
      fieldFile: 'Archivo',
      submit: 'Publicar',
      errNameFormat: 'El nombre del paquete debe empezar con letra o número y usar solo minúsculas, números y guion.',
      errVersionFormat: 'La versión debe ser un semver válido, como 1.0.0.',
      errFileRequired: 'Elige un archivo para publicar.',
      errFileTypeMismatchTemplate: 'El tipo "{type}" espera un archivo {ext}, pero "{name}" no lo es.',
      statusPublishing: 'Publicando...',
      statusPublished: 'Publicado. Redirigiendo...',
      statusNetworkError: 'Fallo de red al publicar.',
      statusFailedTemplate: 'Fallo al publicar ({status}).',
    },
    packageDetail: {
      breadcrumbSkills: 'Skills',
      breadcrumbPlugins: 'Plugins',
      by: 'por',
      downloads: 'descargas',
      edit: 'Editar',
      save: 'Guardar',
      cancel: 'Cancelar',
      summaryLabel: 'Resumen',
      categoryLabel: 'Categoría',
      tabReadmeSkill: 'SKILL.md',
      tabReadmePlugin: 'README',
      tabFiles: 'Files',
      tabDiff: 'Diff',
      tabVersions: 'Versions',
      tabRequirements: 'Requirements',
      loadingLabel: 'Cargando...',
      noVersionYet: 'Aún no hay ninguna versión publicada.',
      noReadme: 'Este paquete no publicó un README/SKILL.md.',
      noFiles: 'Ningún archivo.',
      selectFile: 'Selecciona un archivo a la izquierda.',
      binaryFile: 'Archivo binario, no se puede mostrar aquí.',
      fileTooLarge: 'Archivo demasiado grande para mostrar aquí, descarga el paquete para ver el contenido completo.',
      needTwoVersions: 'Hacen falta al menos 2 versiones publicadas para comparar.',
      diffTo: 'a',
      noDifference: 'No hay diferencias entre estas versiones.',
      noRequirements: 'Ninguna versión declaró requisitos.',
      download: 'Descargar',
      sha256Label: 'sha256:',
      updated: 'Actualizado',
      latestVersion: 'Última versión',
      star: 'Marcar como favorito',
      starred: 'En favoritos',
      loginToStar: 'Entrar para marcar como favorito',
      report: 'Reportar',
      reportReasonLabel: 'Motivo de la denuncia',
      reportReasonPlaceholder: '¿Por qué estás reportando este paquete?',
      reportSend: 'Enviar',
      reportCancel: 'Cancelar',
      reportEmptyReason: 'Describe el motivo de la denuncia.',
      reportSendingStatus: 'Enviando...',
      reportSent: 'Denuncia enviada.',
      reportNetworkError: 'Fallo de red al enviar.',
      reportFailedTemplate: 'Fallo al enviar ({status}).',
      installLabel: 'Instalar',
      savingStatus: 'Guardando...',
      savedStatus: 'Guardado.',
      savingNetworkError: 'Fallo de red al guardar.',
      savingFailedTemplate: 'Fallo al guardar ({status}).',
      loadFailed: 'Fallo al cargar.',
      diffAdded: 'añadido',
      diffRemoved: 'eliminado',
      diffModified: 'modificado',
      diffBinary: 'binario, modificado',
      scanPending: 'Verificación pendiente',
      scanClean: 'Verificado con VirusTotal',
      scanReview: 'En revisión',
      scanWarning: 'Alerta de seguridad',
      scanMalicious: 'Malicioso, descarga bloqueada',
      scanError: 'Verificación no disponible',
    },
    related: {
      skillsHeading: 'Skills relacionadas',
      pluginsHeading: 'Plugins relacionados',
      noSummary: 'Sin resumen.',
      moreIn: 'Más en',
    },
    card: { noSummary: 'Sin resumen.', official: 'oficial', downloads: 'descargas' },
    notFound: { title: '404', message: 'Esta página no existe.' },
  },
  en: {
    common: { and: 'and' },
    meta: { titleSuffix: 'PepeHub', notFoundTitle: 'Not found' },
    nav: {
      skills: 'Skills',
      plugins: 'Plugins',
      official: 'Official',
      docs: 'Docs',
      publish: 'Publish',
      logout: 'Sign out',
      loginWithGithub: 'Sign in with GitHub',
    },
    home: {
      title: 'Skills and plugins for Pepe',
      lead: 'Search, browse by category and install, published by anyone and authenticated through GitHub.',
      searchPlaceholder: 'Search packages and skills...',
      search: 'Search',
      tabAll: 'All',
      tabSkills: 'Skills',
      tabPlugins: 'Plugins',
      allCategories: 'All categories',
      empty: 'No package found.',
      sortTrending: 'Trending',
      sortFeatured: 'Featured',
      sortOfficial: 'Official',
      sortNew: 'New',
    },
    category: {
      channel: 'Channel',
      tool: 'Tool',
      integration: 'Integration',
      model: 'Model',
      automation: 'Automation',
      other: 'Other',
    },
    publishDocs: {
      title: 'How to publish on PepeHub',
      step1Title: '1. Sign in',
      step1Lead: 'The Pepe CLI authenticates through GitHub Device Flow, the same model as gh auth login:',
      step1Item1: 'Running pepe skill publish (or pepe plugin publish) calls POST /api/v1/auth/device/start, which returns an 8-character code and a link.',
      step1Item2: 'Open the link, paste the code, and approve with your GitHub account.',
      step1Item3: 'The CLI receives a PepeHub session token as soon as you approve, and uses it for every publish after that.',
      step2Title: '2. Accepted format',
      step2Lead1: 'The uploaded artifact is a tarball (.tgz) for plugins or a zip (.zip) for skills, together with a JSON manifest with at least kind, version (semver) and category (one of PepeHub’s fixed categories).',
      step2Lead2: 'The full manifest format, the package’s internal structure, and how to declare commands, hooks, etc. are documented on the Pepe site, not here, to avoid duplicating content:',
      step2Skills: 'skills',
      step2Plugins: 'plugins',
      step3Title: '3. Publish',
      step3Lead: 'The package namespace (@your-handle/name) must start with your GitHub handle: the first publish of a name creates the package automatically.',
      step4Title: '4. Prefer not to use the CLI?',
      step4Lead: 'It is also possible to publish directly from the browser, uploading the file (.zip or .tgz) in a form:',
      step4Link: 'publish from the browser',
    },
    upload: {
      title: 'Publish from the browser',
      lead: 'Upload your skill or plugin file directly here, no need to install the CLI. For automation (CI, releases), use the CLI or a trusted publisher instead.',
      cliLink: 'CLI',
      trustedLink: 'trusted publisher',
      howToPackageTitle: 'How to package it',
      howToPackageLead1: 'The internal content of a skill or plugin is the same as always (documented on the Pepe site:',
      howToPackageSkillsLink: 'skills',
      howToPackagePluginsLink: 'plugins',
      howToPackageLead2: '). The only thing that changes here is how the file you upload is packaged.',
      skillExampleTitle: 'Skill → .zip',
      skillExampleLead: 'A single Markdown file at the root of the zip, named after the package:',
      pluginExampleTitle: 'Plugin → .tgz',
      pluginExampleLead: 'manifest.json at the root, together with the files it references in files:',
      loginPrompt: 'You need to be signed in to publish.',
      loginButton: 'Sign in with GitHub',
      formTitle: 'Publish',
      fieldName: 'Package name',
      namePlaceholder: 'my-skill',
      fieldType: 'Type',
      typeSkill: 'Skill (.zip)',
      typePlugin: 'Plugin (.tgz)',
      fieldVersion: 'Version',
      versionPlaceholder: '1.0.0',
      fieldCategory: 'Category',
      fieldSummary: 'Summary',
      summaryPlaceholder: 'What this package does',
      fieldChangelog: 'Changelog for this version (optional)',
      fieldFile: 'File',
      submit: 'Publish',
      errNameFormat: 'Package name must start with a letter or number and use only lowercase letters, numbers and hyphens.',
      errVersionFormat: 'Version must be a valid semver, like 1.0.0.',
      errFileRequired: 'Choose a file to publish.',
      errFileTypeMismatchTemplate: 'Type "{type}" expects a {ext} file, but "{name}" is not one.',
      statusPublishing: 'Publishing...',
      statusPublished: 'Published! Redirecting...',
      statusNetworkError: 'Network failure while publishing.',
      statusFailedTemplate: 'Failed to publish ({status}).',
    },
    packageDetail: {
      breadcrumbSkills: 'Skills',
      breadcrumbPlugins: 'Plugins',
      by: 'by',
      downloads: 'downloads',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      summaryLabel: 'Summary',
      categoryLabel: 'Category',
      tabReadmeSkill: 'SKILL.md',
      tabReadmePlugin: 'README',
      tabFiles: 'Files',
      tabDiff: 'Diff',
      tabVersions: 'Versions',
      tabRequirements: 'Requirements',
      loadingLabel: 'Loading...',
      noVersionYet: 'No version published yet.',
      noReadme: 'This package has not published a README/SKILL.md.',
      noFiles: 'No files.',
      selectFile: 'Select a file on the left.',
      binaryFile: 'Binary file, cannot be displayed here.',
      fileTooLarge: 'File too large to display here, download the package to see the full content.',
      needTwoVersions: 'At least 2 published versions are needed to compare.',
      diffTo: 'to',
      noDifference: 'No difference between these versions.',
      noRequirements: 'No version declared requirements.',
      download: 'Download',
      sha256Label: 'sha256:',
      updated: 'Updated',
      latestVersion: 'Latest version',
      star: 'Star',
      starred: 'Starred',
      loginToStar: 'Sign in to star',
      report: 'Report',
      reportReasonLabel: 'Reason for the report',
      reportReasonPlaceholder: 'Why are you reporting this package?',
      reportSend: 'Send',
      reportCancel: 'Cancel',
      reportEmptyReason: 'Describe the reason for the report.',
      reportSendingStatus: 'Sending...',
      reportSent: 'Report sent.',
      reportNetworkError: 'Network failure while sending.',
      reportFailedTemplate: 'Failed to send ({status}).',
      installLabel: 'Install',
      savingStatus: 'Saving...',
      savedStatus: 'Saved.',
      savingNetworkError: 'Network failure while saving.',
      savingFailedTemplate: 'Failed to save ({status}).',
      loadFailed: 'Failed to load.',
      diffAdded: 'added',
      diffRemoved: 'removed',
      diffModified: 'modified',
      diffBinary: 'binary, modified',
      scanPending: 'Scan pending',
      scanClean: 'Verified with VirusTotal',
      scanReview: 'Under review',
      scanWarning: 'Security warning',
      scanMalicious: 'Malicious, download blocked',
      scanError: 'Scan unavailable',
    },
    related: {
      skillsHeading: 'Related skills',
      pluginsHeading: 'Related plugins',
      noSummary: 'No summary.',
      moreIn: 'More in',
    },
    card: { noSummary: 'No summary.', official: 'official', downloads: 'downloads' },
    notFound: { title: '404', message: 'This page does not exist.' },
  },
};

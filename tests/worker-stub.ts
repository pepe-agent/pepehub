// Worker "main" só pra suprir o Miniflare durante os testes. Os testes
// chamam os handlers de rota (GET/POST) diretamente, nunca via fetch real,
// então esse stub não precisa fazer nada além de existir: o entry de
// produção (src/worker.ts) importa `@astrojs/cloudflare/handler`, que só
// resolve dentro do pipeline Vite do Astro (não aqui no vitest-pool-workers).
export default {
  async fetch() {
    return new Response('test-stub');
  },
};

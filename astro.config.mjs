// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // Sem sessão de cookie do Astro (usamos nosso próprio token opaco assinado,
  // ver src/lib/session.ts) e sem o binding de Cloudflare Images (o site não
  // faz transformação de imagem em runtime). Evita provisionar KV/Images
  // binding que o projeto não usa (ver Non-Goals em design.md).
  session: false,
  adapter: cloudflare({
    imageService: 'compile',
  }),
});

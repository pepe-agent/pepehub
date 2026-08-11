import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findOwnerById, findPackageByName, getDistTag } from '../../../../../../lib/db';
import { errorResponse, json } from '../../../../../../lib/http';
import { getModerationState } from '../../../../../../lib/moderation';
import { serializePackage } from '../../../../../../lib/serialize';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const name = `${params.owner}/${params.pkg}`;
  const db = env.DB;

  const pkg = await findPackageByName(db, name);
  if (!pkg) {
    return errorResponse(404, 'not_found', `Pacote "${name}" não encontrado.`);
  }

  const owner = await findOwnerById(db, pkg.owner_id);
  const latestVersion = await getDistTag(db, pkg.id, 'latest');
  const moderationState = await getModerationState(db, pkg.id);

  return json(serializePackage(pkg, owner!.handle, latestVersion, moderationState));
};

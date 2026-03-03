export type CategoryLite = {
  id: string;
  name: string;
  requiresLicenseUpload?: boolean;
  subs?: { id: string; name: string; slug?: string }[];
};

export type UserLike = {
  category?: string[] | string;                 // PB relation (id o array con un id)
  selectedByUser?: { categoryId?: string };     // tu JSON
  subCategoryIds?: string[];                    // tu JSON
  imageDni?: string | null;                     // relation -> images.id
  licence?: string | null;                      // relation -> images.id
};

export function getSelectedCategoryId(user: UserLike): string | null {
  const fromJson = user?.selectedByUser?.categoryId ?? null;
  if (fromJson) return fromJson;
  const rel = user?.category;
  if (Array.isArray(rel)) return rel[0] ?? null;
  if (typeof rel === 'string') return rel || null;
  return null;
}

export function findCategory(categories: CategoryLite[], id: string | null): CategoryLite | null {
  if (!id) return null;
  return categories.find(c => c.id === id) || null;
}

/**
 * Regla:
 * - Si requiresLicenseUpload === true -> pedir DNI (siempre).
 * - Además, si la categoría es "Logistica" -> pedir también Licencia.
 */
export function docsRequirement(categories: CategoryLite[], user: UserLike) {
  const catId = getSelectedCategoryId(user);
  const cat = findCategory(categories, catId);

  const isLogistics = (cat?.name || '').toLowerCase() === 'logistica';
  const requires = !!cat?.requiresLicenseUpload;

  const needDni = requires;                 // siempre que requiresLicenseUpload sea true
  const needLicence = requires && isLogistics; // para logística pides ambos

  const hasDni = !!user?.imageDni;
  const hasLicence = !!user?.licence;

  const missingDni = needDni && !hasDni;
  const missingLicence = needLicence && !hasLicence;

  const showDocuments = requires; // solo mostrar menú si la cat lo requiere

  return { needDni, needLicence, hasDni, hasLicence, missingDni, missingLicence, showDocuments, cat };
}

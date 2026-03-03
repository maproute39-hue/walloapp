// export interface Category {
//     id: string;
//     name: string;
//     slug?: string;
//     iconUrl?: string;
//   }
  
// src/app/interfaces/category.interface.ts
export interface Category {
  id: string;
  collectionId: string;
  collectionName: string;
  name: string;
  slug?: string;
  // si tu campo de icono es 'image' o 'icon', ajusta:
  icon?: string | string[];
  subs: string[];
}

export interface GalleryImage {
  id: string;     // id del record en "images"
  url: string;    // URL pública (o thumb)
  type?: string;
}

export interface Gallery {
  id: string;                 // crypto.randomUUID()
  title: string;              // Nombre del trabajo
  description: string;        // Descripción
  images: GalleryImage[];     // solo metadatos (no binario)
  createdAt: string;          // ISO string
}

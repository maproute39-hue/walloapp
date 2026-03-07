// src/app/core/pocketbase.client.ts
import PocketBase from 'pocketbase';

export const PB_URL = 'https://db.buckapi.site:8055'; // ej: https://db.camiwa.com:250
export const pb = new PocketBase(PB_URL);

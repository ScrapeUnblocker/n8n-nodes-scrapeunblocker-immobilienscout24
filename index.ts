import { ImmobilienScout24Scraper } from './nodes/ImmobilienScout24Scraper/ImmobilienScout24Scraper.node';
import { ApifyApi } from './credentials/ApifyApi.credentials';

export const nodeTypes = [ImmobilienScout24Scraper];

export const credentialTypes = [ApifyApi];

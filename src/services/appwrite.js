import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') 
    .setProject('6a00350500070a6a1472');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };

export const DB_ID = '6a0035d4002667ba2581'; 
export const COLLECTIONS = {
    SONGS: 'songs',
    HISTORY: 'history',
    LIKES: 'likes',
    JAM_ROOMS: 'jam_rooms',
    MESSAGES: 'messages',
    USER_STATS: 'user_stats',
    PLAYLISTS: 'playlists',
    TYPING: 'typing'
};

export default client;

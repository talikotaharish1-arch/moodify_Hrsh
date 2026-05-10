const sdk = require('node-appwrite');

const client = new sdk.Client();
client
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('6a00350500070a6a1472')
    .setKey('standard_719bd3490525fe46d35d48ba62c8d4fbee6ceb720d9e237a382e12c95f32bce29d83756d54fde99eac6b9389e63f87f14bf7b0fd9c2066e4431bd8124477b5f9d0bb295c1d6b1f212816630a83d60b0f05ac33309b075eb6117931db96317b5148d2edc052d5650def0b1689660bbdf439ab7a61503ad88d95ec719ca43a4515');

const databases = new sdk.Databases(client);
const DB_NAME = 'Moodify';
const DB_ID = '6a0035d4002667ba2581';

async function setup() {
    try {
        console.log('🚀 Starting Appwrite Setup for SGP Region...');

        // 1. Create Database (Skip if already exists)
        try {
            // We use the ID provided by user, assuming it exists
            console.log('ℹ️ Using existing Database ID:', DB_ID);
        } catch (e) {}

        const collections = [
            {
                id: 'songs',
                name: 'Songs',
                attrs: [
                    { key: 'title', type: 'string', size: 255, required: true },
                    { key: 'artist', type: 'string', size: 255, required: true },
                    { key: 'cover_url', type: 'string', size: 500, required: false },
                    { key: 'audio_url', type: 'string', size: 500, required: true },
                    { key: 'duration', type: 'integer', required: false },
                    { key: 'mood', type: 'string', size: 50, required: false }
                ]
            },
            {
                id: 'history',
                name: 'History',
                attrs: [
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'song', type: 'string', size: 50, required: true }
                ]
            },
            {
                id: 'likes',
                name: 'Likes',
                attrs: [
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'song', type: 'string', size: 50, required: true }
                ]
            },
            {
                id: 'playlists',
                name: 'Playlists',
                attrs: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'mood', type: 'string', size: 50, required: true },
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'songs', type: 'string', size: 50, required: false, array: true },
                    { key: 'cover_url', type: 'string', size: 500, required: false }
                ]
            },
            {
                id: 'jam_rooms',
                name: 'Jam Rooms',
                attrs: [
                    { key: 'name', type: 'string', size: 255, required: true },
                    { key: 'host', type: 'string', size: 50, required: true },
                    { key: 'current_songs', type: 'string', size: 50, required: false },
                    { key: 'is_playing', type: 'boolean', required: false, default: false },
                    { key: 'playback_position', type: 'float', required: false, default: 0 },
                    { key: 'listeners', type: 'integer', required: false, default: 1 }
                ]
            },
            {
                id: 'messages',
                name: 'Messages',
                attrs: [
                    { key: 'room', type: 'string', size: 50, required: true },
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'text', type: 'string', size: 1000, required: true },
                    { key: 'user_name', type: 'string', size: 100, required: false }
                ]
            },
            {
                id: 'user_stats',
                name: 'User Stats',
                attrs: [
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'total_listening_time', type: 'integer', required: false, default: 0 },
                    { key: 'last_song', type: 'string', size: 50, required: false },
                    { key: 'favorite_artist', type: 'string', size: 255, required: false }
                ]
            },
            {
                id: 'typing',
                name: 'Typing Indicators',
                attrs: [
                    { key: 'room', type: 'string', size: 50, required: true },
                    { key: 'user', type: 'string', size: 50, required: true },
                    { key: 'user_name', type: 'string', size: 100, required: false }
                ]
            }
        ];

        for (const col of collections) {
            console.log(`📦 Creating Collection: ${col.name}...`);
            try {
                await databases.createCollection(DB_ID, col.id, col.name, [
                    sdk.Permission.read(sdk.Role.any()),
                    sdk.Permission.create(sdk.Role.any()),
                    sdk.Permission.update(sdk.Role.any()),
                    sdk.Permission.delete(sdk.Role.any())
                ]);
                console.log(`  ✅ Collection ${col.id} created.`);

                for (const attr of col.attrs) {
                    console.log(`    🔹 Adding Attribute: ${attr.key}...`);
                    try {
                        if (attr.type === 'string') {
                            await databases.createStringAttribute(DB_ID, col.id, attr.key, attr.size, attr.required, attr.default, attr.array);
                        } else if (attr.type === 'integer') {
                            await databases.createIntegerAttribute(DB_ID, col.id, attr.key, attr.required, 0, 1000000, attr.default, attr.array);
                        } else if (attr.type === 'boolean') {
                            await databases.createBooleanAttribute(DB_ID, col.id, attr.key, attr.required, attr.default, attr.array);
                        } else if (attr.type === 'float') {
                            await databases.createFloatAttribute(DB_ID, col.id, attr.key, attr.required, 0, 1000000, attr.default, attr.array);
                        }
                    } catch (e) {
                        console.log(`    ℹ️ Attribute ${attr.key} already exists.`);
                    }
                }
            } catch (e) {
                console.log(`  ℹ️ Collection ${col.id} already exists or error:`, e.message);
            }
        }

        console.log('\n✨ Setup Complete! Collections and Attributes are being initialized.');
        console.log('👉 Please wait 2 minutes for Appwrite to finalize the background processes.');

    } catch (err) {
        console.error('❌ Critical Setup Error:', err);
    }
}

setup();

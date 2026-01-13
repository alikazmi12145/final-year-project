/**
 * Poetry Database - SQLite-based poetry storage
 * Pre-seeded with famous Urdu poets' works
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Dynamic import for sqlite3 with fallback
let sqlite3 = null;
let dbAvailable = false;

try {
    const sqlite3Pkg = await import('sqlite3');
    sqlite3 = sqlite3Pkg.default.verbose();
    dbAvailable = true;
    console.log('✅ SQLite3 module loaded successfully');
} catch (error) {
    console.warn('⚠️ SQLite3 not available - using in-memory fallback');
    console.warn('   Run: npm install sqlite3 --save');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/urdu_poetry.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Database instance
let db = null;

// In-memory fallback data when SQLite not available
const inMemoryPoems = [
    { title: "دل‌ناداں تجھے ہوا کیا ہے", content: "دل‌ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے", poet_name: "مرزا غالب" },
    { title: "ہزاروں خواہشیں ایسی", content: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارمان لیکن پھر بھی کم نکلے", poet_name: "مرزا غالب" },
    { title: "خودی کو کر بلند اتنا", content: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے", poet_name: "علامہ اقبال" },
    { title: "ستاروں سے آگے", content: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں", poet_name: "علامہ اقبال" },
    { title: "رنجش ہی سہی", content: "رنجش ہی سہی دل ہی دکھانے کے لیے آ\nآ پھر سے مجھے چھوڑ کے جانے کے لیے آ", poet_name: "احمد فراز" },
    { title: "ہم دیکھیں گے", content: "ہم دیکھیں گے لازم ہے کہ ہم بھی دیکھیں گے\nوہ دن کہ جس کا وعدہ ہے جو لوح ازل میں لکھا ہے", poet_name: "فیض احمد فیض" },
    { title: "مجھ سے پہلی سی محبت", content: "مجھ سے پہلی سی محبت میرے محبوب نہ مانگ\nمیں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات", poet_name: "فیض احمد فیض" },
    { title: "شاید", content: "شاید مجھے کسی سے محبت نہیں ہوئی\nلیکن یقین سب کو دلاتا رہا ہوں میں", poet_name: "جون ایلیا" },
    { title: "وہ تو خوشبو ہے", content: "وہ تو خوشبو ہے ہواؤں میں بکھر جائے گا\nمسئلہ پھول کا ہے پھول کدھر جائے گا", poet_name: "پروین شاکر" }
];

const inMemoryPoets = [
    { id: 1, name: "مرزا غالب", era: "Classical" },
    { id: 2, name: "علامہ اقبال", era: "Modern" },
    { id: 3, name: "احمد فراز", era: "Romantic" },
    { id: 4, name: "فیض احمد فیض", era: "Modern/Revolutionary" },
    { id: 5, name: "پروین شاکر", era: "Modern/Romantic" },
    { id: 6, name: "جون ایلیا", era: "Modern/Post-Modern" }
];

/**
 * Initialize database connection
 */
function initDb() {
    return new Promise((resolve, reject) => {
        if (!dbAvailable) {
            console.log('ℹ️ Using in-memory poetry fallback');
            resolve(null);
            return;
        }

        if (db) {
            resolve(db);
            return;
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to SQLite poetry database');
                createTables().then(() => {
                    seedInitialData().then(resolve).catch(resolve);
                }).catch(reject);
            }
        });
    });
}

/**
 * Create database tables
 */
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS poets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                era TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS poems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                poet_id INTEGER,
                title TEXT,
                content TEXT,
                normalized_text TEXT,
                audio_url TEXT,
                image_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (poet_id) REFERENCES poets (id)
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

/**
 * Normalize Urdu text for better search matching
 */
function normalizeUrdu(text) {
    if (!text) return "";
    return text
        .replace(/کہ/g, 'کے')
        .replace(/[آأ]/g, 'ا')
        .replace(/[ؤ]/g, 'و')
        .replace(/[ئ]/g, 'ی')
        .replace(/[ے]/g, 'ی')
        .replace(/[ۃ]/g, 'ت')
        .replace(/[ں]/g, 'ن')
        .replace(/[ہھ]/g, 'ہ')
        .replace(/[ًٌٍَُِّْ]/g, '')
        .replace(/["،!؟"'`\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Seed initial poetry data
 */
function seedInitialData() {
    return new Promise((resolve) => {
        console.log("📚 Checking poetry database...");

        db.get("SELECT COUNT(*) as count FROM poems", [], (err, row) => {
            if (row && row.count > 0) {
                console.log(`✅ Database already has ${row.count} poems`);
                resolve();
                return;
            }

            console.log("📝 Seeding initial poetry data...");

            const poetsData = [
                {
                    name: "مرزا غالب",
                    era: "Classical",
                    poems: [
                        { title: "دل‌ناداں تجھے ہوا کیا ہے", content: "دل‌ناداں تجھے ہوا کیا ہے\nآخر اس درد کی دوا کیا ہے" },
                        { title: "ہزاروں خواہشیں ایسی", content: "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے\nبہت نکلے میرے ارمان لیکن پھر بھی کم نکلے" },
                        { title: "کوئی امید بر نہیں آتی", content: "کوئی امید بر نہیں آتی\nکوئی صورت نظر نہیں آتی" },
                        { title: "یہ نہ تھی ہماری قسمت", content: "یہ نہ تھی ہماری قسمت کہ وصال یار ہوتا\nاگر اور جیتے رہتے یہی انتظار ہوتا" },
                        { title: "بازیچہ اطفال", content: "بازیچہ اطفال ہے دنیا میرے آگے\nہوتا ہے شب و روز تماشا میرے آگے" },
                        { title: "نکتہ چیں", content: "نکتہ چیں ہے غم دل اس کو سنائے نہ بنے\nکیا بنے بات جہاں بات بنائے نہ بنے" },
                        { title: "ہر ایک بات", content: "ہر ایک بات پہ کہتے ہو تم کہ تو کیا ہے\nتمہیں کہوں کہ یہ انداز گفتگو کیا ہے" },
                        { title: "آہ کو چاہیے", content: "آہ کو چاہیے اک عمر اثر ہونے تک\nکون جیتا ہے تیری زلف کے سر ہونے تک" },
                        { title: "بس کہ دشوار ہے", content: "بس کہ دشوار ہے ہر کام کا آساں ہونا\nآدمی کو بھی میسر نہیں انساں ہونا" },
                        { title: "درد منت کش", content: "درد منت کش دوا نہ ہوا\nمیں نہ اچھا ہوا برا نہ ہوا" }
                    ]
                },
                {
                    name: "علامہ اقبال",
                    era: "Modern",
                    poems: [
                        { title: "لب پہ آتی ہے دعا", content: "لب پہ آتی ہے دعا بن کے تمنا میری\nزندگی شمع کی صورت ہو خدایا میری" },
                        { title: "خودی کو کر بلند اتنا", content: "خودی کو کر بلند اتنا کہ ہر تقدیر سے پہلے\nخدا بندے سے خود پوچھے بتا تیری رضا کیا ہے" },
                        { title: "ستاروں سے آگے", content: "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں" },
                        { title: "شکوہ", content: "کیوں زیاں کار بنوں سود فراموش رہوں\nفکر فردا نہ کروں محو غم دوش رہوں" },
                        { title: "جواب شکوہ", content: "دل سے جو بات نکلتی ہے اثر رکھتی ہے\nپر نہیں طاقت پرواز مگر رکھتی ہے" },
                        { title: "ترانہ ہندی", content: "سارے جہاں سے اچھا ہندوستان ہمارا\nہم بلبلیں ہیں اس کی یہ گلستان ہمارا" },
                        { title: "بچے کی دعا", content: "لب پہ آتی ہے دعا بن کے تمنا میری\nزندگی شمع کی صورت ہو خدایا میری" },
                        { title: "ہمدردی", content: "ٹہنی پہ کسی شجر کی تنہا\nبلبل تھا کوئی اداس بیٹھا" },
                        { title: "ماں کا خواب", content: "میں سوئی جو اک شب تو دیکھا یہ خواب\nبڑھا اور جس سے میرا اضطراب" },
                        { title: "پرندے کی فریاد", content: "آتا ہے یاد مجھ کو گزرا ہوا زمانہ\nوہ باغ کی بہاریں وہ سب کا چہچہانا" }
                    ]
                },
                {
                    name: "احمد فراز",
                    era: "Romantic",
                    poems: [
                        { title: "سنا ہے لوگ اسے", content: "سنا ہے لوگ اسے آنکھ بھر کے دیکھتے ہیں\nسو اس کے شہر میں کچھ دن ٹھہر کے دیکھتے ہیں" },
                        { title: "رنجش ہی سہی", content: "رنجش ہی سہی دل ہی دکھانے کے لیے آ\nآ پھر سے مجھے چھوڑ کے جانے کے لیے آ" },
                        { title: "اب کے ہم بچھڑے", content: "اب کے ہم بچھڑے تو شاید کبھی خوابوں میں ملیں\nجس طرح سوکھے ہوئے پھول کتابوں میں ملیں" },
                        { title: "زندگی سے وہی گلہ", content: "زندگی سے وہی گلہ ہے مجھے\nتو بہت دیر سے ملا ہے مجھے" },
                        { title: "دوست بن کر", content: "دوست بن کر بھی نہیں ساتھ نبھانے والا\nوہی انداز ہے ظالم کا زمانے والا" },
                        { title: "خواب مرتے نہیں", content: "خواب مرتے نہیں\nخواب دل ہیں نہ آنکھیں ہیں نہ سانسیں ہیں" },
                        { title: "یہ عالم شوق", content: "یہ عالم شوق کا دیکھا نہ جائے\nوہ بت ہے یا خدا دیکھا نہ جائے" },
                        { title: "سلسلے توڑ گیا", content: "سلسلے توڑ گیا وہ سب جاتے جاتے\nورنہ اتنے تو مراسم تھے کہ آتے جاتے" },
                        { title: "آنکھ سے دور", content: "آنکھ سے دور نہ ہو دل سے اتر جائے گا\nوقت کا کیا ہے گزرتا ہے گزر جائے گا" }
                    ]
                },
                {
                    name: "فیض احمد فیض",
                    era: "Modern/Revolutionary",
                    poems: [
                        { title: "گلوں میں رنگ بھرے", content: "گلوں میں رنگ بھرے باد نوبہار چلے\nچلے بھی آؤ کہ گلشن کا کاروبار چلے" },
                        { title: "ہم دیکھیں گے", content: "ہم دیکھیں گے لازم ہے کہ ہم بھی دیکھیں گے\nوہ دن کہ جس کا وعدہ ہے جو لوح ازل میں لکھا ہے" },
                        { title: "بول کہ لب آزاد ہیں تیرے", content: "بول کہ لب آزاد ہیں تیرے\nبول زبان اب تک تیری ہے" },
                        { title: "مجھ سے پہلی سی محبت", content: "مجھ سے پہلی سی محبت میرے محبوب نہ مانگ\nمیں نے سمجھا تھا کہ تو ہے تو درخشاں ہے حیات" },
                        { title: "بہار آئی", content: "بہار آئی تو جیسے یک بار\nلوٹ آئے ہیں پھر معشوقہ" },
                        { title: "تم آئے ہو", content: "تم آئے ہو نہ شب انتظار گزری ہے\nتلاش میں ہے سحر بار بار گزری ہے" },
                        { title: "دشت تنہائی", content: "دشت تنہائی میں اے جان جہاں لرزاں ہیں\nتیری آواز کے سائے تیرے ہونٹوں کے سراب" },
                        { title: "آج بازار میں", content: "آج بازار میں پابجولاں چلو\nچشم نم جان شوریدہ کافی نہیں" }
                    ]
                },
                {
                    name: "پروین شاکر",
                    era: "Modern/Romantic",
                    poems: [
                        { title: "کو بہ کو پھیل گئی", content: "کو بہ کو پھیل گئی بات شناسائی کی\nاس نے خوشبو کی طرح میری پذیرائی کی" },
                        { title: "وہ تو خوشبو ہے", content: "وہ تو خوشبو ہے ہواؤں میں بکھر جائے گا\nمسئلہ پھول کا ہے پھول کدھر جائے گا" },
                        { title: "عکس خوشبو ہوں", content: "عکس خوشبو ہوں بکھرنے سے نہ روکے کوئی\nاور بکھر جاؤں تو مجھ کو نہ سمیٹے کوئی" },
                        { title: "جانجاناں", content: "کیسے کہوں کہ مجھے چھوڑ دیا ہے اس نے\nبات تو سن ہے مگر بات ہے رسوائی کی" },
                        { title: "خوشبو", content: "میں سن کیوں گئی مگر پھر بھی ہار جاؤں گئی\nوہ جھوٹ بولے گا اور لاجواب کر دے گا" },
                        { title: "یاد", content: "اب یادوں کے کانٹے چبھتے ہیں\nپھولوں کی طرح ہم تھے کبھی" },
                        { title: "بارش", content: "بارش ہوئی تو پھولوں کے تن چاک ہو گئے\nموسم کے ہاتھ بھیک سے ناپاک ہو گئے" },
                        { title: "حسن", content: "حسن کو سمجھنے کے لئے\nحسن ہونا ضروری ہے" },
                        { title: "چاند", content: "چاند کو گل کرو تو ہم جانیں\nپھر ادھر آؤ تو ہم مانیں" }
                    ]
                },
                {
                    name: "جون ایلیا",
                    era: "Modern/Post-Modern",
                    poems: [
                        { title: "شاید", content: "شاید مجھے کسی سے محبت نہیں ہوئی\nلیکن یقین سب کو دلاتا رہا ہوں میں" },
                        { title: "علاج", content: "یہ مجھے چین کیوں نہیں پڑتا\nایک ہی شخص تھا جہان میں کیا" },
                        { title: "فریب", content: "میں بھی بہت عجیب ہوں اتنا عجیب ہوں کہ بس\nخود کو تباہ کر لیا اور ملال بھی نہیں" },
                        { title: "بے دلی", content: "کس لیے دیکھتی ہو آئینہ\nتم تو خود سے بھی خوبصورت ہو" },
                        { title: "نیازمندی", content: "ساری دنیا کے رنج و غم دے کر\nمسکراتے ہو بات کرتے ہو" },
                        { title: "گمان", content: "حاصل کن ہے یہ جہان خراب\nیہی ممکن تھا اتنی عجلت میں" },
                        { title: "ڈر", content: "اب نہیں کوئی بات خطرے کی\nاب سبھی کو سبھی سے خطرہ ہے" },
                        { title: "ناکامی", content: "کون اس گھر کی دیکھ بھال کرے\nروز اک چیز ٹوٹ جاتی ہے" },
                        { title: "شوق", content: "جو گزاری نہ جا سکی ہم سے\nہم نے وہ زندگی گزاری ہے" },
                        { title: "تمہارا نام", content: "تمہارا نام لکھنے کی اجازت چھین لی گئی ہے\nمگر میں کیا کروں کہ میرے ہاتھ کٹ چکے ہیں" }
                    ]
                },
                {
                    name: "میر تقی میر",
                    era: "Classical",
                    poems: [
                        { title: "دیکھ تو دل کہ جاں سے اٹھتا ہے", content: "دیکھ تو دل کہ جاں سے اٹھتا ہے\nیہ دھواں سا کہاں سے اٹھتا ہے" },
                        { title: "الٹی ہو گئیں سب تدبیریں", content: "الٹی ہو گئیں سب تدبیریں کچھ نہ دوا نے کام کیا\nدیکھا اس بیماری دل نے آخر کام تمام کیا" },
                        { title: "پتا پتا بوٹا بوٹا", content: "پتا پتا بوٹا بوٹا حال ہمارا جانے ہے\nجانے نہ جانے گل ہی نہ جانے باغ تو سارا جانے ہے" },
                        { title: "ناسخ نے کی تصحیح", content: "ناسخ نے کی تصحیح میر کی زباں کیا جانے\nوہ کون میاں جو زباں جانے میر کی زباں کیا جانے" },
                        { title: "یہ عشق نہیں آساں", content: "یہ عشق نہیں آساں اتنا ہی سمجھ لیجے\nاک آگ کا دریا ہے اور ڈوب کے جانا ہے" }
                    ]
                }
            ];

            poetsData.forEach(poetData => {
                db.run("INSERT OR IGNORE INTO poets (name, era) VALUES (?, ?)", 
                    [poetData.name, poetData.era], function(err) {
                    if (err) return;
                    
                    const poetId = this.lastID || null;
                    
                    // Get poet ID if already existed
                    db.get("SELECT id FROM poets WHERE name = ?", [poetData.name], (err, row) => {
                        const pid = row ? row.id : poetId;
                        if (!pid) return;

                        poetData.poems.forEach(poem => {
                            const normalizedText = normalizeUrdu(poem.title) + " " + normalizeUrdu(poem.content);
                            
                            db.run(`INSERT OR IGNORE INTO poems (poet_id, title, content, normalized_text) 
                                    VALUES (?, ?, ?, ?)`,
                                [pid, poem.title, poem.content, normalizedText],
                                (err) => {
                                    if (!err) console.log(`  ✓ ${poem.title}`);
                                }
                            );
                        });
                    });
                });
            });

            setTimeout(resolve, 2000);
        });
    });
}

/**
 * Search poems in database
 */
function searchPoems(query) {
    return new Promise((resolve, reject) => {
        // Fallback for in-memory search when SQLite not available
        if (!dbAvailable) {
            const results = inMemoryPoems.filter(poem => 
                poem.content.includes(query) || 
                poem.title.includes(query) ||
                poem.poet_name.includes(query)
            );
            console.log(`[In-Memory Search] Found ${results.length} results for "${query}"`);
            resolve(results);
            return;
        }

        initDb().then(() => {
            const normQuery = normalizeUrdu(query);
            console.log(`[DB Search] Normalized: '${query}' -> '${normQuery}'`);

            const sql = `
                SELECT poems.title, poems.content, poems.audio_url, poems.image_url, poets.name as poet_name
                FROM poems
                LEFT JOIN poets ON poems.poet_id = poets.id
                WHERE
                   poems.normalized_text LIKE ? OR
                   poems.content LIKE ? OR
                   poems.title LIKE ? OR
                   poets.name LIKE ?
                LIMIT 20
            `;
            const wildcard = `%${query}%`;
            const normWildcard = `%${normQuery}%`;

            db.all(sql, [normWildcard, wildcard, wildcard, wildcard], (err, rows) => {
                if (err) {
                    console.error("DB Search Error:", err);
                    resolve([]);
                } else {
                    resolve(rows || []);
                }
            });
        }).catch(() => resolve([]));
    });
}

/**
 * Get poems by a specific poet
 */
function getPoemsByPoet(poetName) {
    return new Promise((resolve, reject) => {
        // Fallback for in-memory when SQLite not available
        if (!dbAvailable) {
            const results = inMemoryPoems.filter(poem => 
                poem.poet_name.includes(poetName)
            );
            resolve(results);
            return;
        }

        initDb().then(() => {
            const sql = `
                SELECT poems.title, poems.content, poems.audio_url, poems.image_url, poets.name as poet_name
                FROM poems
                LEFT JOIN poets ON poems.poet_id = poets.id
                WHERE poets.name LIKE ?
                LIMIT 50
            `;
            
            db.all(sql, [`%${poetName}%`], (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        }).catch(() => resolve([]));
    });
}

/**
 * Save a new poem
 */
function savePoem(title, content, poetName = 'Unknown', audioUrl = null, imageUrl = null) {
    return new Promise((resolve, reject) => {
        // Fallback for in-memory when SQLite not available
        if (!dbAvailable) {
            const newPoem = { title, content, poet_name: poetName, audio_url: audioUrl, image_url: imageUrl };
            inMemoryPoems.push(newPoem);
            console.log(`[In-Memory] Saved poem: ${title}`);
            resolve(inMemoryPoems.length);
            return;
        }

        initDb().then(() => {
            // First ensure poet exists
            db.run("INSERT OR IGNORE INTO poets (name, era) VALUES (?, ?)", 
                [poetName, 'Modern'], function(err) {
                
                db.get("SELECT id FROM poets WHERE name = ?", [poetName], (err, row) => {
                    if (!row) {
                        resolve(null);
                        return;
                    }

                    const poetId = row.id;
                    const normalizedText = normalizeUrdu(title) + " " + normalizeUrdu(content);

                    db.run(`INSERT OR IGNORE INTO poems (poet_id, title, content, normalized_text, audio_url, image_url) 
                            VALUES (?, ?, ?, ?, ?, ?)`,
                        [poetId, title, content, normalizedText, audioUrl, imageUrl],
                        function(err) {
                            if (err) reject(err);
                            else resolve(this.lastID);
                        }
                    );
                });
            });
        }).catch(reject);
    });
}

/**
 * Get all poems
 */
function getAllPoems() {
    return new Promise((resolve, reject) => {
        // Fallback for in-memory when SQLite not available
        if (!dbAvailable) {
            resolve(inMemoryPoems.map(p => ({ content: p.content })));
            return;
        }

        initDb().then(() => {
            db.all("SELECT content FROM poems", [], (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        }).catch(() => resolve([]));
    });
}

/**
 * Get all poets
 */
function getAllPoets() {
    return new Promise((resolve, reject) => {
        // Fallback for in-memory when SQLite not available
        if (!dbAvailable) {
            resolve(inMemoryPoets);
            return;
        }

        initDb().then(() => {
            db.all("SELECT * FROM poets", [], (err, rows) => {
                if (err) resolve([]);
                else resolve(rows || []);
            });
        }).catch(() => resolve([]));
    });
}

// Initialize on import
initDb().catch(console.error);

export default {
    searchPoems,
    getPoemsByPoet,
    savePoem,
    getAllPoems,
    getAllPoets,
    initDb
};

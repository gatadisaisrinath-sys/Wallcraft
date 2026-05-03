const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Setup file storage directory
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'wallpaper-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// Initialize Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Database connection error:", err);
    else console.log("Connected to SQLite database.");
});

// Create tables and seed data if needed
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS wallpapers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        cat TEXT,
        res TEXT,
        img TEXT,
        downloads INTEGER DEFAULT 0,
        isNew BOOLEAN
    )`, (err) => {
        if (!err) {
            // Check if table is empty
            db.get("SELECT COUNT(*) AS count FROM wallpapers", (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding default wallpapers...");
                    const stmt = db.prepare(`INSERT INTO wallpapers (id, title, cat, res, img, downloads, isNew) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    const defaultWallpapers = [
                        {id:1,  title:"Misty Mountain Dawn",      cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/mist11/800/500",   downloads:2341, isNew:false},
                        {id:2,  title:"Golden Hour Forest",       cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/forest22/800/500", downloads:1876, isNew:true},
                        {id:3,  title:"Cherry Blossom Trail",     cat:"nature",       res:"2K",  img:"https://picsum.photos/seed/cherry33/800/500", downloads:3210, isNew:false},
                        {id:4,  title:"Autumn Maple Valley",      cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/autumn44/800/500", downloads:987,  isNew:true},
                        {id:5,  title:"Waterfall Serenity",       cat:"nature",       res:"FHD", img:"https://picsum.photos/seed/wfall55/800/500",  downloads:4520, isNew:false},
                        {id:6,  title:"Milky Way Panorama",       cat:"space",        res:"4K",  img:"https://picsum.photos/seed/milky77/800/500",  downloads:6721, isNew:false},
                        {id:7,  title:"Nebula in Crimson",        cat:"space",        res:"4K",  img:"https://picsum.photos/seed/nebul88/800/500",  downloads:5432, isNew:true},
                        {id:8,  title:"Deep Space Portal",        cat:"space",        res:"FHD", img:"https://picsum.photos/seed/deepsp9/800/500",  downloads:3201, isNew:false},
                        {id:9,  title:"Tokyo Skyline Night",      cat:"architecture", res:"4K",  img:"https://picsum.photos/seed/toky11/800/500",   downloads:4100, isNew:false},
                        {id:10, title:"Glass Tower Reflections",  cat:"architecture", res:"FHD", img:"https://picsum.photos/seed/glas13/800/500",   downloads:2780, isNew:true},
                        {id:11, title:"Supercar Silhouette",      cat:"cars",         res:"4K",  img:"https://picsum.photos/seed/supe14/800/500",   downloads:5900, isNew:false},
                        {id:12, title:"Liquid Chrome Flow",       cat:"abstract",     res:"4K",  img:"https://picsum.photos/seed/liqu16/800/500",   downloads:3100, isNew:false},
                        {id:13, title:"Geometric Dimension",      cat:"abstract",     res:"2K",  img:"https://picsum.photos/seed/geom17/800/500",   downloads:2200, isNew:true},
                        {id:14, title:"Lion King Portrait",       cat:"animals",      res:"4K",  img:"https://picsum.photos/seed/lion19/800/500",   downloads:7800, isNew:false},
                        {id:15, title:"Eagle Soaring High",       cat:"animals",      res:"4K",  img:"https://picsum.photos/seed/eagl20/800/500",   downloads:3400, isNew:true},
                        {id:16, title:"Tropical Reef Dream",      cat:"ocean",        res:"4K",  img:"https://picsum.photos/seed/reef22/800/500",   downloads:3600, isNew:false},
                        {id:17, title:"Hyderabad Night Glow",     cat:"city",         res:"4K",  img:"https://picsum.photos/seed/hyd25/800/500",    downloads:4200, isNew:true},
                        {id:18, title:"Mumbai Rain Streets",      cat:"city",         res:"4K",  img:"https://picsum.photos/seed/mumb26/800/500",   downloads:3800, isNew:false}
                    ];
                    for (const w of defaultWallpapers) {
                        stmt.run(w.id, w.title, w.cat, w.res, w.img, w.downloads, w.isNew ? 1 : 0);
                    }
                    stmt.finalize();
                }
            });
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        icon TEXT
    )`, (err) => {
        if (!err) {
            db.get("SELECT COUNT(*) AS count FROM categories", (err, row) => {
                if (row && row.count === 0) {
                    console.log("Seeding default categories...");
                    const stmt = db.prepare(`INSERT INTO categories (name, icon) VALUES (?, ?)`);
                    const defaultCats = [
                        {name:"nature", icon:"🌿"},
                        {name:"space", icon:"🌌"},
                        {name:"architecture", icon:"🏛️"},
                        {name:"cars", icon:"🚗"},
                        {name:"abstract", icon:"🎨"},
                        {name:"animals", icon:"🦁"},
                        {name:"ocean", icon:"🌊"},
                        {name:"city", icon:"🌆"}
                    ];
                    for (const c of defaultCats) {
                        stmt.run(c.name, c.icon);
                    }
                    stmt.finalize();
                }
            });
        }
    });
});

// API Routes
app.get('/api/wallpapers', (req, res) => {
    db.all("SELECT * FROM wallpapers ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Convert integer booleans back to true/false for the frontend
        const mapped = rows.map(r => ({ ...r, isNew: r.isNew === 1 }));
        res.json(mapped);
    });
});

app.post('/api/wallpapers', upload.single('image'), (req, res) => {
    const { title, cat, res: resolution } = req.body;
    let imgPath = req.file ? '/uploads/' + req.file.filename : 'https://picsum.photos/seed/up' + Date.now() + '/800/500';
    
    const stmt = db.prepare(`INSERT INTO wallpapers (title, cat, res, img, downloads, isNew) VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run(title, cat, resolution, imgPath, 0, 1, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.status(201).json({
            id: this.lastID,
            title,
            cat,
            res: resolution,
            img: imgPath,
            downloads: 0,
            isNew: true
        });
    });
    stmt.finalize();
});

app.post('/api/wallpapers/:id/download', (req, res) => {
    const id = req.params.id;
    db.run("UPDATE wallpapers SET downloads = downloads + 1 WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/wallpapers/:id', (req, res) => {
    const id = req.params.id;
    
    // First, find the image path to delete the file
    db.get("SELECT img FROM wallpapers WHERE id = ?", [id], (err, row) => {
        if (row && row.img.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, 'public', row.img);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        db.run("DELETE FROM wallpapers WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/categories', (req, res) => {
    const { name, icon } = req.body;
    const stmt = db.prepare(`INSERT INTO categories (name, icon) VALUES (?, ?)`);
    stmt.run(name.toLowerCase(), icon, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, name: name.toLowerCase(), icon });
    });
    stmt.finalize();
});

app.delete('/api/categories/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM categories WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`WallCraft Server is running on http://localhost:${PORT}`);
});

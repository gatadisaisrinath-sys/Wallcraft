require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dp4cf4qth',
    api_key: process.env.CLOUDINARY_API_KEY || '579543831855559',
    api_secret: process.env.CLOUDINARY_API_SECRET || '2wv2fd3W_neWo-ZLwYBS0IW_-h4'
});

// Setup Multer Storage with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'wallcraft_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// Connect to MongoDB
// URL encoding the password because it contains an '@' symbol (sai@0326 -> sai%400326)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://saisrinathgatadi:sai%400326@cluster0.q3efuiw.mongodb.net/wallcraft?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB database."))
    .catch(err => console.error("MongoDB connection error:", err));

// Define Mongoose Schemas
const wallpaperSchema = new mongoose.Schema({
    title: String,
    cat: String,
    res: String,
    img: String, // Cloudinary URL
    cloudinary_id: String, // Public ID for deletion
    downloads: { type: Number, default: 0 },
    isNewItem: { type: Boolean, default: true } // renamed from isNew as it conflicts with mongoose
});

const categorySchema = new mongoose.Schema({
    name: { type: String, unique: true },
    icon: String
});

const Wallpaper = mongoose.model('Wallpaper', wallpaperSchema);
const Category = mongoose.model('Category', categorySchema);

// Seed Data Function
async function seedData() {
    try {
        const catCount = await Category.countDocuments();
        if (catCount === 0) {
            console.log("Seeding default categories...");
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
            await Category.insertMany(defaultCats);
        }

        const wallCount = await Wallpaper.countDocuments();
        if (wallCount === 0) {
            console.log("Seeding default wallpapers...");
            const defaultWallpapers = [
                {title:"Misty Mountain Dawn",      cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/mist11/800/500",   downloads:2341, isNewItem:false},
                {title:"Golden Hour Forest",       cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/forest22/800/500", downloads:1876, isNewItem:true},
                {title:"Cherry Blossom Trail",     cat:"nature",       res:"2K",  img:"https://picsum.photos/seed/cherry33/800/500", downloads:3210, isNewItem:false},
                {title:"Autumn Maple Valley",      cat:"nature",       res:"4K",  img:"https://picsum.photos/seed/autumn44/800/500", downloads:987,  isNewItem:true},
                {title:"Waterfall Serenity",       cat:"nature",       res:"FHD", img:"https://picsum.photos/seed/wfall55/800/500",  downloads:4520, isNewItem:false},
                {title:"Milky Way Panorama",       cat:"space",        res:"4K",  img:"https://picsum.photos/seed/milky77/800/500",  downloads:6721, isNewItem:false},
                {title:"Nebula in Crimson",        cat:"space",        res:"4K",  img:"https://picsum.photos/seed/nebul88/800/500",  downloads:5432, isNewItem:true},
                {title:"Deep Space Portal",        cat:"space",        res:"FHD", img:"https://picsum.photos/seed/deepsp9/800/500",  downloads:3201, isNewItem:false},
                {title:"Tokyo Skyline Night",      cat:"architecture", res:"4K",  img:"https://picsum.photos/seed/toky11/800/500",   downloads:4100, isNewItem:false},
                {title:"Glass Tower Reflections",  cat:"architecture", res:"FHD", img:"https://picsum.photos/seed/glas13/800/500",   downloads:2780, isNewItem:true},
                {title:"Supercar Silhouette",      cat:"cars",         res:"4K",  img:"https://picsum.photos/seed/supe14/800/500",   downloads:5900, isNewItem:false},
                {title:"Liquid Chrome Flow",       cat:"abstract",     res:"4K",  img:"https://picsum.photos/seed/liqu16/800/500",   downloads:3100, isNewItem:false},
                {title:"Geometric Dimension",      cat:"abstract",     res:"2K",  img:"https://picsum.photos/seed/geom17/800/500",   downloads:2200, isNewItem:true},
                {title:"Lion King Portrait",       cat:"animals",      res:"4K",  img:"https://picsum.photos/seed/lion19/800/500",   downloads:7800, isNewItem:false},
                {title:"Eagle Soaring High",       cat:"animals",      res:"4K",  img:"https://picsum.photos/seed/eagl20/800/500",   downloads:3400, isNewItem:true},
                {title:"Tropical Reef Dream",      cat:"ocean",        res:"4K",  img:"https://picsum.photos/seed/reef22/800/500",   downloads:3600, isNewItem:false},
                {title:"Hyderabad Night Glow",     cat:"city",         res:"4K",  img:"https://picsum.photos/seed/hyd25/800/500",    downloads:4200, isNewItem:true},
                {title:"Mumbai Rain Streets",      cat:"city",         res:"4K",  img:"https://picsum.photos/seed/mumb26/800/500",   downloads:3800, isNewItem:false}
            ];
            await Wallpaper.insertMany(defaultWallpapers);
        }
    } catch (err) {
        console.error("Seeding error:", err);
    }
}
seedData();

// Map MongoDB _id to id for frontend compatibility
const mapId = (doc) => {
    const obj = doc.toObject();
    obj.id = obj._id;
    obj.isNew = obj.isNewItem;
    delete obj._id;
    delete obj.__v;
    delete obj.isNewItem;
    return obj;
};

// API Routes
app.get('/api/wallpapers', async (req, res) => {
    try {
        const wallpapers = await Wallpaper.find().sort({ _id: -1 });
        res.json(wallpapers.map(mapId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wallpapers', upload.single('image'), async (req, res) => {
    try {
        const { title, cat, res: resolution } = req.body;
        
        let imgUrl = 'https://picsum.photos/seed/up' + Date.now() + '/800/500';
        let cloudinaryId = null;
        
        if (req.file) {
            imgUrl = req.file.path;
            cloudinaryId = req.file.filename;
        }
        
        const newWallpaper = new Wallpaper({
            title,
            cat,
            res: resolution,
            img: imgUrl,
            cloudinary_id: cloudinaryId,
            downloads: 0,
            isNewItem: true
        });
        
        await newWallpaper.save();
        res.status(201).json(mapId(newWallpaper));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/wallpapers/:id/download-file', async (req, res) => {
    try {
        const wallpaper = await Wallpaper.findById(req.params.id);
        if (!wallpaper) return res.status(404).send('Wallpaper not found');
        
        // Increment download count
        await Wallpaper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } });
        
        // Fetch image directly from Cloudinary (or placeholder) into the backend
        const response = await fetch(wallpaper.img);
        if (!response.ok) throw new Error("Failed to fetch image from storage");
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Create safe filename
        const filename = wallpaper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.jpg';
        
        // Set headers to force the browser to download it as a file
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Length', buffer.length);
        
        // Send the file to the user
        res.send(buffer);
    } catch (err) {
        console.error("Download Error:", err);
        res.status(500).send('Error downloading file');
    }
});

app.delete('/api/wallpapers/:id', async (req, res) => {
    try {
        const wallpaper = await Wallpaper.findById(req.params.id);
        if (!wallpaper) return res.status(404).json({ error: "Wallpaper not found" });
        
        // Delete image from Cloudinary
        if (wallpaper.cloudinary_id) {
            await cloudinary.uploader.destroy(wallpaper.cloudinary_id);
        }
        
        await Wallpaper.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ _id: 1 });
        res.json(categories.map(mapId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, icon } = req.body;
        const newCat = new Category({ name: name.toLowerCase(), icon });
        await newCat.save();
        res.status(201).json(mapId(newCat));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`WallCraft Server is running on http://localhost:${PORT}`);
});

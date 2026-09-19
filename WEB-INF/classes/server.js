const express = require('express');
const session = require('express-session');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database (MySQL or JSON fallback)
db.init();

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    return UPLOAD_DIR;
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, getUploadDir());
    },
    filename: (req, file, cb) => {
        const safeName = path.basename(file.originalname);
        cb(null, safeName);
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'cloud_clipboard_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static assets
app.use(express.static(__dirname));

// Password Hashing Helper (SHA-256)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Routes

// Home Route
app.get('/', (req, res) => {
    res.redirect('/auth.html');
});

// Signup
app.post('/signup', async (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json') || req.headers['x-requested-with'] === 'XMLHttpRequest';
    const { email, password } = req.body;
    
    if (!email || !password) {
        if (isAjax) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
        }
        return res.redirect('/auth.html?error=invalid_credentials&tab=signup');
    }

    try {
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing && existing.length > 0) {
            if (isAjax) {
                return res.status(400).json({ success: false, message: 'Email is already registered! Please log in.' });
            }
            return res.redirect('/auth.html?error=email_exists&email=' + encodeURIComponent(email) + '&tab=signup');
        }

        const hashedPassword = hashPassword(password);
        await db.query('INSERT INTO users(email, password) VALUES (?, ?)', [email, hashedPassword]);
        
        if (isAjax) {
            return res.json({ success: true, message: '🎉 Account created successfully! You can now log in.' });
        }
        return res.redirect('/auth.html?signup=success&email=' + encodeURIComponent(email));
    } catch (err) {
        if (isAjax) {
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        return res.redirect('/auth.html?error=db_error&tab=signup');
    }
});

// Login
app.post('/login', async (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json') || req.headers['x-requested-with'] === 'XMLHttpRequest';
    const { email, password } = req.body;

    if (!email || !password) {
        if (isAjax) {
            return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
        }
        return res.redirect('/auth.html?error=invalid_credentials&email=' + encodeURIComponent(email || ''));
    }

    try {
        const hashedPassword = hashPassword(password);
        const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, hashedPassword]);

        if (rows && rows.length > 0) {
            req.session.email = email;
            if (isAjax) {
                return res.json({ success: true, message: 'Login successful! Redirecting...', redirect: '/index.html' });
            }
            return res.redirect('/index.html');
        } else {
            if (isAjax) {
                return res.status(401).json({ success: false, message: 'Invalid Email or Password. Please try again.' });
            }
            return res.redirect('/auth.html?error=invalid_password&email=' + encodeURIComponent(email));
        }
    } catch (err) {
        if (isAjax) {
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        return res.redirect('/auth.html?error=db_error&email=' + encodeURIComponent(email || ''));
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/auth.html?logout=1');
    });
});

// Clipboard POST (Save to Cloud)
app.post('/clipboard', async (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json');
    const content = req.body.text || req.body.content || '';

    if (!content || !content.trim()) {
        if (isAjax) {
            return res.status(400).json({ success: false, message: 'Clipboard content cannot be empty.' });
        }
        return res.status(400).send('Clipboard content cannot be empty.');
    }

    try {
        const [result] = await db.query('INSERT INTO clipboard(content) VALUES (?)', [content]);
        if (isAjax) {
            return res.json({ 
                success: true, 
                message: 'Saved to Cloud Successfully!', 
                id: result ? result.insertId : null,
                content 
            });
        }
        res.send('Saved Successfully');
    } catch (err) {
        if (isAjax) {
            return res.status(500).json({ success: false, message: err.message });
        }
        res.status(500).send(err.message);
    }
});

// Clipboard GET (Latest single item)
app.get('/clipboard', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clipboard ORDER BY id DESC LIMIT 1');
        if (rows && rows.length > 0) {
            res.send(rows[0].content || '');
        } else {
            res.send('');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Clipboard History GET (All saved clipboard snippets)
app.get('/clipboard-history', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clipboard ORDER BY id DESC');
        res.json(rows || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete specific Clipboard item by ID
app.post('/delete-clipboard', async (req, res) => {
    const id = req.body.id;
    if (!id) {
        return res.status(400).json({ success: false, message: 'Clipboard item ID is required.' });
    }

    try {
        const [result] = await db.query('DELETE FROM clipboard WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Clipboard item deleted successfully.', affectedRows: result?.affectedRows });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Clear all Clipboard history
app.post('/clear-clipboard', async (req, res) => {
    try {
        await db.query('DELETE FROM clipboard');
        return res.json({ success: true, message: 'All clipboard items cleared.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Helper to format file sizes
function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// File Upload (Supports Single or Multiple Files)
app.post('/upload', (req, res) => {
    const uploadHandler = upload.fields([
        { name: 'files', maxCount: 20 },
        { name: 'file', maxCount: 1 }
    ]);

    uploadHandler(req, res, (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        let uploadedList = [];
        if (req.files && req.files['files']) {
            uploadedList = req.files['files'];
        } else if (req.files && req.files['file']) {
            uploadedList = req.files['file'];
        } else if (req.file) {
            uploadedList = [req.file];
        }

        if (uploadedList.length === 0) {
            return res.status(400).json({ success: false, message: 'No file selected.' });
        }

        const latestFileName = uploadedList[uploadedList.length - 1].filename || uploadedList[uploadedList.length - 1].originalname;
        const latestFilePath = path.join(__dirname, 'latest.txt');
        try {
            fs.writeFileSync(latestFilePath, latestFileName);
        } catch (e) {}

        return res.json({
            success: true,
            message: `${uploadedList.length} file(s) uploaded successfully!`,
            count: uploadedList.length,
            files: uploadedList.map(f => f.filename || f.originalname)
        });
    });
});

// Get List of All Cloud Files (For multi-device sync)
app.get('/files', (req, res) => {
    try {
        const uploadDir = getUploadDir();
        if (!fs.existsSync(uploadDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(uploadDir);
        const fileList = files
            .filter(name => !name.startsWith('.') && name !== 'latest.txt' && name !== 'db.json')
            .map(name => {
                const filePath = path.join(uploadDir, name);
                let stats = { size: 0, mtime: new Date() };
                try {
                    stats = fs.statSync(filePath);
                } catch (e) {}

                return {
                    name,
                    size: stats.size,
                    formattedSize: formatBytes(stats.size),
                    updatedAt: stats.mtime
                };
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        res.json(fileList);
    } catch (err) {
        console.error('Error reading files:', err);
        res.status(500).json({ error: err.message });
    }
});

// File Download
app.get('/download', (req, res) => {
    let fileName = req.query.file;

    if (!fileName) {
        const latestFilePath = path.join(__dirname, 'latest.txt');
        if (fs.existsSync(latestFilePath)) {
            fileName = fs.readFileSync(latestFilePath, 'utf8').trim();
        }
    }

    if (!fileName) {
        return res.status(404).send('No file available for download');
    }

    const safeFileName = path.basename(fileName);
    const filePath = path.join(getUploadDir(), safeFileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File Not Found');
    }

    res.download(filePath, safeFileName);
});

// Delete File from Cloud
app.post('/delete-file', (req, res) => {
    const fileName = req.body.file;
    if (!fileName) {
        return res.status(400).json({ success: false, message: 'Filename required' });
    }

    const safeFileName = path.basename(fileName);
    const filePath = path.join(getUploadDir(), safeFileName);

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            return res.json({ success: true, message: 'File deleted successfully' });
        } catch (e) {
            return res.status(500).json({ success: false, message: e.message });
        }
    }
    return res.status(404).json({ success: false, message: 'File not found' });
});

// Forgot Password - Send OTP
app.post('/forgot', async (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json');
    const email = req.body.email;

    if (!email) {
        if (isAjax) return res.status(400).json({ success: false, message: 'Please provide an email address.' });
        return res.send("<script>alert('Please provide an email'); window.location='forgot.html';</script>");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = String(otp);
    req.session.email = email;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'muthulakshmi2002apk@gmail.com',
            pass: 'fnvppswbzvbdapix'
        }
    });

    try {
        await transporter.sendMail({
            from: 'muthulakshmi2002apk@gmail.com',
            to: email,
            subject: 'Cloud Clipboard OTP',
            text: `Your OTP is: ${otp}`
        });

        if (isAjax) {
            return res.json({ success: true, message: 'OTP sent to your email successfully!', redirect: 'otp.html' });
        }
        res.send("<script>alert('OTP Sent Successfully'); window.location='otp.html';</script>");
    } catch (err) {
        console.error('Mail send error:', err);
        // Fallback for development/testing if email fails
        if (isAjax) {
            return res.json({ success: true, message: `OTP Generated: ${otp} (Demo Mode)`, redirect: 'otp.html', otp: otp });
        }
        res.send(`<script>alert('OTP Generated: ${otp}'); window.location='otp.html';</script>`);
    }
});

// Verify OTP
app.post('/verifyOtp', (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json');
    const userOtp = req.body.otp;
    const realOtp = req.session.otp;

    if (userOtp && realOtp && String(userOtp).trim() === String(realOtp).trim()) {
        if (isAjax) {
            return res.json({ success: true, message: 'OTP verified successfully!', redirect: 'resetPassword.html' });
        }
        res.send("<script>alert('OTP Verified Successfully'); window.location='resetPassword.html';</script>");
    } else {
        if (isAjax) {
            return res.status(400).json({ success: false, message: 'Invalid or incorrect OTP. Please try again.' });
        }
        res.send("<script>alert('Invalid OTP'); window.location='otp.html';</script>");
    }
});

// Reset Password
app.post('/resetPassword', async (req, res) => {
    const isAjax = req.xhr || req.headers.accept?.includes('json') || req.is('json');
    const newPassword = req.body.newPassword;
    const email = req.session.email;

    if (!email) {
        if (isAjax) {
            return res.status(400).json({ success: false, message: 'Session expired. Please restart forgot password flow.', redirect: 'forgot.html' });
        }
        return res.send("<script>alert('Session expired. Please start over.'); window.location='forgot.html';</script>");
    }

    if (!newPassword) {
        if (isAjax) return res.status(400).json({ success: false, message: 'Please enter a new password.' });
        return res.send("<script>alert('Please enter a new password'); window.location='resetPassword.html';</script>");
    }

    try {
        const hashedPassword = hashPassword(newPassword);
        const [result] = await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

        if (result && result.affectedRows > 0) {
            if (isAjax) {
                return res.json({ success: true, message: 'Password updated successfully! You can now login.', redirect: 'auth.html' });
            }
            res.send("<script>alert('Password Updated Successfully'); window.location='auth.html';</script>");
        } else {
            if (isAjax) {
                return res.status(400).json({ success: false, message: 'User email not found. Please try again.', redirect: 'forgot.html' });
            }
            res.send("<script>alert('Invalid Email'); window.location='forgot.html';</script>");
        }
    } catch (err) {
        if (isAjax) {
            return res.status(500).json({ success: false, message: 'Database Error: ' + err.message });
        }
        res.status(500).send("Database Error: " + err.message);
    }
});


// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // ONLY start localtunnel when developing locally on your PC (never in Render cloud)
    if (!process.env.RENDER && process.env.NODE_ENV !== 'production') {
        try {
            const localtunnel = require('localtunnel');
            const tunnel = await localtunnel({ port: PORT });
            console.log(`\n==================================================`);
            console.log(`🌐 LIVE PUBLIC LOCAL TUNNEL: ${tunnel.url}`);
            console.log(`==================================================\n`);

            tunnel.on('close', () => {
                console.log('Live tunnel closed.');
            });
        } catch (err) {
            console.log('Local tunnel note: Expose publicly or use cloud URL.');
        }
    }
});

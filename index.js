const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

const app = express();

// Multer configuration for handling multiple file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Google Cloud Storage configuration
const storage = new Storage({
    projectId: 'snapin',
    keyFilename: process.env.GCS_KEYFILE || 'snapin-f6ff4f740c0e.json',
});

const bucket = storage.bucket('rd-wedding-photos-test');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Define the route for uploading multiple photos
app.post('/upload', upload.array('photos', 5), (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    // Upload each file to Google Cloud Storage
    const uploadPromises = files.map((file) => {
        const filename = `${Date.now()}_${file.originalname}`;
        const gcsFile = bucket.file(filename);
        const stream = gcsFile.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        return new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('finish', () => {
                resolve();
            });

            stream.end(file.buffer);
        });
    });

    // Wait for all uploads to complete
    Promise.all(uploadPromises)
        .then(() => {
            // Redirect to the main page with a success alert
            res.redirect('/?alert=success');
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error uploading files to Google Cloud Storage.');
        });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
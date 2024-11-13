const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const xlsx = require('xlsx');
const router = express.Router();
const phoneClients = {}; // Store client instances and statuses

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Set destination folder
    },
    filename: function (req, file, cb) {
        const { clientId } = req.query;
        cb(null, clientId + path.extname(file.originalname)); // Append clientId to filename
    }
});

const upload = multer({ storage: storage });

// Endpoint to upload a file
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }
        res.send(`File uploaded successfully: ${req.file.filename}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error uploading file.');
    }
});

// Function to create or get a client
const getClient = (clientId) => {
    if (!phoneClients[clientId]) {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId })
        });
 
        const qrCodePromise = new Promise((resolve, reject) => {
            client.on('qr', (qr) => {
                resolve(qr);
            });
        });
 
        client.on('ready', () => {
            console.log(`Client ${clientId} is ready!`);
            phoneClients[clientId].isOnline = true;
        });
 
        const userStates = {};
 
        client.on('message', async (message) => {
            const userId = message.from;
 
            if (!userStates[userId]) {
                if (message.body.toUpperCase() === 'YES') {
                    userStates[userId] = 'MENU_SENT';
                    await message.reply('Please choose an option:\n1. Location\n2. Fetch Data');
                }
            } else if (userStates[userId] === 'MENU_SENT') {
                if (message.body === '1') {
                    await message.reply('Here is your location.');
                    delete userStates[userId];
                } else if (message.body === '2') {
                    await message.reply('Please enter your mobile number:');
                    userStates[userId] = 'AWAITING_MOBILE';
                } else {
                    await message.reply('Invalid choice. Please choose an option:\n1. Location\n2. Fetch Data');
                }
            } else if (userStates[userId] === 'AWAITING_MOBILE') {
                userStates[userId] = {
                    state: 'AWAITING_BIRTHDATE',
                    mobile: message.body.trim()
                };
                await message.reply('Please enter your birthdate (YYYY-MM-DD):');
            } else if (userStates[userId].state === 'AWAITING_BIRTHDATE') {
                const mobile = userStates[userId].mobile;
                const birthdate = message.body.trim();
 
                try {
                    const results = fetchDataFromExcel(clientId, mobile, birthdate);
                    if (results.length > 1) {
                        const options = results.map((result, index) => `${index + 1}. ${result['Policy #']}`).join('\n');
                        userStates[userId] = {
                            state: 'AWAITING_SELECTION',
                            options: results
                        };
                        await message.reply(`Multiple entries found. Please select the policy number:\n${options}`);
                    } else if (results.length === 1) {
                        const formattedData = formatData(results[0]);
                        await message.reply(`Here is the data entry found:\n${formattedData}`);
                        delete userStates[userId];
                    } else {
                        await message.reply('No data found for the provided mobile number and birthdate.');
                        delete userStates[userId];
                    }
                } catch (error) {
                    await message.reply('An error occurred while fetching data. Please try again later.');
                    delete userStates[userId];
                }
            } else if (userStates[userId].state === 'AWAITING_SELECTION') {
                const selection = parseInt(message.body.trim()) - 1;
                if (selection >= 0 && selection < userStates[userId].options.length) {
                    const selectedData = userStates[userId].options[selection];
                    const formattedData = formatData(selectedData);
                    await message.reply(`Here is the selected policy data:\n${formattedData}`);
                } else {
                    await message.reply('Invalid selection. Please try again.');
                }
                delete userStates[userId];
            }
        });
 
        client.initialize();
        phoneClients[clientId] = { client, isOnline: false, qrCodePromise };
    }
    return phoneClients[clientId];
};
 
const fetchDataFromExcel = (clientId, mobile, birthdate) => {
    const filePath = path.join('uploads', `${clientId}.xlsx`);
    if (!fs.existsSync(filePath)) {
        throw new Error('Excel file not found');
    }
 
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
 
    return data.filter(row => row.MobileNumber === mobile && row.Birthdate === birthdate);
};
 
const formatData = (data) => {
    return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
};
// API endpoint to get QR code as data URL
router.get('/qr-code', async (req, res) => {
    const { clientId } = req.query; // Use query parameters to get clientId
    if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
    }

    const clientData = getClient(clientId);
    try {
        const qrCode = await clientData.qrCodePromise;
        qrcode.toDataURL(qrCode, (err, url) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to generate QR code' });
            }
            console.log("QR Code Generated");
            res.send({ qr_url: url });
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});
router.post('/logout', async (req, res) => {
    const { clientId } = req.query;
    if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
    }

    const clientData = phoneClients[clientId];
    const filePath = path.join(__dirname, 'uploads', `${clientId}.xlsx`);
    if (!clientData) {
        return res.status(404).json({ error: 'Client not found' });
    }

    try {
        // Log out and destroy the client
        await clientData.client.logout();
        console.log(`Client ${clientId} successfully logged out.`);

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Brief pause to ensure proper session termination
        await clientData.client.destroy();
        console.log(`Client ${clientId} destroyed.`);

        delete phoneClients[clientId]; // Remove the client from the phoneClients object

        // Delete the uploaded file associated with the client
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Failed to delete file for client ${clientId}:`, err);
                } else {
                    console.log(`File ${filePath} deleted successfully.`);
                }
            });
        } else {
            console.log(`File for client ${clientId} does not exist or was already deleted.`);
        }

        res.status(200).json({ message: 'Client logged out and file deleted successfully' });
    } catch (error) {
        console.error(`Failed to log out client ${clientId}:`, error);
        res.status(500).json({ error: 'Failed to log out client' });
    }
});



// Endpoint to check if the client is ready
router.get('/status', (req, res) => {
    const { clientId } = req.query;
    if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
    }

    const clientData = phoneClients[clientId];
    if (!clientData) {
        return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ isReady: clientData.isOnline });
});

module.exports = router;
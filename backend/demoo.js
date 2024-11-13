const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const xlsx = require('xlsx');
 
const app = express();
const PORT = 3001;
 
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
 
const phoneClients = {};
 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const { clientId } = req.query;
        cb(null, `${clientId}.xlsx`);
    }
});
 
const upload = multer({ storage: storage });
 
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded successfully: ${req.file.filename}`);
});
 
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
        phoneClients[clientId] = { client, isOnline: false,  qrCodePromise };
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
 
app.get('/api/qr-code', async (req, res) => {
    const { clientId } = req.query;
    if (!clientId) {
        return res.status(400).json({ error: 'clientId is required' });
    }
 
    try {
        const clientData = getClient(clientId);
        const qrUrl = await clientData.qrCodePromise;
        res.send({ qr_url: qrUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});
 
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode");
const xlsx = require("xlsx");
const router = express.Router();
const phoneClients = {}; // Store client instances and statuses

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Set destination folder
  },
  filename: function (req, file, cb) {
    const { clientId } = req.query;
    cb(null, clientId + path.extname(file.originalname)); // Append clientId to filename
  },
});

const upload = multer({ storage: storage });

// Endpoint to upload a file
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }
    res.send(`File uploaded successfully: ${req.file.filename}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading file.");
  }
});

// Function to create or get a client
const getClient = (clientId) => {
  if (!phoneClients[clientId]) {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId }),
    });

    const qrCodePromise = new Promise((resolve, reject) => {
      client.on("qr", (qr) => {
        resolve(qr);
      });
    });

    client.on("ready", () => {
      client.senders = {};
      phoneClients[clientId].isOnline = true;
    });

    client.on("message", async (message) => {
      const userMessage = message.body.trim().toLowerCase();

      const sid = message.from;

      if (!client.senders[sid]) client.senders[sid] = {};

      if (!client.senders[sid].step) {
        client.senders[sid].step = 0;
      }

      if (client.senders[sid].sessionId) {
        clearTimeout(client.senders[sid].sessionId);
        client.senders[sid].sessionId = null;
      }

      client.senders[sid].sessionId = setTimeout(async () => {
        client.senders[sid].step = 0;
        await message.reply("*Sorry!* \nBut your session has been expired.");
        clearTimeout(client.senders[sid].sessionId);
        client.senders[sid].sessionId = null;
      }, 2 * 60 * 1000);

      if (
        userMessage === "hi agent" &&
        client.senders[sid].step === 0 &&
        !client.senders[sid].blockId
      ) {
        await message.reply(
          "*Hi!* \nDo you want to proceed? \nReply with *Yes* to continue or *No* to exit."
        );
        client.senders[sid].step++;
      } else if (client.senders[sid].step === 1) {
        if (userMessage === "yes") {
          await message.reply(
            "*Great!* \nReply with *Your Mobile Number* to continue or *No* to exit."
          );
          client.senders[sid].step++;
          client.senders[sid].attempt = 3;
        } else if (userMessage === "no") {
          await message.reply(
            "*No worries!* \nContact us when you need the information."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].step = 0;
        } else {
          await message.reply("*Please send valid reply!*");
        }
      } else if (client.senders[sid].step === 2) {
        client.senders[sid].mobile = userMessage;
        const isExist = fetchDataFromExcel(
          clientId,
          client.senders[sid].mobile,
          null,
          null
        );
        if (/^\d{10}$/.test(userMessage) && isExist) {
          await message.reply(
            "*Finally!* \nReply with *Your Date Of Birth* to continue or *No* to exit or *Restart* to reset the process. \n\n*Note:* (DD/MM/YYYY)"
          );
          client.senders[sid].attempt = 3;
          client.senders[sid].step++;
        } else if (userMessage === "no") {
          await message.reply(
            "*No worries!* \nContact us when you need the information."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].step = 0;
        } else if (userMessage === "restart") {
          await message.reply(
            "*Great!* \nReply with *Your Mobile Number* to continue or *No* to exit."
          );
          client.senders[sid].step = 2;
          client.senders[sid].attempt = 3;
        } else if (client.senders[sid].attempt > 1) {
          client.senders[sid].attempt--;
          await message.reply(
            `*Invalid Mobile Number!* \n\n*Note:* Now you have only ${client.senders[sid].attempt} attempt left.`
          );
        } else {
          client.senders[sid].step = 0;
          await message.reply(
            "*Sorry!* \nBut you are now blocked for *2* minutes."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].blockId = setTimeout(async () => {
            await message.reply("*Congratulations!* \nYou are now unblocked.");
            clearTimeout(client.senders[sid].blockId);
            client.senders[sid].blockId = null;
          }, 2 * 60 * 1000);
        }
      } else if (client.senders[sid].step === 3) {
        client.senders[sid].dob = userMessage;
        client.senders[sid].policyList = fetchDataFromExcel(
          clientId,
          client.senders[sid].mobile,
          client.senders[sid].dob,
          null
        );
        if (
          /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(
            userMessage
          ) &&
          client.senders[sid].policyList.length > 0
        ) {
          const policyMessage = client.senders[sid].policyList
            .map((policy, index) => `(${index + 1}) ${policy}`) // Adding index + 1 for the number
            .join("\n");
          await message.reply(
            "*Associated Policies* : \n\n" +
              policyMessage +
              "\n\nChoose any policy by *Index* or send *Exit* to exit or *Restart* to reset the process."
          );
          client.senders[sid].step++;
        } else if (userMessage === "no") {
          await message.reply(
            "*No worries!* \nContact us when you need the information."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].step = 0;
        } else if (userMessage === "restart") {
          await message.reply(
            "*Great!* \nReply with *Your Mobile Number* to continue or *No* to exit."
          );
          client.senders[sid].step = 2;
          client.senders[sid].attempt = 3;
        } else if (client.senders[sid].attempt > 1) {
          client.senders[sid].attempt--;
          await message.reply(
            `*Invalid Date Of Birth!* \n\n*Note:* Now you have only ${client.senders[sid].attempt} attempt left.`
          );
        } else {
          client.senders[sid].step = 0;
          await message.reply(
            "*Sorry!* \nBut you are now blocked for *2* minutes."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].blockId = setTimeout(async () => {
            await message.reply("*Congratulations!* \nYou are now unblocked.");
            clearTimeout(client.senders[sid].blockId);
            client.senders[sid].blockId = null;
          }, 2 * 60 * 1000);
        }
      } else if (client.senders[sid].step === 4) {
        if (
          userMessage > 0 &&
          userMessage <= client.senders[sid].policyList.length
        ) {
          const policy = fetchDataFromExcel(
            clientId,
            client.senders[sid].mobile,
            client.senders[sid].dob,
            client.senders[sid].policyList[userMessage - 1]
          );
          const policyDetails = Object.entries(policy[0])
            .map(([key, value]) => `*${key}*: ${value}`)
            .join("\n");
          await message.reply(
            "*Policy Details* \n\n" +
              policyDetails +
              "\n\nReply with *Yes* to refetch information or *No* to exit or *Restart* to reset the process."
          );
          client.senders[sid].step++;
        } else if (userMessage === "exit") {
          await message.reply(
            "*No worries!* \nContact us when you need the information."
          );
          clearTimeout(client.senders[sid].sessionId);
          client.senders[sid].step = 0;
        } else if (userMessage === "restart") {
          await message.reply(
            "*Great!* \nReply with *Your Mobile Number* to continue or *No* to exit."
          );
          client.senders[sid].step = 2;
          client.senders[sid].attempt = 3;
        } else {
          await message.reply("*Please send valid reply!*");
        }
      } else if (client.senders[sid].step === 5) {
        if (userMessage === "yes") {
          const policyMessage = client.senders[sid].policyList
            .map((policy, index) => `(${index + 1}) ${policy}`) // Adding index + 1 for the number
            .join("\n");
          await message.reply(
            "*Associated Policies* : \n\n" +
              policyMessage +
              " \n\nChoose any policy by *Index* or send *Exit* to exit or *Restart* to reset the process."
          );
          client.senders[sid].step--;
        } else if (userMessage === "no") {
          await message.reply(
            "*No worries!* \nContact us when you need the information."
          );
          client.senders[sid].step = 0;
          clearTimeout(client.senders[sid].sessionId);
        } else if (userMessage === "restart") {
          await message.reply(
            "*Great!* \nReply with *Your Mobile Number* to continue or *No* to exit."
          );
          client.senders[sid].step = 2;
          client.senders[sid].attempt = 3;
        } else {
          await message.reply("*Please send valid reply!*");
        }
      } else {
        clearTimeout(client.senders[sid].sessionId);
        client.senders[sid].sessionId = null;
      }
    });
    client.initialize();
    phoneClients[clientId] = { client, isOnline: false, qrCodePromise };
  }

  return phoneClients[clientId];
};

const fetchDataFromExcel = (clientId, mobile, birthdate, policy) => {
  const filePath = path.join("uploads", `${clientId}.xlsx`);

  // Check if the Excel file exists
  if (!fs.existsSync(filePath)) {
    throw new Error("Excel file not found");
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  if (!birthdate) {
    // Check if the mobile number exists
    const exists = sheetData.some((record) => record.MobileNumber === mobile);
    return exists; // True if exists, false otherwise
  } else if (!policy) {
    // Return all policies for a given mobile and birthdate
    const policies = sheetData.filter(
      (record) =>
        record.MobileNumber === mobile && record.BirthDate === birthdate
    );
    console.log(policies);
    return policies.map((row) => row["Policy #"]);
  } else {
    // Fetch all data for a given policy, excluding the Address field
    const policyDetails = sheetData
      .filter((row) => row["Policy #"] === policy)
      .map((row) => {
        const { Address, SN, ...filteredRow } = row; // Exclude Address
        return filteredRow;
      });
    return policyDetails;
  }
};
// API endpoint to get QR code as data URL
router.get("/qr-code", async (req, res) => {
  const { clientId } = req.query; // Use query parameters to get clientId
  if (!clientId) {
    return res.status(400).json({ error: "clientId is required" });
  }

  const clientData = getClient(clientId);
  try {
    const qrCode = await clientData.qrCodePromise;
    qrcode.toDataURL(qrCode, (err, url) => {
      if (err) {
        return res.status(500).json({ error: "Failed to generate QR code" });
      }
      console.log("QR Code Generated");
      res.send({ qr_url: url });
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});
router.post("/logout", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ error: "clientId is required" });
  }

  const clientData = phoneClients[clientId];
  const filePath = path.join(__dirname, "uploads", `${clientId}.xlsx`);
  if (!clientData) {
    return res.status(404).json({ error: "Client not found" });
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
      console.log(
        `File for client ${clientId} does not exist or was already deleted.`
      );
    }

    res
      .status(200)
      .json({ message: "Client logged out and file deleted successfully" });
  } catch (error) {
    console.error(`Failed to log out client ${clientId}:`, error);
    res.status(500).json({ error: "Failed to log out client" });
  }
});

// Endpoint to check if the client is ready
router.get("/status", (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ error: "clientId is required" });
  }

  const clientData = phoneClients[clientId];
  if (!clientData) {
    return res.status(404).json({ error: "Client not found" });
  }

  res.json({ isReady: clientData.isOnline });
});

module.exports = router;

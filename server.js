const express = require('express');
const fetch = require('node-fetch'); // For making HTTP requests

const app = express();
const PORT = process.env.PORT || 3000; // Render will set the PORT environment variable

// Your Electron app's public URL via Cloudflare Tunnel
const ELECTRON_APP_TARGET_URL = 'https://electron.attendanceapp.work/attendance-response';

app.get('/', (req, res) => {
    res.send('Attendance Intermediary Service is running. Use the /respond endpoint.');
});

app.get('/respond', async (req, res) => {
    const { alertKey, employeeName, responseText, sender } = req.query;

    console.log('Received response via email link:');
    console.log('Alert Key:', alertKey);
    console.log('Employee Name:', employeeName);
    console.log('Response Text:', responseText);
    console.log('Sender (Email App User):', sender); // Optional: log who clicked

    if (!alertKey || !employeeName || !responseText) {
        console.error('Missing required query parameters.');
        return res.status(400).send('Error: Missing required query parameters (alertKey, employeeName, responseText).');
    }

    try {
        const payload = {
            alertKey: alertKey,
            employeeName: employeeName,
            responseText: responseText,
            // You can add more data if your Electron app expects it
        };

        console.log('Forwarding POST request to Electron app via Cloudflare Tunnel:', ELECTRON_APP_TARGET_URL);
        console.log('Payload:', JSON.stringify(payload));

        const fetchResponse = await fetch(ELECTRON_APP_TARGET_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });

        const responseData = await fetchResponse.text(); // Or .json() if your Electron app sends JSON back

        if (fetchResponse.ok) {
            console.log('Successfully forwarded response to Electron app. Status:', fetchResponse.status);
            console.log('Electron app response:', responseData);
            // You can customize this success page
            res.status(200).send(`
                <html>
                    <head><title>Response Submitted</title></head>
                    <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                        <h1>Thank You!</h1>
                        <p>Your response for <strong>${decodeURIComponent(employeeName)}</strong> (${responseText}) has been submitted.</p>
                        <p>You can now close this window.</p>
                    </body>
                </html>
            `);
        } else {
            console.error('Error forwarding response to Electron app. Status:', fetchResponse.status);
            console.error('Electron app error response:', responseData);
            res.status(500).send(`Error: Could not submit your response. The application reported an issue. Status: ${fetchResponse.status}. Details: ${responseData}`);
        }

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send(`Error: Could not process your request. ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Intermediary server listening on port ${PORT}`);
});
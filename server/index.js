const http = require('http');
const path = require('path');
const express = require('express');
const socketIo = require('socket.io');
const needle = require('needle'); // http request client
const { RSA_NO_PADDING } = require('constants');
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'));
});

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const rules = [{ value: 'trading' }];

// Get stream rules
const getRules = async () => {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    // console.log(response.body);
    return response.body;
};

// Set stream rules
const setRules = async () => {
    const data = {
        add: rules
    }
    
    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
};

// Delete stream rules
const deleteRules = async (rules) => {
    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map((rule) => rule.id);

    const data = {
        delete: {
            ids: ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
};


// Emit tweet stream
const streamTweets = (socket) => {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data);
            // console.log(json);
            socket.emit('tweet', json);
        } catch (error) {
            // leaving catch block empty will leave the connection open even if there are no tweets
        }
    })
}

io.on('connection', async () => {
    console.log('Client connected...');

    let currentRules;
    
    try {
        // Get all stream rules
        currentRules = await getRules();

        // Delete all stream rules
        deleteRules(currentRules);

        // Set rules based on array above
        await setRules();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    streamTweets(io);
});

// (async () => {
//     let currentRules;
    
//     try {
//         // Get all stream rules
//         currentRules = await getRules();

//         // Delete all stream rules
//         await deleteRules(currentRules);

//         // Set rules based on array above
//         await setRules();
//     } catch (error) {
//         console.error(error);
//         process.exit(1);
//     }

//     streamTweets();
// })();

// // Reconnecting on error
// const filteredStream = streamTweets(io)

// let timeout = 0
// filteredStream.on('timeout', () => {
//   // Reconnect on error
//   console.warn('A connection error occurred. Reconnecting…')
//   setTimeout(() => {
//     timeout++
//     streamTweets(io)
//   }, 2 ** timeout)
//   streamTweets(io)
// });

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
const needle = require('needle'); // http request client
const config = require('dotenv').config();
const TOKEN = process.env.TWITTER_BEARER_TOKEN;

const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const rules = [{ value: 'giveaway' }];

// Get stream rules
const getRules = async () => {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    console.log(response.body);
    return response.body;
};

const streamTweets = () => {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data);
            console.log(json);
        } catch (error) {
            // leaving catch block empty will leave the connection open even if there are no tweets
        }
    })
}

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
const deleteRules = async () => {
    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map((rule) => rule.id);

    const data = {
        delete: {
            ids: ids
        }
    }

    const response = await needle('put', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
};

(async () => {
    let currentRules;
    
    try {
        // Get all stream rules
        currentRules = await getRules();

        // Delete all stream rules
        await deleteRules(currentRules);

        // Set rules based on array above
        await setRules();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    streamTweets();
})();
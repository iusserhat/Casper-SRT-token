const {CEP18Client} = require('casper-cep18-js-client');
const {Keys, CLPublicKey} = require('casper-js-sdk');
const WebSocket = require('ws')

// Config
const NODE_URL = 'https://event-store-api-clarity-testnet.make.services/rpc';
const NETWORK_NAME = 'casper-test';
const CEP18_CONTRACT_PACKAGE_HASH = 'd56c63e2e46c3608c723b0997a996936ee2f7bd990e82df2ad6b77c25948da41';
const CEP18_CONTRACT_HASH = '4dca6b5ceb6262f29423fa2b527bb8b9ef2e5e137424c996c5843cd9188561e0';
const PAYMENT_CONTRACT_HASH = '699d9da5e99079bce8ccb86fd2ffad80cc2acda18a3a08d9117b3390e6975a37';
const CSPR_CLOUD_KEY = 'b062f588-d52a-4aaf-b93a-c74c2f8f31fa';
const CSPR_CLOUD_STREAMING_URL = 'wss://streaming.testnet.cspr.cloud';
const CSPR_CLOUD_REST_API_URL = 'https://api.testnet.cspr.cloud';

const owner = Keys.Ed25519.parseKeyFiles(
    `./keys/public_key.pem`,
    `./keys/secret_key.pem`
);
const cep18 = new CEP18Client(NODE_URL, NETWORK_NAME);
cep18.setContractHash(
    'hash-'+CEP18_CONTRACT_HASH
);

// WebSocket Client
const ws = new WebSocket(CSPR_CLOUD_STREAMING_URL + '/contract-events?contract_hash=' + PAYMENT_CONTRACT_HASH + '&includes=raw_data')
ws.on('open', function open() {
    ws.on('message', function message(data) {
        console.log(data);
        if(data==="Ping") {
            return;
        }
        try {
            let event = JSON.parse(data);
            let eventType = event.data.name;
            console.log(eventType + " Event Received...");
            if(eventType==="Payment") {
                let recipient = event.data.data.recipient;
                console.log("Recipient: " + recipient);
                console.log("CSPR Paid: " + Math.round(event.data.data.amount/1000000000) + " CSPR");

                // create a mint deploy to deliver the Rekt tokens
                const deploy = cep18.mint(
                    {
                        owner: CLPublicKey.fromHex(recipient),
                        amount: 50000000
                    },
                    450_000_000,
                    owner.publicKey,
                    NETWORK_NAME,
                    [owner]
                );
                deploy.send(NODE_URL);
                console.log("Tokens sent to recipient");
            }
        } catch (e) {
            console.log(e);
        }
    });
});

// API Server
const cors = require('cors');
const express = require('express')
const e = require("express");
const app = express()
const port = 3001
app.use(cors({ origin: 'http://localhost:3000' , methods: 'GET,PUT,POST,OPTIONS'}));


app.get('/token-activity', (req, res) => {

    const url =  CSPR_CLOUD_REST_API_URL +
        '/contract-packages/' +
        CEP18_CONTRACT_PACKAGE_HASH +
        '/ft-token-actions?includes=to_public_key';

    fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'authorization': CSPR_CLOUD_KEY
        },
    }).then(response => response.json())
    .then(data => {
        res.type('json');
        res.send(JSON.stringify(data));
    }).catch(error => {
        res.send(error);
    });
})

app.listen(port, () => {
    console.log(`REKT Server App listening on port ${port}`)
})
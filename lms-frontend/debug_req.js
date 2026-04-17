import axios from 'axios';

const test = async () => {
    try {
        console.log("Sending request...");
        const response = await axios.post('http://localhost:3002/generate-pdf', {
            url: "https://example.com",
            token: "dummy-token"
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("Response Status:", response.status);
        console.log("Response Headers:", response.headers);
        console.log("Success! PDF size:", response.data.length);
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Data:", e.response.data);
            console.error("Status:", e.response.status);
        }
    }
};

test();

// encode.js
const fs = require("fs");
const key = fs.readFileSync("./smart-deals-ecc3d-firebase-adminsdk-fbsvc-8260c7a5e3.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log(base64);
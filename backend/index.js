const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");

require('dotenv').config()

app.use(cors())

const pictureRoutes = require('./routes/pictureRoutes');
app.use('/api/pictures', pictureRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admins', adminRoutes);
const loginRoutes = require('./routes/loginRoutes');
app.use('/api', loginRoutes);

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (err) {
        console.log(err);
    }
}

dbConnection()

app.use(express.json());

app.listen(process.env.PORT, () => {
    console.log("Listening on: http://localhost:" + process.env.PORT);
});
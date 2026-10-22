const mongoose = require('mongoose')
const connectDB = async() => {
    try{
        await mongoose.connect("mongodb://bossken053_db_user:DhmDmbJ1dcTd8ZmJ@ac-oaibbnx-shard-00-00.l1ak5q6.mongodb.net:27017,ac-oaibbnx-shard-00-01.l1ak5q6.mongodb.net:27017,ac-oaibbnx-shard-00-02.l1ak5q6.mongodb.net:27017/?ssl=true&replicaSet=atlas-ean9fe-shard-0&authSource=admin&appName=Cluster0")
        console.log ("mongoose connected")
    }
    catch (error){
        console.error(error);
        // Process.exit(1);
    }
}

module.exports = connectDB

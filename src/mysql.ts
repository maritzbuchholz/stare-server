import mysql from 'mysql2';
import 'dotenv/config';

const pool = mysql.createPool({
    connectionLimit: 10,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    queueLimit: 0,
    user: process.env.DB_USER,
    waitForConnections: true,

    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    maxIdle: 10,
    idleTimeout: 60000,
});

const promisePool = pool.promise();

export default promisePool;
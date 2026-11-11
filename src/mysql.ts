import mysql from 'mysql2';
import 'dotenv/config';

const pool = mysql.createPool({
    connectionLimit: 10,
    database: process.env.DB_NAME,
    enableKeepAlive: true,
    host: process.env.DB_HOST,
    idleTimeout: 60000,
    keepAliveInitialDelay: 10000,
    maxIdle: 10,

    password: process.env.DB_PASSWORD,
    queueLimit: 0,
    user: process.env.DB_USER,
    waitForConnections: true,
});

const promisePool = pool.promise();

export default promisePool;
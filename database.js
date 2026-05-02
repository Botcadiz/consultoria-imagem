import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_base64 TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return dbInstance;
}

const { Client } = require("pg");

async function main() {
  // Postgres 연결
  const client = new Client({
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "1234",
    database: "mydb",
  });

  await client.connect();
  console.log("✅ DB Connected!");

  // users 조회
  const resUsers = await client.query("SELECT * FROM users");
  console.log("Users:", resUsers.rows);

  // posts 조회
  const resPosts = await client.query("SELECT * FROM posts");
  console.log("Posts:", resPosts.rows);

  await client.end();
}

main().catch(console.error);

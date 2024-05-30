const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error is ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//HOME API
app.get("/", (request, response) => {
  response.send("Hi Darling....!");
});

// REGISTER API 1
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);
  //   console.log(dbUser);

  if (dbUser === undefined) {
    if (password.length < 5) {
      // Scenario 2: Password length is less than 5 characters
      response.status(400);
      response.send("Password is too short");
    } else {
      // Scenario 3: Password length is greater than 5 characters
      const createUserQuery = `
        INSERT INTO
            user(
                username,
                name,
                password,
                gender,
                location
            )
            VALUES(
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );
        `;

      await db.run(createUserQuery);

      response.status(200);
      response.send("User created successfully");
    }
  } else {
    // Scenario 1: user already exists
    response.status(400);
    response.send("User already exists");
  }
});

//Login API 2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
        *
    FROM
        user
    WHERE
        username = '${username}';
    `;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    // Scenario 1: unregistered User
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      // Scenario 3: Valid Password
      response.status(200);
      response.send("Login success!");
    } else {
      // Scenario 2: Invalid Password
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// Change Password API 3
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUserQuery = `
  SELECT
    *
  FROM
    user
  WHERE
    username = '${username}';
  `;

  const dbUser = await db.get(selectUserQuery);

  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  const hashedChangePassword = await bcrypt.hash(newPassword, 10);

  if (isPasswordMatched) {
    if (newPassword.length < 5) {
      // Scenario 2: Password length is less than 5
      response.status(400);
      response.send("Password is too short");
    } else {
      // Scenario 3: Update the Password
      const updateNewPasswordQuery = `
        UPDATE user
        SET password = '${hashedChangePassword}';
        `;

      await db.run(updateNewPasswordQuery);

      response.status(200);
      response.send("Password updated");
    }
  } else {
    // Scenario 1: Password Entered is Invalid
    response.status(400);
    response.send("Invalid current password");
  }
});

module.exports = app;

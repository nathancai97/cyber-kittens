const express = require("express");
const app = express();
const { User, Kitten } = require("./db");
const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware
const authMiddleware = async (req, res, next) => {
  const auth = req.header("Authorization");
  if (!auth) {
    return res.status(401).send("Unauthorized");
  }
  const token = auth.split(" ")[1];
  if (!token) {
    return res.status(401).send("Invalid token");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
};

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id
app.get("/kittens/:id", authMiddleware, async (req, res, next) => {
  try {
    const kitten = await Kitten.findOne({
      where: { id: req.params.id },
      raw: true,
    });

    if (!kitten) {
      return res.status(404).send("Kitten not found");
    }

    if (kitten.ownerId !== req.user.id) {
      return res.status(401).send("Unauthorized");
    }

    res
      .status(200)
      .send({ name: kitten.name, age: kitten.age, color: kitten.color });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color
app.post("/kittens", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const kitten = await Kitten.create({
      name: req.body.name,
      age: req.body.age,
      color: req.body.color,
      ownerId: req.user.id,
    });

    res.status(201).send({
      name: kitten.name,
      age: kitten.age,
      color: kitten.color,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id
app.delete("/kittens/:id", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const kitten = await Kitten.findByPk(req.params.id);
    if (!kitten) {
      return res.status(404).send("Kitten not found");
    }

    if (kitten.ownerId !== req.user.id) {
      return res.status(401).send("Unauthorized");
    }

    await kitten.destroy();
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error("SERVER ERROR: ", error);
  if (res.statusCode < 400) res.status(500);
  res.send({ error: error.message, name: error.name, message: error.message });
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;

const express = require('express');
const { register, login } = require('../services/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    const { user, token } = await register(email, password, firstName, lastName);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { user, token } = await login(email, password);
    res.status(200).json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;

const multer = require('multer');
const Post = require('../models/Post');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

const uploadImage = async (req, res) => {
  try {
    const newPost = new Post({
      user: req.user.id,
      image: req.file.path,
      description: req.body.description,
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = { uploadImage, upload };

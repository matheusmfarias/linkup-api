const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  profilePicture: { type: String },
  photos: [
    {
      uri: String,
      likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      comments: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          comment: String,
          createdAt: { type: Date, default: Date.now }
        }
      ]
    }
  ],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('User', userSchema);

const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth'); // Middleware de autenticação

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    user.profilePicture = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Failed to upload profile picture' });
  }
});

router.get('/profile-picture', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ profilePicture: user.profilePicture });
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    res.status(500).json({ message: 'Failed to fetch profile picture' });
  }
});

router.delete('/remove-profile-picture', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const profilePicturePath = user.profilePicture;
    if (!profilePicturePath) {
      return res.status(400).json({ message: 'No profile picture to remove' });
    }

    // Remova a foto de perfil do sistema de arquivos
    const filePath = `.${profilePicturePath}`;
    await fs.unlink(filePath);

    // Remova a referência à foto de perfil no MongoDB
    user.profilePicture = null;
    await user.save();

    res.json({ message: 'Foto de perfil removida com sucesso' });
  } catch (error) {
    console.error('Error removing profile picture:', error);
    res.status(500).json({ message: 'Failed to remove profile picture' });
  }
});

router.post('/upload-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const photoPath = `/uploads/${req.file.filename}`;
    user.photos.push({ uri: photoPath });
    await user.save();
    res.json({ photo: photoPath });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
});

router.get('/photos/:userId?', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id; // Use o ID do usuário autenticado se nenhum ID for fornecido
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ photos: user.photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ message: 'Failed to fetch photos' });
  }
});


router.delete('/delete-photo', authenticateToken, async (req, res) => {
  let { photoUri } = req.body;

  // Remove the base URL part
  const baseUrl = 'http://192.168.118.163:3000';
  if (photoUri.startsWith(baseUrl)) {
    photoUri = photoUri.replace(baseUrl, '');
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const photoIndex = user.photos.findIndex(photo => photo.uri === photoUri);
    if (photoIndex === -1) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Get the photo path
    const photoPath = path.join(__dirname, '..', photoUri);

    // Remove the photo from the user's photos array
    user.photos.splice(photoIndex, 1);
    await user.save();

    // Remove the photo file from the uploads folder
    try {
      await fs.unlink(photoPath);
      res.json({ message: 'Photo deleted successfully' });
    } catch (err) {
      console.error('Error deleting photo file:', err);
      return res.status(500).json({ message: 'Failed to delete photo file' });
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ message: 'Failed to delete photo' });
  }
});


router.get('/search-users', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: 'No search query provided' });

    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

router.get('/user/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Novas rotas para seguir e deixar de seguir usuários

router.post('/follow', authenticateToken, async (req, res) => {
  try {
    const userIdToFollow = req.body.userId;
    const user = await User.findById(req.user.id);
    const userToFollow = await User.findById(userIdToFollow);

    if (!userToFollow) return res.status(404).json({ message: 'User to follow not found' });
    if (user.following.includes(userIdToFollow)) return res.status(400).json({ message: 'Already following this user' });

    user.following.push(userIdToFollow);
    userToFollow.followers.push(req.user.id);

    await user.save();
    await userToFollow.save();

    res.json({ message: 'Followed user successfully' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ message: 'Failed to follow user' });
  }
});

router.post('/unfollow', authenticateToken, async (req, res) => {
  try {
    const userIdToUnfollow = req.body.userId;
    const user = await User.findById(req.user.id);
    const userToUnfollow = await User.findById(userIdToUnfollow);

    if (!userToUnfollow) return res.status(404).json({ message: 'User to unfollow not found' });
    if (!user.following.includes(userIdToUnfollow)) return res.status(400).json({ message: 'Not following this user' });

    user.following.pull(userIdToUnfollow);
    userToUnfollow.followers.pull(req.user.id);

    await user.save();
    await userToUnfollow.save();

    res.json({ message: 'Unfollowed user successfully' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
});

router.get('/counters/:userId?', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const followingCount = user.following.length;
    const followersCount = user.followers.length;

    res.json({ following: followingCount, followers: followersCount });
  } catch (error) {
    console.error('Error fetching counters:', error);
    res.status(500).json({ message: 'Failed to fetch counters' });
  }
});

// Rota para curtir uma foto
router.post('/like-photo', authenticateToken, async (req, res) => {
  try {
    let { photoUri } = req.body;
    console.log('Photo URI:', photoUri); // Log para depuração

    // Remova o domínio e o protocolo da URI da foto
    const baseUrl = 'http://192.168.118.163:3000';
    if (photoUri.startsWith(baseUrl)) {
      photoUri = photoUri.replace(baseUrl, '');
    }
    console.log('Processed Photo URI:', photoUri); // Log para depuração

    const userPhotoOwner = await User.findOne({ 'photos.uri': photoUri });
    console.log('User Photo Owner:', userPhotoOwner); // Log para depuração

    if (!userPhotoOwner) {
      console.log('Photo not found in any user');
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photo = userPhotoOwner.photos.find(photo => photo.uri === photoUri);
    console.log('Found Photo:', photo); // Log para depuração

    if (!photo) {
      console.log('Photo URI not found in user photos');
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Verifique se o usuário já curtiu a foto
    if (photo.likes.includes(req.user.id)) {
      console.log('User already liked this photo');
      return res.status(400).json({ message: 'User already liked this photo' });
    }

    photo.likes.push(req.user.id);
    await userPhotoOwner.save();

    res.json({ message: 'Photo liked successfully' });
  } catch (error) {
    console.error('Error liking photo:', error);
    res.status(500).json({ message: 'Failed to like photo' });
  }
});


// Rota para descurtir uma foto
router.post('/unlike-photo', authenticateToken, async (req, res) => {
  try {
    let { photoUri } = req.body;
    console.log('Photo URI:', photoUri); // Log para depuração

    // Remova o domínio e o protocolo da URI da foto
    const baseUrl = 'http://192.168.118.163:3000';
    if (photoUri.startsWith(baseUrl)) {
      photoUri = photoUri.replace(baseUrl, '');
    }
    console.log('Processed Photo URI:', photoUri); // Log para depuração

    const userPhotoOwner = await User.findOne({ 'photos.uri': photoUri });
    console.log('User Photo Owner:', userPhotoOwner); // Log para depuração

    if (!userPhotoOwner) {
      console.log('Photo not found in any user');
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photo = userPhotoOwner.photos.find(photo => photo.uri === photoUri);
    console.log('Found Photo:', photo); // Log para depuração

    if (!photo) {
      console.log('Photo URI not found in user photos');
      return res.status(404).json({ message: 'Photo not found' });
    }

    // Verifique se o usuário já curtiu a foto
    const likeIndex = photo.likes.indexOf(req.user.id);
    if (likeIndex === -1) {
      console.log('User has not liked this photo');
      return res.status(400).json({ message: 'User has not liked this photo' });
    }

    photo.likes.splice(likeIndex, 1);
    await userPhotoOwner.save();

    res.json({ message: 'Photo unliked successfully' });
  } catch (error) {
    console.error('Error unliking photo:', error);
    res.status(500).json({ message: 'Failed to unlike photo' });
  }
});

// Rota para comentar em uma foto
router.post('/comment-photo', authenticateToken, async (req, res) => {
  let { photoUri, comment } = req.body;

  // Remove the base URL part
  const baseUrl = 'http://192.168.118.163:3000';
  if (photoUri.startsWith(baseUrl)) {
    photoUri = photoUri.replace(baseUrl, '');
  }

  try {
    const user = await User.findOne({ 'photos.uri': photoUri });
    if (!user) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photo = user.photos.find(photo => photo.uri === photoUri);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const newComment = {
      user: req.user._id,
      comment,
    };

    photo.comments.push(newComment);
    await user.save();

    res.json({
      user: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        profilePicture: req.user.profilePicture,
      },
      comment,
    });
  } catch (error) {
    console.error('Error commenting on photo:', error);
    res.status(500).json({ message: 'Failed to comment on photo' });
  }
});



// Rota para buscar curtidas e comentários de uma foto
router.get('/photo-details', authenticateToken, async (req, res) => {
  let { photoUri } = req.query;

  // Remove the base URL part
  const baseUrl = 'http://192.168.118.163:3000';
  if (photoUri.startsWith(baseUrl)) {
    photoUri = photoUri.replace(baseUrl, '');
  }

  console.log('Fetching details for photo URI:', photoUri);

  try {
    const user = await User.findOne({ 'photos.uri': photoUri }).populate('photos.comments.user', 'firstName lastName profilePicture');
    if (!user) {
      console.log('No user found with the given photo URI');
      return res.status(404).json({ message: 'Photo not found' });
    }

    const photo = user.photos.find(photo => photo.uri === photoUri);
    if (!photo) {
      console.log('No photo found with the given URI in user photos');
      return res.status(404).json({ message: 'Photo not found' });
    }

    console.log('Photo details:', photo);

    res.json({
      uri: photo.uri,
      likes: photo.likes || [],
      comments: photo.comments || [],
      isLikedByUser: photo.likes.includes(req.user.id)
    });
  } catch (error) {
    console.error('Error fetching photo details:', error);
    res.status(500).json({ message: 'Failed to fetch photo details' });
  }
});

router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const following = req.user.following;
    console.log('Fetching feed for user:', req.user._id);
    console.log('Following:', following);

    const users = await User.find({ _id: { $in: following } }).populate('photos.comments.user', 'firstName lastName profilePicture');
    console.log('Found users:', users);

    const feedPhotos = users.reduce((acc, user) => {
      const userPhotos = user.photos.map(photo => ({
        ...photo.toObject(),
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        },
      }));
      return acc.concat(userPhotos);
    }, []);

    console.log('Feed photos:', feedPhotos);

    res.json(feedPhotos);
  } catch (error) {
    console.error('Error fetching feed photos:', error);
    res.status(500).json({ message: 'Failed to fetch feed photos' });
  }
});



module.exports = router;

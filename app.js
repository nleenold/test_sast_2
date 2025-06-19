const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory data stores (not persistent)
let users = {}; // username: password (plaintext)
let posts = []; // {author, content}
let comments = {}; // postIndex: [{author, comment}]

// Session simulation (insecure, no cookies or sessions)
let currentUser = null;

// --- Register ---
app.get('/register', (req, res) => {
  res.send(`
    <h2>Register</h2>
    <form method="POST" action="/register">
      Username: <input name="username" /><br />
      Password: <input name="password" type="password" /><br />
      <button type="submit">Register</button>
    </form>
    <a href="/">Back to feed</a>
  `);
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  // No validation, duplicate overwrite
  users[username] = password;
  currentUser = username; // auto login after registration
  res.redirect('/');
});

// --- Login ---
app.get('/login', (req, res) => {
  res.send(`
    <h2>Login</h2>
    <form method="POST" action="/login">
      Username: <input name="username" /><br />
      Password: <input name="password" type="password" /><br />
      <button type="submit">Login</button>
    </form>
    <a href="/">Back to feed</a>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    currentUser = username; // no session or cookie management
    res.redirect('/');
  } else {
    res.send('Invalid credentials. <a href="/login">Try again</a>');
  }
});

// --- Logout ---
app.get('/logout', (req, res) => {
  currentUser = null;
  res.redirect('/');
});

// --- Create Post ---
app.get('/post', (req, res) => {
  if (!currentUser) return res.redirect('/login');
  res.send(`
    <h2>Create a Post</h2>
    <form method="POST" action="/post">
      Content: <textarea name="content"></textarea><br />
      <button type="submit">Post</button>
    </form>
    <a href="/">Back to feed</a>
  `);
});

app.post('/post', (req, res) => {
  if (!currentUser) return res.redirect('/login');
  const { content } = req.body;
  // No sanitization, XSS possible
  posts.push({ author: currentUser, content: content });
  res.redirect('/');
});

// --- View Feed ---
app.get('/', (req, res) => {
  let feedHtml = '<h1>Social Feed</h1>';

  if (currentUser) {
    feedHtml += `<p>Logged in as ${currentUser} | <a href="/logout">Logout</a></p>
    <a href="/post">Create Post</a>`;
  } else {
    feedHtml += `<a href="/login">Login</a> | <a href="/register">Register</a>`;
  }

  // Show posts in reverse order
  for (let i = posts.length - 1; i >= 0; i--) {
    const post = posts[i];
    feedHtml += `
      <div style="border:1px solid #ccc; padding:10px; margin-bottom:10px;">
        <p><b>${post.author}</b> says:</p>
        <p>${post.content}</p>
        <a href="/delete/${i}">Delete Post</a> <!-- No auth, anyone can delete -->
        <a href="/comments/${i}">Comments</a>
        <form method="POST" action="/comments/${i}">
          <input name="comment" placeholder="Add a comment" />
          <button type="submit">Comment</button>
        </form>
      </div>
    `;
  }

  res.send(feedHtml);
});

// --- Delete Post (no auth, IDOR) ---
app.get('/delete/:id', (req, res) => {
  const id = parseInt(req.params.id);
  // No auth check
  if (posts[id]) {
    delete posts[id];
    delete comments[id];
  }
  res.redirect('/');
});

// --- Comments ---
app.get('/comments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const postComments = comments[id] || [];
  let html = `<h2>Comments for Post ${id}</h2>`;
  postComments.forEach((c, index) => {
    html += `<p><b>${c.author}</b>: ${c.comment} <a href="/delete-comment/${id}/${index}">Delete</a></p>`;
  });
  html += `<a href="/">Back to feed</a>`;
  res.send(html);
});

app.post('/comments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const commentText = req.body.comment;
  if (!comments[id]) comments[id] = [];
  // No sanitization, XSS:
  comments[id].push({ author: currentUser, comment: commentText });
  res.redirect(`/comments/${id}`);
});

// --- Delete comment (no auth) ---
app.get('/delete-comment/:postId/:commentId', (req, res) => {
  const postId = parseInt(req.params.postId);
  const commentId = parseInt(req.params.commentId);
  if (comments[postId]) {
    comments[postId].splice(commentId, 1);
  }
  res.redirect(`/comments/${postId}`);
});

// --- Server ---
app.listen(3000, () => {
  console.log('Insecure social media app running on http://localhost:3000');
});

const fs = require('fs');
const path = require('path');
const Router = require('router');
const static = require('serve-static');
const directoryExists = require('directory-exists').sync;
const resolveModulePath = require(path.join(__dirname, '/lib/resolve_module_path'));
const isImage = require(path.join(__dirname, '/lib/is-image'));
const sharp = require('sharp');
const chokidar = require('chokidar');

//Path where pictures are stored
const photoPath = (process.argv[2] || '/home/pi/Pictures/pibooth'); 
const thumbsPath = path.join(photoPath, "thumbs");
const previewPath = path.join(photoPath, "preview");

var dynamicEl = [];
let clients = [];

function createThumb(file, dest, size) {
  if(!fs.existsSync(path.join(dest, file))){
    sharp(path.join(photoPath, file))
        .resize({ width: size })
        .toFile(path.join(dest, file));
  }
}

function addFileToGallery(file) {
  // Do whatever you want to do with the file
  if(isImage(file)) {
    createThumb(file, thumbsPath, 100);
    createThumb(file, previewPath, 800);
    console.log(file);
    dynamicEl.push({src:'preview/' + file, thumb:'thumbs/' + file, downloadUrl:'photos/' + file});
    clients.forEach(client => client.response.write(`data: ${JSON.stringify(dynamicEl)}\n\n`))
  }
}

/* Loads gallery files */
function galleryInitialLoad()
{
  if(!fs.existsSync(thumbsPath)){
    fs.mkdirSync(thumbsPath);        
  }
  if(!fs.existsSync(previewPath)){
    fs.mkdirSync(previewPath);        
  }
}

function galleryHandler(request, response, next) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no'
  };
  response.writeHead(200, headers);
  const data = `data: ${JSON.stringify(dynamicEl)}\n\n`;

  response.write(data);

  const clientId = Date.now();

  const newClient = {
    id: clientId,
    response
  };

  clients.push(newClient);

  request.on('close', () => {
    clients = clients.filter(client => client.id !== clientId);
    console.log(`${clientId} Connection closed ${clients.length} clients remaining`);
  });
}

console.log(`Using ${photoPath} as photo base-path`);

//Initializes gallery images
galleryInitialLoad();

var express = require('express');
var app = express();

app.use('/photos', static(photoPath));
app.use('/thumbs', static(path.join(photoPath, '/thumbs')));
app.use('/preview', static(path.join(photoPath,'/preview')));

app.use('/js/lg', static(resolveModulePath('lightgallery')));
app.use('/js', static(path.join(resolveModulePath('jquery'), '/dist')));
app.use('/js', static(path.join(resolveModulePath('picturefill'), '/dist')));
app.use('/', static(path.join(__dirname, '/html')));
app.use('/gallery', galleryHandler);

//Watch for new pictures
const watcher = chokidar.watch(photoPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  depth: 0
});
watcher.on('add', (file, stats) => {
  console.log(`New file : ${file}`);

  addFileToGallery(path.basename(file));
});

//Redirect all other URLs to index
app.all('*', (req, res) => {
  res.redirect(301, '/');
});

app.listen(3001);

